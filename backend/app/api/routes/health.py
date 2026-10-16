from datetime import datetime, timezone
from fastapi import APIRouter, Response, status
from pydantic import BaseModel
from app.core.config import get_settings
from app.db.supabase_client import check_database_connection

router = APIRouter(prefix="/health", tags=["Health"])


class AppHealthResponse(BaseModel):
    status: str
    service: str
    version: str
    environment: str
    timestamp: datetime


class DbHealthResponse(BaseModel):
    status: str
    database: str
    message: str
    timestamp: datetime


@router.get("", response_model=AppHealthResponse, summary="Application Liveness Health Check")
def check_app_health():
    """Application health probe.
    
    Does not require database connectivity to succeed, ensuring reliable liveness probes.
    """
    settings = get_settings()
    return AppHealthResponse(
        status="healthy",
        service=settings.PROJECT_NAME,
        version=settings.VERSION,
        environment=settings.ENVIRONMENT,
        timestamp=datetime.now(timezone.utc),
    )


@router.get("/db", response_model=DbHealthResponse, summary="Supabase Database Connectivity Check")
def check_db_health(response: Response):
    """Database readiness probe.
    
    Attempts a lightweight read against Supabase PostgreSQL to verify credentials and connectivity.
    """
    is_connected, message = check_database_connection()

    if not is_connected:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return DbHealthResponse(
            status="unhealthy",
            database="disconnected",
            message=message,
            timestamp=datetime.now(timezone.utc),
        )

    return DbHealthResponse(
        status="healthy",
        database="connected",
        message=message,
        timestamp=datetime.now(timezone.utc),
    )
