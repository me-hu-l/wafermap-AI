from enum import StrEnum

from pydantic import BaseModel, Field, model_validator


class NotchOrientation(StrEnum):
    DOWN = "DOWN"
    LEFT = "LEFT"
    UP = "UP"
    RIGHT = "RIGHT"


class WaferLayoutRequest(BaseModel):
    wafer_diameter: float = Field(gt=0, allow_inf_nan=False)
    edge_exclusion: float = Field(ge=0, allow_inf_nan=False)
    shot_width: float = Field(gt=0, allow_inf_nan=False)
    shot_height: float = Field(gt=0, allow_inf_nan=False)
    center_offset_x: float = Field(default=0, allow_inf_nan=False)
    center_offset_y: float = Field(default=0, allow_inf_nan=False)
    notch_orientation: NotchOrientation = NotchOrientation.DOWN

    @model_validator(mode="after")
    def edge_exclusion_must_leave_usable_area(self) -> "WaferLayoutRequest":
        if self.edge_exclusion >= self.wafer_diameter / 2:
            raise ValueError("edge_exclusion must be less than the wafer radius")
        return self


class Point(BaseModel):
    x: float
    y: float


class WaferShot(BaseModel):
    shot_x: int
    shot_y: int
    origin_x: float
    origin_y: float
    center_x: float
    center_y: float
    corners: list[Point] = Field(min_length=4, max_length=4)


class WaferLayoutResponse(BaseModel):
    wafer_diameter: float
    edge_exclusion: float
    shot_width: float
    shot_height: float
    center_offset_x: float
    center_offset_y: float
    notch_orientation: NotchOrientation
    wafer_radius: float
    usable_radius: float
    total_valid_shots: int
    shots: list[WaferShot]
