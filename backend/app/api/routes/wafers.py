from fastapi import APIRouter

from app.schemas.wafer import WaferLayoutRequest, WaferLayoutResponse
from app.services.geometry import generate_valid_shots

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
