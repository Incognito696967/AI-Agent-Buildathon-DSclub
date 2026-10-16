from typing import List, Optional
from uuid import UUID
from supabase import Client
from app.schemas.patient import PatientCreate, PatientResponse


def list_patients(client: Client, limit: int = 100, offset: int = 0) -> List[PatientResponse]:
    """Retrieves a paginated list of patients ordered by registration date."""
    response = (
        client.table("patients")
        .select("*")
        .order("created_at", desc=True)
        .range(offset, offset + limit - 1)
        .execute()
    )
    return [PatientResponse.model_validate(p) for p in (response.data or [])]


def get_patient_by_id(client: Client, patient_id: UUID) -> Optional[PatientResponse]:
    """Retrieves a patient record by ID."""
    response = client.table("patients").select("*").eq("id", str(patient_id)).execute()
    if response.data:
        return PatientResponse.model_validate(response.data[0])
    return None


def create_patient(client: Client, data: PatientCreate) -> PatientResponse:
    """Inserts a new patient into Supabase."""
    payload = data.model_dump()
    response = client.table("patients").insert(payload).execute()
    if not response.data:
        raise RuntimeError("Failed to insert patient record into database.")
    return PatientResponse.model_validate(response.data[0])
