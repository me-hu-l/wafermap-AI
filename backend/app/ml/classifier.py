import os
import pickle
from functools import lru_cache
from pathlib import Path

import torch
from huggingface_hub import hf_hub_download
from huggingface_hub.errors import HfHubHTTPError, HFValidationError
from torch import nn

CLASS_NAMES = (
    "Center",
    "Donut",
    "Edge-Loc",
    "Edge-Ring",
    "Loc",
    "Near-full",
    "Random",
    "Scratch",
    "none",
)

DEFAULT_MODEL_PATH = (
    Path(__file__).resolve().parents[3]
    / "models"
    / "plain_cnn_classifier_v1.pth"
)


class CNN(nn.Module):
    """The notebook's three-channel classifier for 26x26 wafer maps."""

    def __init__(self, number_of_classes: int = len(CLASS_NAMES)) -> None:
        super().__init__()
        self.network = nn.Sequential(
            nn.Conv2d(3, 16, kernel_size=3, padding=1),
            nn.ReLU(),
            nn.Conv2d(16, 64, kernel_size=3, padding=1),
            nn.ReLU(),
            nn.Conv2d(64, 128, kernel_size=3, padding=1),
            nn.ReLU(),
            nn.Flatten(),
            nn.Linear(128 * 26 * 26, 512),
            nn.ReLU(),
            nn.Linear(512, 128),
            nn.ReLU(),
            nn.Linear(128, number_of_classes),
        )

    def forward(self, wafer_maps: torch.Tensor) -> torch.Tensor:
        return self.network(wafer_maps)

    def forward_with_activations(
        self, wafer_maps: torch.Tensor
    ) -> tuple[torch.Tensor, torch.Tensor]:
        """Return logits and the final convolution block activations."""
        activations = self.network[:6](wafer_maps)
        return self.network[6:](activations), activations


class ModelUnavailableError(RuntimeError):
    """Raised when the configured model checkpoint is missing or unusable."""


def configured_model_path() -> Path:
    repo_id = (os.getenv("REPO_ID") or "").strip()
    filename = (os.getenv("FILENAME") or "").strip()
    if not repo_id and not filename:
        return DEFAULT_MODEL_PATH
    if not repo_id or not filename:
        raise ModelUnavailableError(
            "Both REPO_ID and FILENAME must be set to download the model from Hugging Face."
        )

    try:
        checkpoint_path = hf_hub_download(repo_id=repo_id, filename=filename)
    except (HfHubHTTPError, HFValidationError, OSError) as error:
        raise ModelUnavailableError(
            f"Unable to download model file {filename!r} from Hugging Face "
            f"repository {repo_id!r}: {error}"
        ) from error
    return Path(checkpoint_path)


@lru_cache(maxsize=1)
def get_classifier() -> CNN:
    checkpoint_path = configured_model_path()
    if not checkpoint_path.is_file():
        raise ModelUnavailableError(f"Model checkpoint not found: {checkpoint_path}")

    classifier = CNN()
    try:
        state_dict = torch.load(
            checkpoint_path,
            map_location="cpu",
            weights_only=True,
        )
        if not isinstance(state_dict, dict):
            raise TypeError("Model checkpoint does not contain a state dict.")
        classifier.load_state_dict(state_dict)
    except (
        OSError,
        RuntimeError,
        EOFError,
        TypeError,
        KeyError,
        pickle.UnpicklingError,
    ) as error:
        raise ModelUnavailableError(
            f"Unable to load model checkpoint {checkpoint_path}: {error}"
        ) from error

    classifier.eval()
    return classifier
