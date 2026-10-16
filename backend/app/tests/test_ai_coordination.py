"""Unit tests for the AI Coordination endpoints — Dev 3 deliverable.

All tests mock the Gemini API call and Supabase doctor/slot queries so that
no live credentials are needed (matches the project's existing test strategy).
"""
from unittest.mock import MagicMock, patch
from datetime import datetime, timezone
from fastapi import status

PATIENT_ID = "11111111-1111-1111-1111-111111111111"
DOCTOR_ID  = "22222222-2222-2222-2222-222222222222"

# ---------------------------------------------------------------------------
# Shared mock Gemini response factory
# ---------------------------------------------------------------------------

def _make_gemini_response(specialization="Cardiology", priority="urgent", rationale="Test rationale."):
    """Build a mock google.generativeai GenerateContentResponse."""
    import json
    mock_resp = MagicMock()
    mock_resp.text = json.dumps({
        "recommended_specialization": specialization,
        "suggested_priority": priority,
        "urgency_rationale": rationale,
    })
    return mock_resp


# ---------------------------------------------------------------------------
# Fixtures / helpers shared across tests
# ---------------------------------------------------------------------------

MOCK_DOCTOR_ROW = {
    "id": DOCTOR_ID,
    "name": "Dr. Heart",
    "specialization": "Cardiology",
    "is_available": True,
    "created_at": "2026-10-16T08:00:00Z",
}


# ---------------------------------------------------------------------------
# POST /api/v1/ai/triage
# ---------------------------------------------------------------------------

@patch.dict("os.environ", {"GEMINI_API_KEY": "fake-key"})
@patch("app.services.ai_triage_service._call_gemini")
@patch("app.services.ai_triage_service._generate_candidate_slots")
@patch("app.services.ai_triage_service.list_doctors")
def test_triage_success(mock_list_docs, mock_slots, mock_gemini, client, mock_supabase):
    """Happy path: Gemini returns valid JSON, doctor found, slots generated."""
    from app.schemas.doctor import DoctorResponse

    mock_gemini.return_value = {
        "recommended_specialization": "Cardiology",
        "suggested_priority": "urgent",
        "urgency_rationale": "Chest pain may indicate a cardiac event.",
    }

    mock_list_docs.return_value = [
        DoctorResponse.model_validate(MOCK_DOCTOR_ROW)
    ]

    future_slot = datetime(2026, 10, 20, 9, 0, tzinfo=timezone.utc)
    mock_slots.return_value = [future_slot]

    payload = {
        "patient_id": PATIENT_ID,
        "symptoms_text": "I have sudden chest pain radiating to my left arm.",
    }
    response = client.post("/api/v1/ai/triage", json=payload)

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["recommended_specialization"] == "Cardiology"
    assert data["suggested_priority"] == "urgent"
    assert len(data["suggested_doctors"]) == 1
    assert data["suggested_doctors"][0]["name"] == "Dr. Heart"
    assert len(data["recommended_slots"]) == 1


@patch.dict("os.environ", {"GEMINI_API_KEY": "fake-key"})
@patch("app.services.ai_triage_service._call_gemini")
@patch("app.services.ai_triage_service._generate_candidate_slots")
@patch("app.services.ai_triage_service.list_doctors")
def test_triage_no_specialist_fallback(mock_list_docs, mock_slots, mock_gemini, client):
    """When no doctor matches the specialization, falls back to all available doctors."""
    from app.schemas.doctor import DoctorResponse

    mock_gemini.return_value = {
        "recommended_specialization": "Neurology",
        "suggested_priority": "high",
        "urgency_rationale": "Persistent headache warrants prompt neurological evaluation.",
    }

    # Only a Cardiology doctor available — no Neurology match
    mock_list_docs.return_value = [
        DoctorResponse.model_validate(MOCK_DOCTOR_ROW)
    ]
    mock_slots.return_value = []

    payload = {
        "patient_id": PATIENT_ID,
        "symptoms_text": "Persistent severe headache for three days.",
    }
    response = client.post("/api/v1/ai/triage", json=payload)

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["recommended_specialization"] == "Neurology"
    # Falls back — still returns the cardiology doctor
    assert len(data["suggested_doctors"]) == 1


@patch.dict("os.environ", {"GEMINI_API_KEY": "fake-key"})
@patch("app.services.ai_triage_service._call_gemini")
@patch("app.services.ai_triage_service.list_doctors")
def test_triage_no_available_doctors(mock_list_docs, mock_gemini, client):
    """When no doctors are available, recommended_slots is empty."""
    mock_gemini.return_value = {
        "recommended_specialization": "General",
        "suggested_priority": "normal",
        "urgency_rationale": "Mild cold symptoms do not require urgent care.",
    }
    mock_list_docs.return_value = []

    payload = {
        "patient_id": PATIENT_ID,
        "symptoms_text": "Runny nose and mild sore throat.",
    }
    response = client.post("/api/v1/ai/triage", json=payload)

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["suggested_doctors"] == []
    assert data["recommended_slots"] == []


def test_triage_missing_symptoms_text(client):
    """Empty symptoms_text should fail Pydantic validation with 422."""
    payload = {
        "patient_id": PATIENT_ID,
        "symptoms_text": "",
    }
    response = client.post("/api/v1/ai/triage", json=payload)
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


def test_triage_missing_patient_id(client):
    """Missing patient_id should fail with 422."""
    payload = {
        "symptoms_text": "Chest tightness",
    }
    response = client.post("/api/v1/ai/triage", json=payload)
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


def test_triage_missing_gemini_key(client, monkeypatch):
    """When GEMINI_API_KEY is not set, the endpoint returns 503."""
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    monkeypatch.delenv("GOOGLE_API_KEY", raising=False)

    payload = {
        "patient_id": PATIENT_ID,
        "symptoms_text": "Chest tightness",
    }
    response = client.post("/api/v1/ai/triage", json=payload)
    assert response.status_code == status.HTTP_503_SERVICE_UNAVAILABLE
    assert "GEMINI_API_KEY" in response.json()["detail"]


# ---------------------------------------------------------------------------
# POST /api/v1/ai/recommend-slots  (mirrors /triage)
# ---------------------------------------------------------------------------

@patch.dict("os.environ", {"GEMINI_API_KEY": "fake-key"})
@patch("app.services.ai_triage_service._call_gemini")
@patch("app.services.ai_triage_service._generate_candidate_slots")
@patch("app.services.ai_triage_service.list_doctors")
def test_recommend_slots_success(mock_list_docs, mock_slots, mock_gemini, client):
    """The /recommend-slots endpoint returns the same structure as /triage."""
    from app.schemas.doctor import DoctorResponse

    mock_gemini.return_value = {
        "recommended_specialization": "Orthopedics",
        "suggested_priority": "high",
        "urgency_rationale": "Joint swelling may indicate injury requiring prompt imaging.",
    }
    mock_list_docs.return_value = [
        DoctorResponse.model_validate({
            **MOCK_DOCTOR_ROW,
            "name": "Dr. Bones",
            "specialization": "Orthopedics",
        })
    ]
    mock_slots.return_value = [
        datetime(2026, 10, 21, 10, 0, tzinfo=timezone.utc),
        datetime(2026, 10, 21, 10, 30, tzinfo=timezone.utc),
    ]

    payload = {
        "patient_id": PATIENT_ID,
        "symptoms_text": "My right knee is swollen and I cannot bend it.",
    }
    response = client.post("/api/v1/ai/recommend-slots", json=payload)

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["recommended_specialization"] == "Orthopedics"
    assert len(data["recommended_slots"]) == 2


# ---------------------------------------------------------------------------
# POST /api/v1/ai/auto-schedule & /api/v1/appointments/auto-schedule
# ---------------------------------------------------------------------------

@patch.dict("os.environ", {"GEMINI_API_KEY": "fake-key"})
@patch("app.services.ai_triage_service._call_gemini")
@patch("app.services.ai_triage_service._generate_candidate_slots")
@patch("app.services.ai_triage_service.list_doctors")
@patch("app.services.ai_triage_service.get_patient_by_id")
@patch("app.services.ai_triage_service.create_appointment")
def test_auto_schedule_success(
    mock_create_apt,
    mock_get_pat,
    mock_list_docs,
    mock_slots,
    mock_gemini,
    client,
    mock_supabase,
):
    """Happy path: AI diagnoses, picks candidate specialist, generates slot, atomically books."""
    from app.schemas.patient import PatientResponse
    from app.schemas.doctor import DoctorResponse
    from app.schemas.appointment import AppointmentResponse, AppointmentStatus, AppointmentPriority

    mock_get_pat.return_value = PatientResponse(
        id=PATIENT_ID, name="Jane Doe", age=30, contact="555", created_at="2026-10-16T12:00:00Z"
    )

    mock_gemini.return_value = {
        "recommended_specialization": "Cardiology",
        "suggested_priority": "urgent",
        "urgency_rationale": "Severe acute chest pain warrants immediate cardiac attention.",
    }

    doc = DoctorResponse.model_validate(MOCK_DOCTOR_ROW)
    mock_list_docs.return_value = [doc]

    slot_time = datetime(2026, 10, 20, 10, 0, tzinfo=timezone.utc)
    mock_slots.return_value = [slot_time]

    mock_create_apt.return_value = AppointmentResponse(
        id="33333333-3333-3333-3333-333333333333",
        patient_id=PATIENT_ID,
        doctor_id=DOCTOR_ID,
        scheduled_at=slot_time,
        end_at=datetime(2026, 10, 20, 10, 30, tzinfo=timezone.utc),
        status=AppointmentStatus.SCHEDULED,
        priority=AppointmentPriority.URGENT,
        reason="AI Triage (Cardiology): Crushing chest pain",
        created_at="2026-10-16T12:00:00Z",
        patient_name="Jane Doe",
        doctor_name="Dr. Heart",
        specialization="Cardiology",
    )

    payload = {
        "patient_id": PATIENT_ID,
        "symptoms_text": "Crushing chest pain radiating to left jaw.",
    }
    response = client.post("/api/v1/ai/auto-schedule", json=payload)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["success"] is True
    assert data["appointment"] is not None
    assert data["appointment"]["doctor_name"] == "Dr. Heart"
    assert data["appointment"]["priority"] == "urgent"
    assert data["recommendation"]["recommended_specialization"] == "Cardiology"

    # Also test alias route /api/v1/appointments/auto-schedule
    response_alias = client.post("/api/v1/appointments/auto-schedule", json=payload)
    assert response_alias.status_code == status.HTTP_201_CREATED
    data_alias = response_alias.json()
    assert data_alias["success"] is True
    assert data_alias["appointment"]["doctor_name"] == "Dr. Heart"


@patch("app.services.ai_triage_service.get_patient_by_id")
def test_auto_schedule_patient_not_found(mock_get_pat, client):
    """When patient ID is not found, returns 404."""
    mock_get_pat.return_value = None
    payload = {
        "patient_id": PATIENT_ID,
        "symptoms_text": "Persistent headache",
    }
    response = client.post("/api/v1/ai/auto-schedule", json=payload)
    assert response.status_code == status.HTTP_404_NOT_FOUND
    assert "Patient" in response.json()["detail"]


@patch.dict("os.environ", {"GEMINI_API_KEY": "fake-key"})
@patch("app.services.ai_triage_service._call_gemini")
@patch("app.services.ai_triage_service.list_doctors")
@patch("app.services.ai_triage_service.get_patient_by_id")
def test_auto_schedule_no_doctors_available(
    mock_get_pat, mock_list_docs, mock_gemini, client
):
    """When no doctors are available in the system, returns graceful unbooked response."""
    from app.schemas.patient import PatientResponse

    mock_get_pat.return_value = PatientResponse(
        id=PATIENT_ID, name="Jane Doe", age=30, contact="555", created_at="2026-10-16T12:00:00Z"
    )
    mock_gemini.return_value = {
        "recommended_specialization": "Dermatology",
        "suggested_priority": "normal",
        "urgency_rationale": "Skin rash review.",
    }
    mock_list_docs.return_value = []

    payload = {
        "patient_id": PATIENT_ID,
        "symptoms_text": "Mild itchy red spots on arm.",
    }
    response = client.post("/api/v1/ai/auto-schedule", json=payload)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["success"] is False
    assert data["appointment"] is None
    assert "No available physicians" in data["message"]

