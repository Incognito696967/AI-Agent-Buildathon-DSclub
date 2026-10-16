from datetime import datetime
from typing import List, Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.doctor import DoctorResponse
from app.schemas.appointment import AppointmentResponse

class TriageRequest(BaseModel):
    """Incoming request from a patient containing free‑form symptom text.

    The `patient_id` links the request to an existing patient record.
    """

    patient_id: UUID = Field(..., description="Identifier of the patient submitting the request")
    symptoms_text: str = Field(..., min_length=1, description="Unstructured symptom description supplied by the patient")

class TriageRecommendation(BaseModel):
    """Response produced by the AI‑triage service.

    * `recommended_specialization` – the medical field best suited to the
      described symptoms.
    * `suggested_priority` – one of `normal`, `high`, or `urgent`.
    * `urgency_rationale` – short explanation of why that priority was chosen.
    * `suggested_doctors` – list of doctors (as `DoctorResponse`) that match the
      specialization and are currently available.
    * `recommended_slots` – up‑to‑three ISO‑formatted datetimes representing the
      best appointment opportunities.
    """

    recommended_specialization: str = Field(..., description="Medical specialization deduced from symptoms")
    suggested_priority: Literal["normal", "high", "urgent"] = Field(..., description="Urgency classification")
    urgency_rationale: str = Field(..., description="Why this urgency level was selected")
    suggested_doctors: List[DoctorResponse] = Field(..., description="Doctors that could handle the case")
    recommended_slots: List[datetime] = Field(..., description="Top three appointment slot start times")


class AutoScheduleRequest(BaseModel):
    """Request for fully automated AI-driven triage and booking.
    
    A patient provides their identifier, symptoms, and optional scheduling constraints.
    """
    patient_id: UUID = Field(..., description="Identifier of the patient submitting the request")
    symptoms_text: str = Field(..., min_length=1, description="Unstructured symptom description supplied by the patient")
    preferred_doctor_id: Optional[UUID] = Field(None, description="Optional preferred doctor ID")
    preferred_date: Optional[str] = Field(None, description="Optional preferred date in YYYY-MM-DD format")


class AutoScheduleResponse(BaseModel):
    """Result of automated AI scheduling including confirmed booking details."""
    success: bool = Field(True, description="Whether booking succeeded")
    recommendation: TriageRecommendation = Field(..., description="AI triage and recommendation breakdown")
    appointment: Optional[AppointmentResponse] = None
    message: str = Field(..., description="Status summary or next steps")


