from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict


class PatientBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200, description="Full name of the patient")
    age: int = Field(..., ge=0, le=150, description="Patient age in years")
    contact: Optional[str] = Field(None, max_length=100, description="Contact phone or email")


class PatientCreate(PatientBase):
    pass


class PatientResponse(PatientBase):
    id: UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
