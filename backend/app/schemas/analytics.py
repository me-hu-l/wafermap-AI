from pydantic import BaseModel, Field, model_validator

from app.schemas.metrics import ShotCoordinate, WaferMetricsResponse
from app.schemas.wafer import WaferLayoutRequest, WaferLayoutResponse


class WaferAnalysisInput(BaseModel):
    wafer_id: str = Field(min_length=1, max_length=100)
    name: str = Field(min_length=1, max_length=100)
    layout: WaferLayoutRequest
    failing_shots: list[ShotCoordinate] = Field(max_length=100_000)


class WaferAnalysisBatchRequest(BaseModel):
    wafers: list[WaferAnalysisInput] = Field(min_length=2, max_length=100)

    @model_validator(mode="after")
    def wafer_ids_must_be_unique(self) -> "WaferAnalysisBatchRequest":
        wafer_ids = [wafer.wafer_id for wafer in self.wafers]
        if len(wafer_ids) != len(set(wafer_ids)):
            raise ValueError("wafer_id values must be unique.")
        return self


class WaferStackBatchRequest(BaseModel):
    wafers: list[WaferAnalysisInput] = Field(min_length=1, max_length=100)

    @model_validator(mode="after")
    def wafer_ids_must_be_unique(self) -> "WaferStackBatchRequest":
        wafer_ids = [wafer.wafer_id for wafer in self.wafers]
        if len(wafer_ids) != len(set(wafer_ids)):
            raise ValueError("wafer_id values must be unique.")
        return self


class WaferComparisonItem(BaseModel):
    wafer_id: str
    name: str
    metrics: WaferMetricsResponse


class WaferComparisonResponse(BaseModel):
    wafers: list[WaferComparisonItem] = Field(min_length=2, max_length=100)


class StackedDie(BaseModel):
    shot_x: int
    shot_y: int
    failing_wafers: int = Field(ge=0)
    observed_wafers: int = Field(gt=0)
    failure_fraction: float = Field(ge=0, le=1, allow_inf_nan=False)


class WaferStackResponse(BaseModel):
    total_wafers: int = Field(ge=1, le=100)
    layout: WaferLayoutResponse
    dies: list[StackedDie]
