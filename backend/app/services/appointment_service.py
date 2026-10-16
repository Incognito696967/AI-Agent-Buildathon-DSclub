import logging
from datetime import timedelta
from typing import List, Optional
from uuid import UUID
from fastapi import HTTPException, status
from supabase import Client
from app.schemas.appointment import (
    AppointmentCreate,
    AppointmentResponse,
    AppointmentCancelResponse,
    AppointmentStatus,
)
from app.services.patient_service import get_patient_by_id
from app.services.doctor_service import get_doctor_by_id

logger = logging.getLogger(__name__)

SLOT_DURATION_MINUTES = 30


def list_appointments(
    client: Client,
    doctor_id: Optional[UUID] = None,
    patient_id: Optional[UUID] = None,
    status_filter: Optional[str] = None,
    limit: int = 100,
) -> List[AppointmentResponse]:
    """Retrieves appointments, joining patient and doctor details where possible."""
    try:
        query = client.table("appointments").select(
            "*, patients(name), doctors(name, specialization)"
        ).order("scheduled_at", desc=False)

        if doctor_id:
            query = query.eq("doctor_id", str(doctor_id))
        if patient_id:
            query = query.eq("patient_id", str(patient_id))
        if status_filter:
            query = query.eq("status", status_filter)

        response = query.limit(limit).execute()
        results: List[AppointmentResponse] = []

        for row in response.data or []:
            patient_info = row.get("patients") or {}
            doctor_info = row.get("doctors") or {}

            results.append(
                AppointmentResponse(
                    id=row["id"],
                    patient_id=row["patient_id"],
                    doctor_id=row["doctor_id"],
                    scheduled_at=row["scheduled_at"],
                    end_at=row["end_at"],
                    status=row["status"],
                    priority=row["priority"],
                    reason=row.get("reason"),
                    created_at=row["created_at"],
                    patient_name=patient_info.get("name"),
                    doctor_name=doctor_info.get("name"),
                    specialization=doctor_info.get("specialization"),
                )
            )
        return results
    except Exception as exc:
        logger.warning(f"Joined query failed, falling back to base table query: {exc}")
        # Fallback to direct table select
        base_query = client.table("appointments").select("*").order("scheduled_at", desc=False)
        if doctor_id:
            base_query = base_query.eq("doctor_id", str(doctor_id))
        if patient_id:
            base_query = base_query.eq("patient_id", str(patient_id))
        if status_filter:
            base_query = base_query.eq("status", status_filter)

        response = base_query.limit(limit).execute()
        return [AppointmentResponse.model_validate(item) for item in (response.data or [])]


def create_appointment(client: Client, data: AppointmentCreate) -> AppointmentResponse:
    """Creates a new 30-minute appointment slot after validating patient, doctor, and availability.
    
    Guarantees conflict prevention via application pre-check and database-level exclusion constraint.
    """
    # 1. Verify patient exists
    patient = get_patient_by_id(client, data.patient_id)
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient with ID '{data.patient_id}' not found.",
        )

    # 2. Verify doctor exists
    doctor = get_doctor_by_id(client, data.doctor_id)
    if not doctor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Doctor with ID '{data.doctor_id}' not found.",
        )

    # 3. Check doctor availability
    if not doctor.is_available:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Doctor '{doctor.name}' is currently unavailable for bookings.",
        )

    # 4. Calculate fixed 30-minute slot end time
    start_time = data.scheduled_at
    end_time = start_time + timedelta(minutes=SLOT_DURATION_MINUTES)

    # 5. Application pre-check for slot conflict
    try:
        conflicts = (
            client.table("appointments")
            .select("id, scheduled_at, end_at")
            .eq("doctor_id", str(data.doctor_id))
            .eq("status", AppointmentStatus.SCHEDULED.value)
            .lt("scheduled_at", end_time.isoformat())
            .gt("end_at", start_time.isoformat())
            .limit(1)
            .execute()
        )
        if conflicts.data:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    f"Scheduling conflict: Doctor '{doctor.name}' already has a scheduled appointment "
                    f"overlapping with {start_time.isoformat()} - {end_time.isoformat()}."
                ),
            )
    except HTTPException:
        raise
    except Exception as exc:
        logger.debug(f"Pre-check query warning: {exc}")

    # 6. Database insert (enforces PostgreSQL exclusion constraint / trigger)
    payload = {
        "patient_id": str(data.patient_id),
        "doctor_id": str(data.doctor_id),
        "scheduled_at": start_time.isoformat(),
        "end_at": end_time.isoformat(),
        "status": AppointmentStatus.SCHEDULED.value,
        "priority": data.priority.value,
        "reason": data.reason,
    }

    try:
        response = client.table("appointments").insert(payload).execute()
        if not response.data:
            raise RuntimeError("Database returned empty response after appointment creation.")
        row = response.data[0]
        return AppointmentResponse(
            id=row["id"],
            patient_id=row["patient_id"],
            doctor_id=row["doctor_id"],
            scheduled_at=row["scheduled_at"],
            end_at=row["end_at"],
            status=row["status"],
            priority=row["priority"],
            reason=row.get("reason"),
            created_at=row["created_at"],
            patient_name=patient.name,
            doctor_name=doctor.name,
            specialization=doctor.specialization,
        )
    except Exception as exc:
        err_str = str(exc).lower()
        if (
            "conflict" in err_str
            or "overlapping" in err_str
            or "23p01" in err_str
            or "exclusion" in err_str
            or "unique" in err_str
            or "already booked" in err_str
        ):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Scheduling conflict: Doctor '{doctor.name}' already has an overlapping appointment slot.",
            )
        logger.error(f"Failed to create appointment: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error during appointment creation: {str(exc)}",
        )


def cancel_appointment(client: Client, appointment_id: UUID) -> AppointmentCancelResponse:
    """Cancels an appointment by updating its status to 'cancelled' without deleting the record."""
    # Check if appointment exists
    existing = client.table("appointments").select("id, status").eq("id", str(appointment_id)).execute()
    if not existing.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Appointment with ID '{appointment_id}' not found.",
        )

    current_status = existing.data[0]["status"]
    if current_status == AppointmentStatus.CANCELLED.value:
        return AppointmentCancelResponse(
            id=appointment_id,
            status=AppointmentStatus.CANCELLED,
            message="Appointment is already cancelled.",
        )

    update_res = (
        client.table("appointments")
        .update({"status": AppointmentStatus.CANCELLED.value})
        .eq("id", str(appointment_id))
        .execute()
    )

    if not update_res.data:
        raise RuntimeError("Failed to update appointment status to cancelled.")

    return AppointmentCancelResponse(
        id=appointment_id,
        status=AppointmentStatus.CANCELLED,
        message="Appointment cancelled successfully.",
    )
