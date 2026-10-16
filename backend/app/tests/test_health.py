from fastapi import status


def test_root_endpoint(client):
    """Test that root endpoint returns service info and docs link."""
    response = client.get("/")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "service" in data
    assert data["docs_url"] == "/docs"
    assert data["health_check"] == "/api/v1/health"


def test_app_health_liveness(client):
    """Test that /api/v1/health returns healthy without requiring active database."""
    response = client.get("/api/v1/health")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["status"] == "healthy"
    assert "version" in data
    assert "timestamp" in data


def test_db_health_check(client, monkeypatch):
    """Test that /api/v1/health/db verifies database connectivity."""
    # Mock check_database_connection to return True
    monkeypatch.setattr(
        "app.api.routes.health.check_database_connection",
        lambda: (True, "Connected to Supabase PostgreSQL"),
    )
    response = client.get("/api/v1/health/db")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["status"] == "healthy"
    assert data["database"] == "connected"

    # Mock check_database_connection to return False
    monkeypatch.setattr(
        "app.api.routes.health.check_database_connection",
        lambda: (False, "Database credentials are not configured"),
    )
    response_unhealthy = client.get("/api/v1/health/db")
    assert response_unhealthy.status_code == status.HTTP_503_SERVICE_UNAVAILABLE
    data_unhealthy = response_unhealthy.json()
    assert data_unhealthy["status"] == "unhealthy"
    assert data_unhealthy["database"] == "disconnected"
