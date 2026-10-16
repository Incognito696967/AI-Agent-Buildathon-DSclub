"""Domain models and data definitions."""
from dataclasses import dataclass
from typing import Optional
from datetime import datetime
from uuid import UUID


@dataclass
class PatientModel:
    id: UUID
    name: str
    age: int
    contact: Optional[str] = None
    created_at: Optional[datetime] = None


@dataclass
class DoctorModel:
    id: UUID
    name: str
    specialization: str
    is_available: bool = True
    created_at: Optional[datetime] = None


@dataclass
class AppointmentModel:
    id: UUID
    patient_id: UUID
    doctor_id: UUID
    scheduled_at: datetime
    end_at: datetime
    status: str = "scheduled"
    priority: str = "normal"
    reason: Optional[str] = None
    created_at: Optional[datetime] = None
