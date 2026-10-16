import logging
from typing import Optional, Tuple
from supabase import create_client, Client
from app.core.config import get_settings

logger = logging.getLogger(__name__)


class SupabaseConfigurationError(RuntimeError):
    """Raised when Supabase URL or secret key are missing."""
    pass


_supabase_client: Optional[Client] = None


def init_supabase_client() -> Optional[Client]:
    """Initializes and returns the singleton Supabase client if configured."""
    global _supabase_client
    settings = get_settings()

    if not settings.is_supabase_configured:
        logger.warning(
            "Supabase credentials not configured. SUPABASE_URL and SUPABASE_SECRET_KEY "
            "must be provided in the environment or backend/.env."
        )
        return None

    try:
        _supabase_client = create_client(
            supabase_url=settings.SUPABASE_URL,
            supabase_key=settings.resolved_supabase_key,
        )
        logger.info("Supabase client initialized successfully.")
        return _supabase_client
    except Exception as e:
        logger.error(f"Failed to initialize Supabase client: {str(e)}")
        raise


def get_supabase_client() -> Client:
    """Returns the reusable Supabase client, initializing on demand.
    
    Raises SupabaseConfigurationError if required credentials are missing.
    """
    global _supabase_client
    if _supabase_client is not None:
        return _supabase_client

    client = init_supabase_client()
    if client is None:
        raise SupabaseConfigurationError(
            "Supabase is not configured. Please set SUPABASE_URL and SUPABASE_SECRET_KEY "
            "(or SUPABASE_SERVICE_ROLE_KEY) in backend/.env."
        )
    return client


def set_supabase_client(client: Optional[Client]) -> None:
    """Explicitly sets or mocks the Supabase client (primarily for unit tests)."""
    global _supabase_client
    _supabase_client = client


def check_database_connection() -> Tuple[bool, str]:
    """Tests connectivity to Supabase PostgreSQL without throwing unhandled exceptions.
    
    Returns (is_connected: bool, message: str).
    """
    settings = get_settings()
    if not settings.is_supabase_configured:
        return False, "Database credentials (SUPABASE_URL and SUPABASE_SECRET_KEY) are not configured."

    try:
        client = get_supabase_client()
        # Perform lightweight check against doctors table
        response = client.table("doctors").select("id", count="exact").limit(1).execute()
        return True, "Successfully connected to Supabase PostgreSQL."
    except SupabaseConfigurationError as sce:
        return False, str(sce)
    except Exception as exc:
        return False, f"Database connection error: {str(exc)}"
