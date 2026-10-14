from pydantic import BaseModel, Field

from app.schemas.wafer import WaferLayoutRequest


class ShotCoordinate(BaseModel):
    shot_x: int
    shot_y: int


class WaferMetricsRequest(BaseModel):
    layout: WaferLayoutRequest
    failing_shots: list[ShotCoordinate] = Field(default_factory=list)


class WaferMetricsResponse(BaseModel):
    total_valid_dies: int = Field(ge=1)
    failing_dies: int = Field(ge=0)
    passing_dies: int = Field(ge=0)
    yield_fraction: float = Field(ge=0, le=1, allow_inf_nan=False)
    die_area_cm2: float = Field(gt=0, allow_inf_nan=False)
    d0_per_cm2: float | None = Field(default=None, ge=0, allow_inf_nan=False)
