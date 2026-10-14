from fastapi import APIRouter, HTTPException

from app.schemas.analytics import (
    WaferAnalysisBatchRequest,
    WaferComparisonResponse,
    WaferStackBatchRequest,
    WaferStackResponse,
)
from app.schemas.metrics import WaferMetricsRequest, WaferMetricsResponse
from app.schemas.wafer import WaferLayoutRequest, WaferLayoutResponse
from app.services.analytics import compare_wafers, stack_wafers
from app.services.geometry import generate_valid_shots
from app.services.metrics import calculate_wafer_metrics

router = APIRouter(prefix="/api/wafers", tags=["wafers"])


@router.post("/layout", response_model=WaferLayoutResponse)
def create_wafer_layout(request: WaferLayoutRequest) -> WaferLayoutResponse:
    shots = generate_valid_shots(request)
    return WaferLayoutResponse(
        wafer_diameter=request.wafer_diameter,
        edge_exclusion=request.edge_exclusion,
        shot_width=request.shot_width,
        shot_height=request.shot_height,
        center_offset_x=request.center_offset_x,
        center_offset_y=request.center_offset_y,
        notch_orientation=request.notch_orientation,
        wafer_radius=request.wafer_diameter / 2,
        usable_radius=request.wafer_diameter / 2 - request.edge_exclusion,
        total_valid_shots=len(shots),
        shots=shots,
    )


@router.post("/metrics", response_model=WaferMetricsResponse)
def calculate_metrics(request: WaferMetricsRequest) -> WaferMetricsResponse:
    try:
        return calculate_wafer_metrics(request.layout, request.failing_shots)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error


@router.post("/compare", response_model=WaferComparisonResponse)
def compare_wafer_analyses(
    request: WaferAnalysisBatchRequest,
) -> WaferComparisonResponse:
    try:
        return WaferComparisonResponse(wafers=compare_wafers(request.wafers))
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error


@router.post("/stack", response_model=WaferStackResponse)
def stack_wafer_analyses(
    request: WaferStackBatchRequest,
) -> WaferStackResponse:
    try:
        return stack_wafers(request.wafers)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
