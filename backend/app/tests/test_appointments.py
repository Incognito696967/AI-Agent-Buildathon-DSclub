from unittest.mock import patch
from fastapi import status
from app.schemas.appointment import AppointmentStatus, AppointmentPriority


PATIENT_ID = "11111111-1111-1111-1111-111111111111"
DOCTOR_ID = "22222222-2222-2222-2222-222222222222"
APPOINTMENT_ID = "33333333-3333-3333-3333-333333333333"


def test_list_appointments_empty(client, mock_supabase):
    mock_supabase.tables["appointments"]._data = []
    response = client.get("/api/v1/appointments")
    assert response.status_code == status.HTTP_200_OK
    assert response.json() == []


@patch("app.services.appointment_service.get_patient_by_id")
@patch("app.services.appointment_service.get_doctor_by_id")
def test_create_appointment_success(mock_get_doc, mock_get_pat, client, mock_supabase):
    from app.schemas.patient import PatientResponse
    from app.schemas.doctor import DoctorResponse

    mock_get_pat.return_value = PatientResponse(
        id=PATIENT_ID, name="Jane Doe", age=30, contact="555", created_at="2026-10-16T12:00:00Z"
    )
    mock_get_doc.return_value = DoctorResponse(
        id=DOCTOR_ID, name="Dr. Who", specialization="Time", is_available=True, created_at="2026-10-16T12:00:00Z"
    )

    # Empty initial table ensures no conflict during slot pre-check
    mock_supabase.tables["appointments"]._data = []

    payload = {
        "patient_id": PATIENT_ID,
        "doctor_id": DOCTOR_ID,
        "scheduled_at": "2026-10-20T10:00:00Z",
        "priority": "normal",
        "reason": "Annual checkup",
    }
    response = client.post("/api/v1/appointments", json=payload)
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["patient_name"] == "Jane Doe"
    assert data["doctor_name"] == "Dr. Who"
    assert data["status"] == "scheduled"


@patch("app.services.appointment_service.get_patient_by_id")
@patch("app.services.appointment_service.get_doctor_by_id")
def test_create_appointment_conflict(mock_get_doc, mock_get_pat, client, mock_supabase):
    from app.schemas.patient import PatientResponse
    from app.schemas.doctor import DoctorResponse

    mock_get_pat.return_value = PatientResponse(
        id=PATIENT_ID, name="Jane Doe", age=30, contact="555", created_at="2026-10-16T12:00:00Z"
    )
    mock_get_doc.return_value = DoctorResponse(
        id=DOCTOR_ID, name="Dr. Who", specialization="Time", is_available=True, created_at="2026-10-16T12:00:00Z"
    )

    # Mock an existing appointment at the exact time
    mock_supabase.tables["appointments"]._data = [
        {
            "id": APPOINTMENT_ID,
            "patient_id": PATIENT_ID,
            "doctor_id": DOCTOR_ID,
            "scheduled_at": "2026-10-20T10:00:00Z",
            "end_at": "2026-10-20T10:30:00Z",
            "status": "scheduled",
            "priority": "normal",
            "reason": "Existing booking",
            "created_at": "2026-10-16T12:00:00Z",
        }
    ]

    payload = {
        "patient_id": PATIENT_ID,
        "doctor_id": DOCTOR_ID,
        "scheduled_at": "2026-10-20T10:00:00Z",
        "priority": "normal",
        "reason": "Conflicting booking attempt",
    }
    response = client.post("/api/v1/appointments", json=payload)
    assert response.status_code == status.HTTP_409_CONFLICT
    assert "conflict" in response.json()["detail"].lower()


@patch("app.services.appointment_service.get_patient_by_id")
def test_create_appointment_patient_not_found(mock_get_pat, client):
    mock_get_pat.return_value = None
    payload = {
        "patient_id": PATIENT_ID,
        "doctor_id": DOCTOR_ID,
        "scheduled_at": "2026-10-20T10:00:00Z",
        "priority": "normal",
    }
    response = client.post("/api/v1/appointments", json=payload)
    assert response.status_code == status.HTTP_404_NOT_FOUND
    assert "Patient" in response.json()["detail"]


@patch("app.services.appointment_service.get_patient_by_id")
@patch("app.services.appointment_service.get_doctor_by_id")
def test_create_appointment_doctor_unavailable(mock_get_doc, mock_get_pat, client):
    from app.schemas.patient import PatientResponse
    from app.schemas.doctor import DoctorResponse

    mock_get_pat.return_value = PatientResponse(
        id=PATIENT_ID, name="Jane Doe", age=30, contact="555", created_at="2026-10-16T12:00:00Z"
    )
    mock_get_doc.return_value = DoctorResponse(
        id=DOCTOR_ID, name="Dr. Offline", specialization="General", is_available=False, created_at="2026-10-16T12:00:00Z"
    )

    payload = {
        "patient_id": PATIENT_ID,
        "doctor_id": DOCTOR_ID,
        "scheduled_at": "2026-10-20T10:00:00Z",
        "priority": "normal",
    }
    response = client.post("/api/v1/appointments", json=payload)
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "unavailable" in response.json()["detail"].lower()


def test_cancel_appointment_success(client, mock_supabase):
    mock_supabase.tables["appointments"]._data = [
        {"id": APPOINTMENT_ID, "status": "scheduled"}
    ]
    response = client.patch(f"/api/v1/appointments/{APPOINTMENT_ID}/cancel")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["status"] == "cancelled"
    assert "successfully" in data["message"].lower()


def test_cancel_appointment_not_found(client, mock_supabase):
    mock_supabase.tables["appointments"]._data = []
    response = client.patch(f"/api/v1/appointments/{APPOINTMENT_ID}/cancel")
    assert response.status_code == status.HTTP_404_NOT_FOUND
