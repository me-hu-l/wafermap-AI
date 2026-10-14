import math

from app.schemas.metrics import (
    ShotCoordinate,
    WaferMetricsResponse,
)
from app.schemas.wafer import WaferLayoutRequest
from app.services.geometry import generate_valid_shots

MICROMETERS_PER_CENTIMETER = 10_000


def calculate_wafer_metrics(
    layout: WaferLayoutRequest,
    failing_shots: list[ShotCoordinate],
) -> WaferMetricsResponse:
    valid_shots = generate_valid_shots(layout)
    if not valid_shots:
        raise ValueError("The layout contains no valid dies.")

    selected_coordinates = [(shot.shot_x, shot.shot_y) for shot in failing_shots]
    if len(selected_coordinates) != len(set(selected_coordinates)):
        raise ValueError("failing_shots cannot contain duplicate coordinates.")

    valid_coordinates = {(shot.shot_x, shot.shot_y) for shot in valid_shots}
    invalid_coordinates = set(selected_coordinates) - valid_coordinates
    if invalid_coordinates:
        raise ValueError("Every failing die must belong to the valid layout.")

    total_valid_dies = len(valid_shots)
    failing_dies = len(selected_coordinates)
    passing_dies = total_valid_dies - failing_dies
    yield_fraction = passing_dies / total_valid_dies
    die_area_cm2 = (
        layout.shot_width
        * layout.shot_height
        / MICROMETERS_PER_CENTIMETER**2
    )
    if yield_fraction == 1:
        d0_per_cm2 = 0.0
    elif yield_fraction > 0:
        d0_per_cm2 = -math.log(yield_fraction) / die_area_cm2
    else:
        d0_per_cm2 = None

    return WaferMetricsResponse(
        total_valid_dies=total_valid_dies,
        failing_dies=failing_dies,
        passing_dies=passing_dies,
        yield_fraction=yield_fraction,
        die_area_cm2=die_area_cm2,
        d0_per_cm2=d0_per_cm2,
    )
