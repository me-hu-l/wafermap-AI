import asyncio
import math

import httpx
import pytest

from app.main import app
from app.schemas.metrics import ShotCoordinate
from app.schemas.wafer import WaferLayoutRequest
from app.services.geometry import generate_valid_shots
from app.services.metrics import calculate_wafer_metrics


def small_layout() -> WaferLayoutRequest:
    return WaferLayoutRequest(
        wafer_diameter=40,
        edge_exclusion=0,
        shot_width=10,
        shot_height=10,
    )


def test_yield_and_d0_use_valid_layout_and_shot_area() -> None:
    layout = small_layout()
    valid_shots = generate_valid_shots(layout)
    failing_shots = [
        ShotCoordinate(
            shot_x=valid_shots[0].shot_x,
            shot_y=valid_shots[0].shot_y,
        )
    ]

    metrics = calculate_wafer_metrics(layout, failing_shots)

    assert metrics.total_valid_dies == len(valid_shots)
    assert metrics.failing_dies == 1
    assert metrics.passing_dies == len(valid_shots) - 1
    assert metrics.yield_fraction == pytest.approx(
        (len(valid_shots) - 1) / len(valid_shots)
    )
    assert metrics.die_area_cm2 == pytest.approx(0.000001)
    assert metrics.d0_per_cm2 == pytest.approx(
        -math.log(metrics.yield_fraction) / 0.000001
    )


def test_perfect_yield_has_zero_defect_density() -> None:
    metrics = calculate_wafer_metrics(small_layout(), [])

    assert metrics.yield_fraction == 1
    assert metrics.d0_per_cm2 == 0
    assert math.copysign(1, metrics.d0_per_cm2) == 1


def test_zero_yield_reports_unbounded_density_as_null() -> None:
    layout = small_layout()
    failing_shots = [
        ShotCoordinate(shot_x=shot.shot_x, shot_y=shot.shot_y)
        for shot in generate_valid_shots(layout)
    ]

    metrics = calculate_wafer_metrics(layout, failing_shots)

    assert metrics.yield_fraction == 0
    assert metrics.d0_per_cm2 is None


def test_metrics_reject_nonexistent_and_duplicate_failing_dies() -> None:
    layout = small_layout()

    with pytest.raises(ValueError, match="valid layout"):
        calculate_wafer_metrics(layout, [ShotCoordinate(shot_x=99, shot_y=99)])

    valid_shot = generate_valid_shots(layout)[0]
    duplicate_selection = [
        ShotCoordinate(shot_x=valid_shot.shot_x, shot_y=valid_shot.shot_y),
        ShotCoordinate(shot_x=valid_shot.shot_x, shot_y=valid_shot.shot_y),
    ]
    with pytest.raises(ValueError, match="duplicate"):
        calculate_wafer_metrics(layout, duplicate_selection)


def test_metrics_api_returns_domain_error_for_invalid_failure_coordinate() -> None:
    async def make_request() -> httpx.Response:
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(
            transport=transport,
            base_url="http://testserver",
        ) as client:
            return await client.post(
                "/api/wafers/metrics",
                json={
                    "layout": {
                        "wafer_diameter": 40,
                        "edge_exclusion": 0,
                        "shot_width": 10,
                        "shot_height": 10,
                    },
                    "failing_shots": [{"shot_x": 99, "shot_y": 99}],
                },
            )

    response = asyncio.run(make_request())

    assert response.status_code == 422
    assert response.json()["detail"] == "Every failing die must belong to the valid layout."


def test_metrics_api_returns_yield_and_density_for_selected_coordinates() -> None:
    async def make_request() -> httpx.Response:
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(
            transport=transport,
            base_url="http://testserver",
        ) as client:
            return await client.post(
                "/api/wafers/metrics",
                json={
                    "layout": {
                        "wafer_diameter": 40,
                        "edge_exclusion": 0,
                        "shot_width": 10,
                        "shot_height": 10,
                    },
                    "failing_shots": [],
                },
            )

    response = asyncio.run(make_request())

    assert response.status_code == 200
    payload = response.json()
    assert payload["total_valid_dies"] > 0
    assert payload["failing_dies"] == 0
    assert payload["passing_dies"] == payload["total_valid_dies"]
    assert payload["yield_fraction"] == 1
    assert payload["d0_per_cm2"] == 0
