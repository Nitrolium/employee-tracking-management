from fastapi.testclient import TestClient
from app.main import app
from app.core.config import settings

client = TestClient(app)

def test_read_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Welcome to the Employee Tracking & Management API"}

def test_openapi_schema():
    response = client.get(f"{settings.API_V1_STR}/openapi.json")
    assert response.status_code == 200
