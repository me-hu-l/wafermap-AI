from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.inference import router as inference_router
from app.api.routes.wafers import router as wafers_router
from app.ml.classifier import get_classifier
from app.schemas.health import HealthResponse


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncGenerator[None, None]:
    get_classifier()
    yield


app = FastAPI(
    title="WaferMap AI API",
    version="0.1.0",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)
app.include_router(wafers_router)
app.include_router(inference_router)


@app.get("/api/health", response_model=HealthResponse)
def health_check() -> HealthResponse:
    return HealthResponse(status="ok")
