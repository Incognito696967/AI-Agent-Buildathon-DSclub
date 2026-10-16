import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.core.config import get_settings
from app.db.supabase_client import init_supabase_client, SupabaseConfigurationError
from app.api.routes import api_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
)
logger = logging.getLogger("medical_coordination")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager to initialize resources safely."""
    settings = get_settings()
    logger.info(f"Starting {settings.PROJECT_NAME} v{settings.VERSION} [{settings.ENVIRONMENT}]")

    # Initialize Supabase client if credentials are configured
    if settings.is_supabase_configured:
        try:
            init_supabase_client()
            logger.info("Supabase database connection initialized.")
        except Exception as e:
            logger.warning(f"Supabase connection test failed at startup: {e}")
    else:
        logger.warning(
            "SUPABASE_URL and SUPABASE_SECRET_KEY are not configured. "
            "Database endpoints will return 503 until backend/.env is populated."
        )

    yield

    logger.info("Application shutting down.")


settings = get_settings()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description=(
        "FastAPI backend for Intelligent Medical Appointment Coordination. "
        "Coordinates patient appointments, doctor availability, urgency prioritization, "
        "and conflict-free time slots using Supabase PostgreSQL."
    ),
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

# CORS Middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Router under /api/v1
app.include_router(api_router, prefix=settings.API_V1_PREFIX)


# Global Exception Handlers
@app.exception_handler(SupabaseConfigurationError)
async def supabase_config_exception_handler(request: Request, exc: SupabaseConfigurationError):
    """Handles missing Supabase configuration gracefully without exposing secrets."""
    logger.error(f"Supabase configuration error: {str(exc)}")
    return JSONResponse(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        content={
            "error": "Database Service Unavailable",
            "detail": str(exc),
            "hint": "Please configure SUPABASE_URL and SUPABASE_SECRET_KEY in backend/.env",
        },
    )


@app.get("/", tags=["Root"])
def root_info():
    """Root info endpoint providing service status and documentation links."""
    return {
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "docs_url": "/docs",
        "api_v1": settings.API_V1_PREFIX,
        "health_check": f"{settings.API_V1_PREFIX}/health",
        "database_health": f"{settings.API_V1_PREFIX}/health/db",
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
