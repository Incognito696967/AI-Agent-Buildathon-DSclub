from datetime import datetime, timezone
from enum import Enum
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict, field_validator


class AppointmentStatus(str, Enum):
    SCHEDULED = "scheduled"
    CANCELLED = "cancelled"
    COMPLETED = "completed"


class AppointmentPriority(str, Enum):
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"


class AppointmentBase(BaseModel):
    patient_id: UUID = Field(..., description="ID of the patient")
    doctor_id: UUID = Field(..., description="ID of the doctor")
    scheduled_at: datetime = Field(..., description="Start timestamp of the appointment")
    priority: AppointmentPriority = Field(
        default=AppointmentPriority.NORMAL,
        description="Urgency/priority of the consultation (normal, high, urgent)"
    )
    reason: Optional[str] = Field(None, max_length=500, description="Reason for visit or symptoms")

    @field_validator("scheduled_at")
    @classmethod
    def validate_scheduled_at(cls, v: datetime) -> datetime:
        # Ensure timezone-aware UTC datetime
        if v.tzinfo is None:
            v = v.replace(tzinfo=timezone.utc)
        return v


class AppointmentCreate(AppointmentBase):
    pass


class AppointmentResponse(AppointmentBase):
    id: UUID
    end_at: datetime
    status: AppointmentStatus
    created_at: datetime
    patient_name: Optional[str] = None
    doctor_name: Optional[str] = None
    specialization: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class AppointmentCancelResponse(BaseModel):
    id: UUID
    status: AppointmentStatus
    message: str
