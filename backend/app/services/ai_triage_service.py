"""AI Triage Service — Dev 3 deliverable.

Uses Google Gemini (gemini-2.0-flash) to interpret free-text patient symptoms,
classify urgency, recommend a medical specialization, match available doctors,
and suggest up to three optimal appointment slots.
"""
import json
import logging
import os
from datetime import datetime, timedelta, timezone
from typing import List
from uuid import UUID

from fastapi import HTTPException, status
from supabase import Client

from app.schemas.doctor import DoctorResponse
from app.schemas.triage import (
    TriageRecommendation,
    TriageRequest,
    AutoScheduleRequest,
    AutoScheduleResponse,
)
from app.schemas.appointment import (
    AppointmentCreate,
    AppointmentPriority,
    AppointmentResponse,
)
from app.services.doctor_service import list_doctors, get_doctor_by_id
from app.services.patient_service import get_patient_by_id
from app.services.appointment_service import create_appointment


logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Supported specializations the LLM must pick from
# ---------------------------------------------------------------------------
VALID_SPECIALIZATIONS = [
    "Cardiology",
    "Neurology",
    "Orthopedics",
    "General",
    "Dermatology",
    "Pediatrics",
    "Psychiatry",
    "Gastroenterology",
    "Pulmonology",
    "Ophthalmology",
]

# ---------------------------------------------------------------------------
# Slot generation helpers
# ---------------------------------------------------------------------------
SLOT_DURATION_MINUTES = 30
WORKING_HOUR_START = 9   # 09:00
WORKING_HOUR_END = 17    # 17:00 (last slot starts at 16:30)


def _generate_candidate_slots(
    client: Client,
    doctor_ids: List[UUID],
    days_ahead: int = 3,
    max_slots: int = 3,
) -> List[datetime]:
    """Return up to *max_slots* available 30-minute UTC datetimes across the
    next *days_ahead* working days for any of the given doctors."""

    now = datetime.now(tz=timezone.utc).replace(second=0, microsecond=0)
    # Advance to next whole slot boundary
    if now.minute % SLOT_DURATION_MINUTES != 0:
        now += timedelta(minutes=SLOT_DURATION_MINUTES - now.minute % SLOT_DURATION_MINUTES)

    found: List[datetime] = []

    for day_offset in range(days_ahead + 1):
        candidate_date = (now + timedelta(days=day_offset)).date()
        for hour in range(WORKING_HOUR_START, WORKING_HOUR_END):
            for minute in (0, 30):
                slot_start = datetime(
                    candidate_date.year,
                    candidate_date.month,
                    candidate_date.day,
                    hour,
                    minute,
                    tzinfo=timezone.utc,
                )
                if slot_start <= now:
                    continue

                slot_end = slot_start + timedelta(minutes=SLOT_DURATION_MINUTES)

                # Check each doctor for availability at this slot
                for doctor_id in doctor_ids:
                    try:
                        conflicts = (
                            client.table("appointments")
                            .select("id")
                            .eq("doctor_id", str(doctor_id))
                            .eq("status", "scheduled")
                            .lt("scheduled_at", slot_end.isoformat())
                            .gt("end_at", slot_start.isoformat())
                            .limit(1)
                            .execute()
                        )
                        if not conflicts.data:
                            found.append(slot_start)
                            break  # found a free doctor for this slot
                    except Exception as exc:
                        logger.debug(f"Slot availability check failed: {exc}")

                if len(found) >= max_slots:
                    return found

    return found


# ---------------------------------------------------------------------------
# LLM call (Gemini)
# ---------------------------------------------------------------------------

def _call_gemini(symptoms_text: str) -> dict:
    """Send the symptoms text to Gemini and parse structured JSON back."""
    # Ensure the Gemini API key is set before importing the client library.
    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="GEMINI_API_KEY environment variable is not set in backend/.env",
        )
    # Now import the Google Generative AI client.
    try:
        import google.generativeai as genai  # type: ignore
    except ImportError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="google-generativeai package is not installed. Run: pip install google-generativeai",
        )
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel("gemini-2.0-flash")

    prompt = f"""You are a medical triage AI assistant for a hospital scheduling system.

Analyze the following patient symptom description and respond with ONLY a valid JSON object 
(no markdown, no explanation) with these exact fields:

{{
  "recommended_specialization": "<one of: {', '.join(VALID_SPECIALIZATIONS)}>",
  "suggested_priority": "<one of: normal, high, urgent>",
  "urgency_rationale": "<1-2 sentence explanation of the priority choice>"
}}

Rules:
- "urgent" = life-threatening symptoms (chest pain, stroke signs, severe trauma, difficulty breathing)
- "high"   = significant symptoms needing prompt attention within 24-48 hours
- "normal" = routine or non-critical concerns

Patient symptom description:
\"\"\"{symptoms_text}\"\"\"
"""

    try:
        response = model.generate_content(prompt)
        raw = response.text.strip()

        # Strip markdown code fences if Gemini wraps output
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        raw = raw.strip()

        result = json.loads(raw)

        # Validate and normalise fields
        specialization = result.get("recommended_specialization", "General")
        if specialization not in VALID_SPECIALIZATIONS:
            specialization = "General"

        priority = result.get("suggested_priority", "normal")
        if priority not in ("normal", "high", "urgent"):
            priority = "normal"

        rationale = result.get("urgency_rationale", "Assessment based on reported symptoms.")

        return {
            "recommended_specialization": specialization,
            "suggested_priority": priority,
            "urgency_rationale": rationale,
        }

    except json.JSONDecodeError as exc:
        logger.error(f"Gemini returned non-JSON output: {exc}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AI service returned an unparseable response. Please try again.",
        )
    except Exception as exc:
        logger.error(f"Gemini API call failed: {exc}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"AI service error: {str(exc)}",
        )


# ---------------------------------------------------------------------------
# Public service functions
# ---------------------------------------------------------------------------

def triage_symptoms(
    client: Client, request: TriageRequest
) -> TriageRecommendation:
    """Full triage pipeline:
    1. Call Gemini to classify symptoms.
    2. Fetch matching available doctors from DB.
    3. Find up to 3 open appointment slots.
    4. Return a TriageRecommendation.
    """
    # Step 1 — AI classification
    ai_result = _call_gemini(request.symptoms_text)
    specialization: str = ai_result["recommended_specialization"]
    priority: str = ai_result["suggested_priority"]
    rationale: str = ai_result["urgency_rationale"]

    # Step 2 — Fetch available doctors matching the specialization
    try:
        all_available: List[DoctorResponse] = list_doctors(
            client, available_only=True, limit=50
        )
        matched_doctors = [
            d for d in all_available
            if d.specialization.lower() == specialization.lower()
        ]
        # Fall back to all available doctors if no specialist found
        if not matched_doctors:
            logger.info(
                f"No available {specialization} doctors found; "
                "falling back to all available doctors."
            )
            matched_doctors = all_available
    except Exception as exc:
        logger.error(f"Failed to fetch doctors: {exc}")
        matched_doctors = []

    # Step 3 — Find open slots
    doctor_ids = [d.id for d in matched_doctors]
    recommended_slots: List[datetime] = []
    if doctor_ids:
        try:
            recommended_slots = _generate_candidate_slots(
                client, doctor_ids, days_ahead=3, max_slots=3
            )
        except Exception as exc:
            logger.warning(f"Slot generation failed: {exc}")

    return TriageRecommendation(
        recommended_specialization=specialization,
        suggested_priority=priority,  # type: ignore[arg-type]
        urgency_rationale=rationale,
        suggested_doctors=matched_doctors[:5],  # cap at 5 doctors in response
        recommended_slots=recommended_slots,
    )


def recommend_slots(
    client: Client, request: TriageRequest
) -> TriageRecommendation:
    """Alias that runs the full triage pipeline.
    Exposed separately so the ``/recommend-slots`` endpoint can be
    semantically distinct from ``/triage`` in the API contract.
    """
    return triage_symptoms(client, request)


def auto_schedule(
    client: Client, request: AutoScheduleRequest
) -> AutoScheduleResponse:
    """End-to-end automatic appointment scheduling.
    
    1. Validates patient existence.
    2. Runs AI triage on patient's symptoms text.
    3. Filters eligible doctors by specialization (or preferred_doctor_id if specified).
    4. Searches candidate conflict-free 30-minute slots.
    5. Attempts to book the best slot using atomic create_appointment with retry on 409 conflict.
    6. Returns AutoScheduleResponse with full appointment confirmation.
    """
    # 1. Validate patient
    patient = get_patient_by_id(client, request.patient_id)
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient with ID '{request.patient_id}' not found.",
        )

    # 2. Run AI triage
    triage_req = TriageRequest(
        patient_id=request.patient_id,
        symptoms_text=request.symptoms_text,
    )
    recommendation = triage_symptoms(client, triage_req)

    # 3. Determine candidate doctors
    candidate_doctors: List[DoctorResponse] = []
    if request.preferred_doctor_id:
        pref_doc = get_doctor_by_id(client, request.preferred_doctor_id)
        if pref_doc and pref_doc.is_available:
            candidate_doctors = [pref_doc]
        elif pref_doc and not pref_doc.is_available:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Preferred doctor '{pref_doc.name}' is currently unavailable.",
            )

    if not candidate_doctors:
        candidate_doctors = recommendation.suggested_doctors

    if not candidate_doctors:
        return AutoScheduleResponse(
            success=False,
            recommendation=recommendation,
            appointment=None,
            message="No available physicians found matching the required specialization. Please contact staff.",
        )

    # Determine priority enum
    priority_enum = AppointmentPriority.NORMAL
    if recommendation.suggested_priority == "high":
        priority_enum = AppointmentPriority.HIGH
    elif recommendation.suggested_priority == "urgent":
        priority_enum = AppointmentPriority.URGENT

    # 4. Generate candidate slots
    candidate_slots = list(recommendation.recommended_slots)
    doctor_ids = [d.id for d in candidate_doctors]

    if not candidate_slots:
        # Re-check or generate up to 5 slots
        candidate_slots = _generate_candidate_slots(client, doctor_ids, days_ahead=7, max_slots=5)

    if not candidate_slots:
        return AutoScheduleResponse(
            success=False,
            recommendation=recommendation,
            appointment=None,
            message="All upcoming 30-minute consultation slots are currently booked. Please try an alternate date.",
        )

    # 5. Attempt booking with bounded retry loop against race conflicts
    MAX_ATTEMPTS = 5
    attempts = 0
    booked_appointment: Optional[AppointmentResponse] = None

    for slot in candidate_slots:
        if attempts >= MAX_ATTEMPTS:
            break
        for doc in candidate_doctors:
            attempts += 1
            try:
                create_payload = AppointmentCreate(
                    patient_id=request.patient_id,
                    doctor_id=doc.id,
                    scheduled_at=slot,
                    priority=priority_enum,
                    reason=f"AI Triage ({recommendation.recommended_specialization}): {request.symptoms_text[:200]}",
                )
                booked_appointment = create_appointment(client, create_payload)
                break
            except HTTPException as exc:
                if exc.status_code == status.HTTP_409_CONFLICT:
                    logger.info(f"Slot conflict encountered for Dr. {doc.name} at {slot}; trying next slot.")
                    continue
                else:
                    raise
            except Exception as exc:
                logger.warning(f"Booking attempt failed: {exc}")
                continue

        if booked_appointment:
            break

    if not booked_appointment:
        return AutoScheduleResponse(
            success=False,
            recommendation=recommendation,
            appointment=None,
            message="Unable to safely secure a conflict-free appointment due to concurrent bookings. Please review available times.",
        )

    return AutoScheduleResponse(
        success=True,
        recommendation=recommendation,
        appointment=booked_appointment,
        message=f"Successfully auto-scheduled 30m appointment with {booked_appointment.doctor_name} for {booked_appointment.scheduled_at.isoformat()}.",
    )

