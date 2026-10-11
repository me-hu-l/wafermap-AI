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

    with torch.enable_grad():
        logits, activations = classifier.forward_with_activations(model_input)
        predicted_index = int(logits[0].argmax().item())
        gradients = torch.autograd.grad(
            outputs=logits[0, predicted_index],
            inputs=activations,
            retain_graph=False,
            create_graph=False,
        )[0]
        channel_weights = gradients.mean(dim=(2, 3), keepdim=True)
        heatmap = torch.relu((channel_weights * activations).sum(dim=1))[0]
        maximum = heatmap.max()
        if maximum.item() > 0:
            heatmap = heatmap / maximum

    heatmap_array = resize(
        heatmap.detach().cpu().numpy(),
        (len(wafer_map), len(wafer_map)),
        order=1,
        preserve_range=True,
        anti_aliasing=False,
    )
    heatmap_maximum = float(heatmap_array.max())
    if heatmap_maximum > 0:
        heatmap_array = heatmap_array / heatmap_maximum

    with torch.inference_mode():
        probabilities = torch.softmax(logits, dim=1)[0].tolist()

    return WaferMapPredictionResponse(
        predicted_class=CLASS_NAMES[predicted_index],
        confidence=probabilities[predicted_index],
        class_probabilities=[
            ClassProbability(class_name=class_name, probability=probability)
            for class_name, probability in zip(CLASS_NAMES, probabilities)
        ],
        gradcam_heatmap=heatmap_array.tolist(),
    )
