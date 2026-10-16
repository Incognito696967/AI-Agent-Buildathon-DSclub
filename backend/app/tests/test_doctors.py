from fastapi import status


def test_list_doctors_success(client, mock_supabase):
    mock_supabase.tables["doctors"]._data = [
        {
            "id": "33333333-3333-3333-3333-333333333333",
            "name": "Dr. House",
            "specialization": "Diagnostics",
            "is_available": True,
            "created_at": "2026-10-16T12:00:00Z",
        }
    ]
    response = client.get("/api/v1/doctors")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert len(data) == 1
    assert data[0]["name"] == "Dr. House"


def test_create_doctor_success(client, mock_supabase):
    mock_supabase.tables["doctors"]._data = [
        {
            "id": "44444444-4444-4444-4444-444444444444",
            "name": "Dr. Strange",
            "specialization": "Neuro-Surgery",
            "is_available": True,
            "created_at": "2026-10-16T12:00:00Z",
        }
    ]
    payload = {
        "name": "Dr. Strange",
        "specialization": "Neuro-Surgery",
        "is_available": True,
    }
    response = client.post("/api/v1/doctors", json=payload)
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["name"] == "Dr. Strange"
    assert data["specialization"] == "Neuro-Surgery"
