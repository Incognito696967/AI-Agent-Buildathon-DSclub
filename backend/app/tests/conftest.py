from unittest.mock import MagicMock
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db.supabase_client import get_supabase_client


class MockPostgrestResponse:
    def __init__(self, data=None, count=None):
        self.data = data if data is not None else []
        self.count = count


class MockQueryBuilder:
    def __init__(self, data=None):
        self._data = data if data is not None else []

    def select(self, *args, **kwargs):
        return self

    def insert(self, payload):
        if isinstance(payload, list):
            self._data = [
                {
                    "id": item.get("id", "33333333-3333-3333-3333-333333333333"),
                    "created_at": item.get("created_at", "2026-10-16T12:00:00Z"),
                    **item,
                }
                for item in payload
            ]
        else:
            item = dict(payload)
            if "id" not in item:
                item["id"] = "33333333-3333-3333-3333-333333333333"
            if "created_at" not in item:
                item["created_at"] = "2026-10-16T12:00:00Z"
            self._data = [item]
        return self

    def update(self, payload):
        if self._data and isinstance(self._data, list):
            for item in self._data:
                if isinstance(item, dict):
                    item.update(payload)
        return self

    def eq(self, column, value):
        return self

    def lt(self, column, value):
        return self

    def gt(self, column, value):
        return self

    def order(self, *args, **kwargs):
        return self

    def range(self, *args, **kwargs):
        return self

    def limit(self, *args, **kwargs):
        return self

    def execute(self):
        return MockPostgrestResponse(data=self._data)


class MockSupabaseClient:
    def __init__(self):
        self.tables = {
            "patients": MockQueryBuilder(),
            "doctors": MockQueryBuilder(),
            "appointments": MockQueryBuilder(),
        }

    def table(self, table_name: str):
        if table_name not in self.tables:
            self.tables[table_name] = MockQueryBuilder()
        return self.tables[table_name]


@pytest.fixture
def mock_supabase():
    client = MockSupabaseClient()
    return client


@pytest.fixture
def client(mock_supabase):
    app.dependency_overrides[get_supabase_client] = lambda: mock_supabase
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
