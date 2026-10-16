"""Pydantic schemas for data validation and serialization."""
from app.schemas.patient import PatientBase, PatientCreate, PatientResponse
from app.schemas.doctor import DoctorBase, DoctorCreate, DoctorUpdate, DoctorResponse
from app.schemas.appointment import (
    AppointmentBase,
    AppointmentCreate,
    AppointmentResponse,
    AppointmentCancelResponse,
    AppointmentStatus,
    AppointmentPriority,
)

from app.schemas.triage import (
    TriageRequest,
    TriageRecommendation,
    AutoScheduleRequest,
    AutoScheduleResponse,
)

__all__ = [
    "PatientBase",
    "PatientCreate",
    "PatientResponse",
    "DoctorBase",
    "DoctorCreate",
    "DoctorUpdate",
    "DoctorResponse",
    "AppointmentBase",
    "AppointmentCreate",
    "AppointmentResponse",
    "AppointmentCancelResponse",
    "AppointmentStatus",
    "AppointmentPriority",
    "TriageRequest",
    "TriageRecommendation",
    "AutoScheduleRequest",
    "AutoScheduleResponse",
]

