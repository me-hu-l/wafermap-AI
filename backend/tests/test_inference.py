import asyncio

import httpx
import pytest
import torch
from torch import nn

from app.main import app
from app.ml.classifier import CLASS_NAMES, ModelUnavailableError
from app.services import inference


def test_prepare_model_input_resizes_categories_and_one_hot_encodes() -> None:
    wafer_map = [[0, 1], [2, 1]]

    model_input = inference.prepare_model_input(wafer_map)

    assert model_input.shape == (1, 3, 26, 26)
    assert model_input.dtype == torch.float32
    assert torch.all(model_input.sum(dim=1) == 1)
    assert set(torch.unique(model_input).tolist()) == {0.0, 1.0}
    assert model_input[0, 0, 0, 0] == 1
    assert model_input[0, 1, -1, -1] == 1


def test_prepare_model_input_rejects_invalid_categories() -> None:
    with pytest.raises(ValueError, match="values must be 0, 1, or 2"):
        inference.prepare_model_input([[0, 3], [1, 2]])


class FixedLogitClassifier(nn.Module):
    def forward(self, wafer_maps: torch.Tensor) -> torch.Tensor:
        assert wafer_maps.shape == (1, 3, 26, 26)
        return torch.tensor([[0.0, 0.0, 0.0, 4.0, 0.0, 0.0, 0.0, 0.0, 0.0]])


def test_prediction_api_returns_probability_for_every_notebook_class(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(inference, "get_classifier", FixedLogitClassifier)

    async def make_request() -> httpx.Response:
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(
            transport=transport,
            base_url="http://testserver",
        ) as client:
            return await client.post(
                "/api/inference/predict",
                json={"wafer_map": [[1, 2], [0, 1]]},
            )

    response = asyncio.run(make_request())

    assert response.status_code == 200
    payload = response.json()
    assert payload["predicted_class"] == "Edge-Ring"
    assert payload["confidence"] == pytest.approx(
        payload["class_probabilities"][3]["probability"]
    )
    assert [item["class_name"] for item in payload["class_probabilities"]] == list(
        CLASS_NAMES
    )
    assert sum(
        item["probability"] for item in payload["class_probabilities"]
    ) == pytest.approx(1)


def test_prediction_api_surfaces_missing_model_as_service_unavailable(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def missing_model() -> nn.Module:
        raise ModelUnavailableError("Model checkpoint not found.")

    monkeypatch.setattr(inference, "get_classifier", missing_model)

    async def make_request() -> httpx.Response:
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(
            transport=transport,
            base_url="http://testserver",
        ) as client:
            return await client.post(
                "/api/inference/predict",
                json={"wafer_map": [[1]]},
            )

    response = asyncio.run(make_request())

    assert response.status_code == 503
    assert response.json()["detail"] == "Model checkpoint not found."


@pytest.mark.parametrize(
    "wafer_map",
    (
        [[0, 1], [2]],
        [[0, 3], [1, 2]],
        [[True]],
    ),
)
def test_prediction_api_rejects_invalid_map_shapes_and_values(
    wafer_map: list[list[int]],
) -> None:
    async def make_request() -> httpx.Response:
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(
            transport=transport,
            base_url="http://testserver",
        ) as client:
            return await client.post(
                "/api/inference/predict",
                json={"wafer_map": wafer_map},
            )

    response = asyncio.run(make_request())

    assert response.status_code == 422
