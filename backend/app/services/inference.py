import numpy as np
import torch
from skimage.transform import resize

from app.ml.classifier import CLASS_NAMES, get_classifier
from app.schemas.inference import (
    ClassProbability,
    WaferMapPredictionResponse,
)


def prepare_model_input(wafer_map: list[list[int]]) -> torch.Tensor:
    """Apply the notebook's categorical resize and three-channel encoding."""
    values = np.asarray(wafer_map)
    if values.ndim != 2 or values.shape[0] != values.shape[1] or values.size == 0:
        raise ValueError("wafer_map must be a non-empty square matrix.")
    if not np.isin(values, (0, 1, 2)).all():
        raise ValueError("wafer_map values must be 0, 1, or 2.")

    resized = resize(
        values,
        (26, 26),
        order=0,
        preserve_range=True,
    ).astype(np.uint8)
    one_hot = np.eye(3, dtype=np.float32)[resized]
    channels_first = np.ascontiguousarray(np.moveaxis(one_hot, -1, 0))
    return torch.from_numpy(channels_first).unsqueeze(0)


def predict_wafer_map(wafer_map: list[list[int]]) -> WaferMapPredictionResponse:
    model_input = prepare_model_input(wafer_map)
    classifier = get_classifier()

    with torch.inference_mode():
        logits = classifier(model_input)
        probabilities = torch.softmax(logits, dim=1)[0].tolist()

    predicted_index = max(range(len(probabilities)), key=probabilities.__getitem__)
    return WaferMapPredictionResponse(
        predicted_class=CLASS_NAMES[predicted_index],
        confidence=probabilities[predicted_index],
        class_probabilities=[
            ClassProbability(class_name=class_name, probability=probability)
            for class_name, probability in zip(CLASS_NAMES, probabilities)
        ],
    )
