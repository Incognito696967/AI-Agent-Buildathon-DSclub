from typing import List
from fastapi import APIRouter, Depends, Query, status
from supabase import Client
from app.db.supabase_client import get_supabase_client
from app.schemas.doctor import DoctorCreate, DoctorResponse
from app.services import doctor_service

router = APIRouter(prefix="/doctors", tags=["Doctors"])


@router.get("", response_model=List[DoctorResponse], summary="List doctors")
def list_doctors(
    available_only: bool = Query(False, description="Filter only currently available doctors"),
    limit: int = Query(50, ge=1, le=200, description="Max doctors to return"),
    client: Client = Depends(get_supabase_client),
):
    """Retrieve hospital doctors from Supabase."""
    return doctor_service.list_doctors(client=client, available_only=available_only, limit=limit)


@router.post(
    "",
    response_model=DoctorResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add a new doctor",
)
def create_doctor(
    payload: DoctorCreate,
    client: Client = Depends(get_supabase_client),
):
    """Add a new doctor to the coordination roster."""
    return doctor_service.create_doctor(client=client, data=payload)
