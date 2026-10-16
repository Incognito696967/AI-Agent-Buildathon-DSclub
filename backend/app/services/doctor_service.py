from typing import List, Optional
from uuid import UUID
from supabase import Client
from app.schemas.doctor import DoctorCreate, DoctorResponse


def list_doctors(client: Client, available_only: bool = False, limit: int = 100) -> List[DoctorResponse]:
    """Retrieves doctors from Supabase, optionally filtered by availability."""
    query = client.table("doctors").select("*").order("name")
    if available_only:
        query = query.eq("is_available", True)
    response = query.limit(limit).execute()
    return [DoctorResponse.model_validate(d) for d in (response.data or [])]


def get_doctor_by_id(client: Client, doctor_id: UUID) -> Optional[DoctorResponse]:
    """Retrieves a single doctor record by ID."""
    response = client.table("doctors").select("*").eq("id", str(doctor_id)).execute()
    if response.data:
        return DoctorResponse.model_validate(response.data[0])
    return None


def create_doctor(client: Client, data: DoctorCreate) -> DoctorResponse:
    """Inserts a new doctor record into Supabase."""
    payload = data.model_dump()
    response = client.table("doctors").insert(payload).execute()
    if not response.data:
        raise RuntimeError("Failed to insert doctor record into database.")
    return DoctorResponse.model_validate(response.data[0])
