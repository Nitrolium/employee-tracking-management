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

def test_token_creation_with_role_enum():
    from app.core import security
    from app.models import RoleEnum
    import jwt

    token = security.create_access_token("test@example.com", RoleEnum.MANAGER)
    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[security.ALGORITHM])
    assert payload["sub"] == "test@example.com"
    assert payload["role"] == "MANAGER"

def test_password_hashing():
    from app.core import security

    pwd = "secretpassword"
    hashed = security.get_password_hash(pwd)
    assert security.verify_password(pwd, hashed) is True
    assert security.verify_password("wrongpassword", hashed) is False

def test_shift_schema_defaults():
    from app.schemas.shift import ShiftCreate
    from datetime import time, date

    shift = ShiftCreate(
        name="Morning Standard",
        start_time=time(9, 0),
        end_time=time(17, 0)
    )
    assert shift.break_duration_minutes == 60
    assert shift.working_days == [1, 2, 3, 4, 5]
    assert shift.effective_date is None

def test_team_schema():
    from app.schemas import TeamCreate

    team = TeamCreate(name="Core Engineers", member_employee_ids=[1, 2, 3])
    assert team.name == "Core Engineers"
    assert team.member_employee_ids == [1, 2, 3]

def test_app_categorization():
    from app.api.routes.activity import classify_app_category

    assert classify_app_category("VS Code - project.py") == "Development"
    assert classify_app_category("Slack - #engineering") == "Communication"
    assert classify_app_category("Google Chrome - Search") == "Browsing"
    assert classify_app_category("Figma - Dashboard Mockup") == "Productivity"
    assert classify_app_category("Break Time ☕") == "Break"

def test_past_shift_activity_schema():
    from app.schemas.activity import PastShiftActivityResponse, AppBreakdownItem, TimelineBucket

    item = PastShiftActivityResponse(
        id=1,
        employee_id=1,
        employee_name="Alice",
        employee_email="alice@company.com",
        date="2026-08-24",
        clock_in_time="09:02:15",
        clock_out_time="17:01:00",
        is_ongoing=False,
        total_duration_seconds=28800,
        active_duration_seconds=26000,
        idle_duration_seconds=2800,
        break_duration_seconds=2800,
        focus_score=90.3,
        mouse_event_count=1200,
        keyboard_event_count=3500,
        punctuality_status="ON_TIME",
        top_applications=[
            AppBreakdownItem(app_name="VS Code", duration_seconds=18000, percentage=62.5, category="Development")
        ],
        timeline=[
            TimelineBucket(time_label="09:00", active_seconds=3200, idle_seconds=400)
        ]
    )
    assert item.focus_score == 90.3
    assert item.punctuality_status == "ON_TIME"
    assert len(item.top_applications) == 1



