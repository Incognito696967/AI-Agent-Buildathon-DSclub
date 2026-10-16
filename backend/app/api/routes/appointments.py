from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, Query, status
from supabase import Client
from app.db.supabase_client import get_supabase_client
from app.schemas.appointment import (
    AppointmentCreate,
    AppointmentResponse,
    AppointmentCancelResponse,
)
from app.schemas.triage import AutoScheduleRequest, AutoScheduleResponse
from app.services import appointment_service

router = APIRouter(prefix="/appointments", tags=["Appointments"])


@router.get("", response_model=List[AppointmentResponse], summary="List appointments")
def list_appointments(
    doctor_id: Optional[UUID] = Query(None, description="Filter by doctor ID"),
    patient_id: Optional[UUID] = Query(None, description="Filter by patient ID"),
    status: Optional[str] = Query(None, description="Filter by status (scheduled, cancelled, completed)"),
    limit: int = Query(100, ge=1, le=500, description="Max appointments to return"),
    client: Client = Depends(get_supabase_client),
):
    """List medical appointments with optional filters for doctor, patient, or status."""
    return appointment_service.list_appointments(
        client=client,
        doctor_id=doctor_id,
        patient_id=patient_id,
        status_filter=status,
        limit=limit,
    )


@router.post(
    "",
    response_model=AppointmentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Schedule a new appointment",
)
def create_appointment(
    payload: AppointmentCreate,
    client: Client = Depends(get_supabase_client),
):
    """Book a new 30-minute appointment slot.
    
    Validates patient existence, doctor availability, and prevents conflicting doctor bookings.
    """
    return appointment_service.create_appointment(client=client, data=payload)


@router.post(
    "/auto-schedule",
    response_model=AutoScheduleResponse,
    status_code=status.HTTP_201_CREATED,
    summary="AI-powered automatic doctor appointment scheduling",
    description="Analyzes patient requirements using AI, matches specialist, and reserves the optimal slot.",
)
def auto_schedule_appointment(
    payload: AutoScheduleRequest,
    client: Client = Depends(get_supabase_client),
):
    """Automatic AI appointment scheduling endpoint under /appointments."""
    from app.services import ai_triage_service
    return ai_triage_service.auto_schedule(client=client, request=payload)



@router.patch(
    "/{appointment_id}/cancel",
    response_model=AppointmentCancelResponse,
    summary="Cancel an appointment",
)
def cancel_appointment(
    appointment_id: UUID,
    client: Client = Depends(get_supabase_client),
):
    """Mark an existing appointment as cancelled without deleting the record."""
    return appointment_service.cancel_appointment(client=client, appointment_id=appointment_id)
