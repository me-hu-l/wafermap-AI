from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.wafers import router as wafers_router
from app.schemas.health import HealthResponse

app = FastAPI(title="WaferMap AI API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)
app.include_router(wafers_router)


@app.get("/api/health", response_model=HealthResponse)
def health_check() -> HealthResponse:
    return HealthResponse(status="ok")
