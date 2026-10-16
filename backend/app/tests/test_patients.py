from fastapi import status


def test_list_patients_empty(client, mock_supabase):
    mock_supabase.tables["patients"]._data = []
    response = client.get("/api/v1/patients")
    assert response.status_code == status.HTTP_200_OK
    assert response.json() == []


def test_list_patients_success(client, mock_supabase):
    mock_supabase.tables["patients"]._data = [
        {
            "id": "11111111-1111-1111-1111-111111111111",
            "name": "Jane Patient",
            "age": 30,
            "contact": "555-0199",
            "created_at": "2026-10-16T12:00:00Z",
        }
    ]
    response = client.get("/api/v1/patients")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert len(data) == 1
    assert data[0]["name"] == "Jane Patient"


def test_create_patient_success(client, mock_supabase):
    mock_supabase.tables["patients"]._data = [
        {
            "id": "22222222-2222-2222-2222-222222222222",
            "name": "Alice Wonderland",
            "age": 28,
            "contact": "555-1234",
            "created_at": "2026-10-16T12:00:00Z",
        }
    ]
    payload = {"name": "Alice Wonderland", "age": 28, "contact": "555-1234"}
    response = client.post("/api/v1/patients", json=payload)
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["name"] == "Alice Wonderland"
    assert data["age"] == 28


def test_create_patient_validation_error(client):
    # Age cannot be negative
    payload = {"name": "Invalid Patient", "age": -5}
    response = client.post("/api/v1/patients", json=payload)
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    # Name cannot be empty
    payload_empty_name = {"name": "", "age": 25}
    response2 = client.post("/api/v1/patients", json=payload_empty_name)
    assert response2.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
