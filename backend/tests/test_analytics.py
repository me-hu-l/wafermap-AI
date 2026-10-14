import asyncio

import httpx
import pytest

from app.main import app
from app.schemas.analytics import WaferAnalysisInput
from app.schemas.metrics import ShotCoordinate
from app.schemas.wafer import WaferLayoutRequest
from app.services.analytics import compare_wafers, stack_wafers
from app.services.geometry import generate_valid_shots


def small_layout() -> WaferLayoutRequest:
    return WaferLayoutRequest(
        wafer_diameter=40,
        edge_exclusion=0,
        shot_width=10,
        shot_height=10,
    )


def make_wafers() -> list[WaferAnalysisInput]:
    layout = small_layout()
    valid_shots = generate_valid_shots(layout)
    common_failure = ShotCoordinate(
        shot_x=valid_shots[0].shot_x,
        shot_y=valid_shots[0].shot_y,
    )
    second_failure = ShotCoordinate(
        shot_x=valid_shots[1].shot_x,
        shot_y=valid_shots[1].shot_y,
    )
    return [
        WaferAnalysisInput(
            wafer_id="wafer-1",
            name="Lot A",
            layout=layout,
            failing_shots=[common_failure],
        ),
        WaferAnalysisInput(
            wafer_id="wafer-2",
            name="Lot B",
            layout=layout,
            failing_shots=[common_failure, second_failure],
        ),
    ]


def test_compare_wafers_returns_individual_metric_analysis() -> None:
    comparison = compare_wafers(make_wafers())

    assert [item.name for item in comparison] == ["Lot A", "Lot B"]
    assert comparison[0].metrics.failing_dies == 1
    assert comparison[1].metrics.failing_dies == 2
    assert comparison[0].metrics.yield_fraction > comparison[1].metrics.yield_fraction
    assert comparison[0].metrics.d0_per_cm2 < comparison[1].metrics.d0_per_cm2


def test_stack_counts_failure_frequency_by_common_die_coordinate() -> None:
    wafers = make_wafers()

    result = stack_wafers(wafers)
    common_failure = wafers[0].failing_shots[0]
    second_failure = wafers[1].failing_shots[1]
    by_coordinate = {
        (die.shot_x, die.shot_y): die
        for die in result.dies
    }

    common_die = by_coordinate[(common_failure.shot_x, common_failure.shot_y)]
    second_die = by_coordinate[(second_failure.shot_x, second_failure.shot_y)]
    passing_die = next(die for die in result.dies if die.failing_wafers == 0)
    assert result.total_wafers == 2
    assert len(result.dies) == result.layout.total_valid_shots
    assert common_die.failing_wafers == 2
    assert common_die.observed_wafers == 2
    assert common_die.failure_fraction == 1
    assert second_die.failing_wafers == 1
    assert second_die.failure_fraction == 0.5
    assert passing_die.failure_fraction == 0


def test_stack_supports_a_single_wafer_layout_group() -> None:
    wafer = make_wafers()[0]

    result = stack_wafers([wafer])
    failures = {
        (coordinate.shot_x, coordinate.shot_y)
        for coordinate in wafer.failing_shots
    }

    assert result.total_wafers == 1
    assert all(
        die.failure_fraction
        == (1.0 if (die.shot_x, die.shot_y) in failures else 0.0)
        for die in result.dies
    )


def test_stack_rejects_incompatible_layouts_and_invalid_selections() -> None:
    wafers = make_wafers()
    wafers[1] = wafers[1].model_copy(
        update={"layout": wafers[1].layout.model_copy(update={"shot_width": 12})}
    )

    with pytest.raises(ValueError, match="identical geometry"):
        stack_wafers(wafers)

    wafers = make_wafers()
    wafers[1] = wafers[1].model_copy(
        update={"failing_shots": [ShotCoordinate(shot_x=99, shot_y=99)]}
    )
    with pytest.raises(ValueError, match="valid layout"):
        stack_wafers(wafers)


def test_compare_and_stack_api_endpoints() -> None:
    wafers = [
        {
            "wafer_id": wafer.wafer_id,
            "name": wafer.name,
            "layout": wafer.layout.model_dump(),
            "failing_shots": [
                coordinate.model_dump() for coordinate in wafer.failing_shots
            ],
        }
        for wafer in make_wafers()
    ]

    async def make_requests() -> tuple[httpx.Response, httpx.Response]:
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(
            transport=transport,
            base_url="http://testserver",
        ) as client:
            comparison = await client.post(
                "/api/wafers/compare",
                json={"wafers": wafers},
            )
            stack = await client.post(
                "/api/wafers/stack",
                json={"wafers": wafers},
            )
        return comparison, stack

    comparison, stack = asyncio.run(make_requests())

    assert comparison.status_code == 200
    assert len(comparison.json()["wafers"]) == 2
    assert stack.status_code == 200
    assert stack.json()["total_wafers"] == 2
    assert len(stack.json()["dies"]) == stack.json()["layout"]["total_valid_shots"]


def test_stack_api_accepts_a_single_wafer_for_unique_layout_group() -> None:
    wafer = make_wafers()[0]

    async def make_request() -> httpx.Response:
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(
            transport=transport,
            base_url="http://testserver",
        ) as client:
            return await client.post(
                "/api/wafers/stack",
                json={
                    "wafers": [
                        {
                            "wafer_id": wafer.wafer_id,
                            "name": wafer.name,
                            "layout": wafer.layout.model_dump(),
                            "failing_shots": [
                                coordinate.model_dump()
                                for coordinate in wafer.failing_shots
                            ],
                        }
                    ]
                },
            )

    response = asyncio.run(make_request())

    assert response.status_code == 200
    assert response.json()["total_wafers"] == 1
