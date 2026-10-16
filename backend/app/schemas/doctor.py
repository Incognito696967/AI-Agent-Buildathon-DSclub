from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict


class DoctorBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200, description="Doctor full name")
    specialization: str = Field(..., min_length=1, max_length=200, description="Medical specialization")
    is_available: bool = Field(True, description="Availability flag for booking appointments")


class DoctorCreate(DoctorBase):
    pass


class DoctorUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    specialization: Optional[str] = Field(None, min_length=1, max_length=200)
    is_available: Optional[bool] = None


class DoctorResponse(DoctorBase):
    id: UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
