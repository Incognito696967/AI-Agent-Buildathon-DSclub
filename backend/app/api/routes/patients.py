from typing import List
from fastapi import APIRouter, Depends, Query, status
from supabase import Client
from app.db.supabase_client import get_supabase_client
from app.schemas.patient import PatientCreate, PatientResponse
from app.services import patient_service

router = APIRouter(prefix="/patients", tags=["Patients"])


@router.get("", response_model=List[PatientResponse], summary="List patients")
def list_patients(
    limit: int = Query(50, ge=1, le=200, description="Max records to return"),
    offset: int = Query(0, ge=0, description="Record offset"),
    client: Client = Depends(get_supabase_client),
):
    """Retrieve registered patients from Supabase."""
    return patient_service.list_patients(client=client, limit=limit, offset=offset)


@router.post(
    "",
    response_model=PatientResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new patient",
)
def create_patient(
    payload: PatientCreate,
    client: Client = Depends(get_supabase_client),
):
    """Register a new patient record."""
    return patient_service.create_patient(client=client, data=payload)
