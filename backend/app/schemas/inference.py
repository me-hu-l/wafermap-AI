from typing import Annotated

from pydantic import BaseModel, Field, StrictInt, model_validator

WaferMapValue = Annotated[StrictInt, Field(ge=0, le=2)]
WaferMapRow = Annotated[
    list[WaferMapValue],
    Field(min_length=1, max_length=512),
]


class WaferMapPredictionRequest(BaseModel):
    wafer_map: list[WaferMapRow] = Field(min_length=1, max_length=512)

    @model_validator(mode="after")
    def wafer_map_must_be_square(self) -> "WaferMapPredictionRequest":
        width = len(self.wafer_map)
        if any(len(row) != width for row in self.wafer_map):
            raise ValueError("wafer_map must be a square matrix.")
        return self


class ClassProbability(BaseModel):
    class_name: str
    probability: float = Field(ge=0, le=1)


class WaferMapPredictionResponse(BaseModel):
    predicted_class: str
    confidence: float = Field(ge=0, le=1)
    class_probabilities: list[ClassProbability] = Field(
        min_length=9,
        max_length=9,
    )
