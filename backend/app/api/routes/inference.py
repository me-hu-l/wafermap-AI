from fastapi import APIRouter, HTTPException

from app.ml.classifier import ModelUnavailableError
from app.schemas.inference import (
    WaferMapPredictionRequest,
    WaferMapPredictionResponse,
)
from app.services.inference import predict_wafer_map

router = APIRouter(prefix="/api/inference", tags=["inference"])


@router.post("/predict", response_model=WaferMapPredictionResponse)
def predict_wafer_pattern(
    request: WaferMapPredictionRequest,
) -> WaferMapPredictionResponse:
    try:
        return predict_wafer_map(request.wafer_map)
    except ModelUnavailableError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
