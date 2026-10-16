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
