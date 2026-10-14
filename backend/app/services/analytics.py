from app.schemas.analytics import (
    StackedDie,
    WaferAnalysisInput,
    WaferComparisonItem,
    WaferStackResponse,
)
from app.schemas.wafer import WaferLayoutResponse
from app.services.geometry import generate_valid_shots
from app.services.metrics import calculate_wafer_metrics


def compare_wafers(
    wafers: list[WaferAnalysisInput],
) -> list[WaferComparisonItem]:
    return [
        WaferComparisonItem(
            wafer_id=wafer.wafer_id,
            name=wafer.name,
            metrics=calculate_wafer_metrics(
                wafer.layout,
                wafer.failing_shots,
            ),
        )
        for wafer in wafers
    ]


def stack_wafers(
    wafers: list[WaferAnalysisInput],
) -> WaferStackResponse:
    if not wafers:
        raise ValueError("At least one wafer is required to create a stack.")

    reference_layout = wafers[0].layout
    if any(wafer.layout != reference_layout for wafer in wafers[1:]):
        raise ValueError(
            "All wafers must use identical geometry to stack common die coordinates."
        )

    for wafer in wafers:
        calculate_wafer_metrics(wafer.layout, wafer.failing_shots)

    valid_shots = generate_valid_shots(reference_layout)
    failing_by_wafer = [
        {(shot.shot_x, shot.shot_y) for shot in wafer.failing_shots}
        for wafer in wafers
    ]
    dies = [
        StackedDie(
            shot_x=shot.shot_x,
            shot_y=shot.shot_y,
            failing_wafers=sum(
                (shot.shot_x, shot.shot_y) in wafer_failures
                for wafer_failures in failing_by_wafer
            ),
            observed_wafers=len(wafers),
            failure_fraction=sum(
                (shot.shot_x, shot.shot_y) in wafer_failures
                for wafer_failures in failing_by_wafer
            )
            / len(wafers),
        )
        for shot in valid_shots
    ]

    return WaferStackResponse(
        total_wafers=len(wafers),
        layout=WaferLayoutResponse(
            **reference_layout.model_dump(),
            wafer_radius=reference_layout.wafer_diameter / 2,
            usable_radius=(
                reference_layout.wafer_diameter / 2
                - reference_layout.edge_exclusion
            ),
            total_valid_shots=len(valid_shots),
            shots=valid_shots,
        ),
        dies=dies,
    )
