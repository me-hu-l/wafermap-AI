import asyncio

import httpx
from pydantic import ValidationError
import pytest

from app.main import app
from app.schemas.wafer import NotchOrientation, Point, WaferLayoutRequest
from app.services.geometry import (
    generate_valid_shots,
    is_shot_within_usable_area,
    rotate_point,
)

def test_shot_is_valid_when_all_corners_touch_or_lie_inside_circle() -> None:
    assert is_shot_within_usable_area(0, 0, 6, 8, 10)
    assert not is_shot_within_usable_area(0, 0, 6.01, 8, 10)


def test_center_offset_shifts_shot_origin_and_center() -> None:
    request = WaferLayoutRequest(
        wafer_diameter=100,
        edge_exclusion=0,
        shot_width=20,
        shot_height=20,
        center_offset_x=5,
        center_offset_y=-5,
    )

    shot = next(
        shot
        for shot in generate_valid_shots(request)
        if shot.shot_x == 0 and shot.shot_y == 0
    )

    assert (shot.origin_x, shot.origin_y) == (5, -5)
    assert (shot.center_x, shot.center_y) == (15, 5)


def test_edge_exclusion_removes_shots_that_only_fit_in_full_wafer() -> None:
    full_wafer = WaferLayoutRequest(
        wafer_diameter=100,
        edge_exclusion=0,
        shot_width=20,
        shot_height=20,
    )
    excluded_edge = full_wafer.model_copy(update={"edge_exclusion": 10})

    full_layout = generate_valid_shots(full_wafer)
    reduced_layout = generate_valid_shots(excluded_edge)

    assert len(reduced_layout) < len(full_layout)
    assert all(
        is_shot_within_usable_area(
            shot.origin_x,
            shot.origin_y,
            excluded_edge.shot_width,
            excluded_edge.shot_height,
            40,
        )
        for shot in reduced_layout
    )


def test_notch_orientations_rotate_points_about_wafer_origin() -> None:
    point = Point(x=12, y=-7)

    assert rotate_point(point, NotchOrientation.DOWN) == Point(x=12, y=-7)
    assert rotate_point(point, NotchOrientation.LEFT) == Point(x=-7, y=-12)
    assert rotate_point(point, NotchOrientation.UP) == Point(x=-12, y=7)
    assert rotate_point(point, NotchOrientation.RIGHT) == Point(x=7, y=12)


def test_non_finite_geometry_values_are_rejected() -> None:
    with pytest.raises(ValidationError):
        WaferLayoutRequest(
            wafer_diameter=float("inf"),
            edge_exclusion=0,
            shot_width=20,
            shot_height=20,
        )


def test_layout_api_returns_typed_shots_and_rejects_invalid_exclusion() -> None:
    async def make_requests() -> tuple[httpx.Response, httpx.Response]:
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(
            transport=transport,
            base_url="http://testserver",
        ) as client:
            response = await client.post(
                "/api/wafers/layout",
                json={
                    "wafer_diameter": 100,
                    "edge_exclusion": 0,
                    "shot_width": 20,
                    "shot_height": 20,
                    "notch_orientation": "LEFT",
                },
            )
            invalid_response = await client.post(
                "/api/wafers/layout",
                json={
                    "wafer_diameter": 100,
                    "edge_exclusion": 50,
                    "shot_width": 20,
                    "shot_height": 20,
                },
            )
        return response, invalid_response

    response, invalid_response = asyncio.run(make_requests())

    assert response.status_code == 200
    payload = response.json()
    assert payload["total_valid_shots"] == len(payload["shots"])
    assert payload["notch_orientation"] == "LEFT"
    assert {"shot_x", "shot_y", "origin_x", "origin_y", "corners"} <= payload[
        "shots"
    ][0].keys()

    assert invalid_response.status_code == 422
