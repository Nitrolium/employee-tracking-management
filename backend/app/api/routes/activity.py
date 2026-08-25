from typing import List, Dict, Optional
from datetime import datetime, timedelta, date, time
from collections import defaultdict
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from app.api import deps
from app.models import ActivitySummary, ApplicationUsage, User, Employee, Manager, RoleEnum, Shift, ShiftAssignment
from app.schemas.activity import (
    ActivitySyncRequest,
    ActivitySummaryResponse,
    AppUsageBase,
    HeartbeatRequest,
    LiveEmployeeStatus,
    PastShiftActivityResponse,
    AppBreakdownItem,
    TimelineBucket
)

router = APIRouter()

# In-memory store for live presence
# Key: employee_id -> Dict of presence details
_live_presence_store: Dict[int, dict] = {}

def classify_app_category(app_or_window: Optional[str]) -> str:
    if not app_or_window:
        return "General"
    low = app_or_window.lower()
    if any(k in low for k in ["code", "visual studio", "pycharm", "intellij", "git", "bash", "terminal", "powershell", "vim", "sublime", "docker", "postman", "cursor"]):
        return "Development"
    elif any(k in low for k in ["slack", "teams", "discord", "zoom", "meet", "skype", "outlook", "gmail", "mail", "telegram", "whatsapp"]):
        return "Communication"
    elif any(k in low for k in ["chrome", "firefox", "edge", "safari", "brave", "opera", "browser"]):
        return "Browsing"
    elif any(k in low for k in ["word", "excel", "powerpoint", "notion", "docs", "sheets", "slides", "figma", "canva", "trello", "jira", "adobe"]):
        return "Productivity"
    elif any(k in low for k in ["break", "idle", "lunch", "coffee", "pause"]):
        return "Break"
    return "General"

@router.post("/heartbeat")
async def record_heartbeat(
    heartbeat: HeartbeatRequest,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    if current_user.role != RoleEnum.EMPLOYEE:
        raise HTTPException(status_code=400, detail="Only employees can send heartbeats")

    emp_result = await db.execute(select(Employee).filter(Employee.user_id == current_user.id))
    employee = emp_result.scalars().first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee profile not found")

    _live_presence_store[employee.id] = {
        "employee_id": employee.id,
        "status": heartbeat.status,
        "window_title": heartbeat.window_title,
        "app_name": heartbeat.app_name,
        "last_heartbeat": datetime.utcnow(),
        "is_tracking": heartbeat.status not in ["TRACKING_STOPPED", "OFFLINE"]
    }
    return {"status": "ok", "employee_id": employee.id}

@router.get("/live", response_model=List[LiveEmployeeStatus])
async def get_live_team_status(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    if current_user.role != RoleEnum.MANAGER:
        raise HTTPException(status_code=403, detail="Only managers can view team live status")

    manager_result = await db.execute(select(Manager).filter(Manager.user_id == current_user.id))
    manager = manager_result.scalars().first()
    if not manager:
        return []

    # Get all employees under this manager
    emp_result = await db.execute(
        select(Employee)
        .options(selectinload(Employee.user))
        .filter(Employee.manager_id == manager.id)
    )
    employees = emp_result.scalars().all()

    now = datetime.utcnow()
    now_date = now.date()
    live_statuses: List[LiveEmployeeStatus] = []

    # Eagerly load all shift assignments
    shifts_res = await db.execute(
        select(ShiftAssignment)
        .options(selectinload(ShiftAssignment.shift))
        .filter(ShiftAssignment.employee_id.in_([e.id for e in employees]))
    ) if employees else None
    assignments_by_emp = {}
    if shifts_res:
        for sa in shifts_res.scalars().all():
            if sa.employee_id and sa.shift:
                assignments_by_emp[sa.employee_id] = sa.shift

    for emp in employees:
        presence = _live_presence_store.get(emp.id, {})
        last_hb = presence.get("last_heartbeat")
        is_online = False
        is_tracking = False
        status_text = "OFFLINE"
        current_app = presence.get("app_name")
        window_title = presence.get("window_title")

        if last_hb and (now - last_hb) < timedelta(seconds=60):
            is_online = True
            is_tracking = presence.get("is_tracking", False)
            status_text = presence.get("status", "ACTIVE")
        elif last_hb and (now - last_hb) < timedelta(minutes=5):
            is_online = True
            status_text = "IDLE"

        # Calculate today's active & idle seconds from ActivitySummary
        summaries_res = await db.execute(
            select(ActivitySummary).filter(
                ActivitySummary.employee_id == emp.id,
                ActivitySummary.timestamp >= datetime.combine(now_date, datetime.min.time())
            )
        )
        today_summaries = summaries_res.scalars().all()
        active_sec = sum(s.active_duration_seconds for s in today_summaries)
        idle_sec = sum(s.idle_duration_seconds for s in today_summaries)
        keys_count = sum(s.keyboard_event_count for s in today_summaries)
        clicks_count = sum(s.mouse_event_count for s in today_summaries)

        total_tracked = active_sec + idle_sec
        focus_score = round((active_sec / total_tracked * 100), 1) if total_tracked > 0 else 100.0

        # Activity Intensity Rating
        if not is_online:
            intensity = "OFFLINE"
        elif status_text == "ON_BREAK":
            intensity = "ON_BREAK"
        elif status_text == "IDLE":
            intensity = "IDLE"
        else:
            recent_inputs = clicks_count + keys_count
            if recent_inputs > 50:
                intensity = "HIGH"
            elif recent_inputs > 20:
                intensity = "MODERATE"
            else:
                intensity = "STEADY"

        category = classify_app_category(window_title or current_app)

        # Shift Progress Calculation
        assigned_shift = assignments_by_emp.get(emp.id)
        shift_name = assigned_shift.name if assigned_shift else None
        shift_start = str(assigned_shift.start_time) if assigned_shift else None
        shift_end = str(assigned_shift.end_time) if assigned_shift else None
        shift_progress = 0.0

        if assigned_shift and assigned_shift.start_time and assigned_shift.end_time:
            try:
                start_h = assigned_shift.start_time.hour
                start_m = assigned_shift.start_time.minute
                end_h = assigned_shift.end_time.hour
                end_m = assigned_shift.end_time.minute
                current_minutes = now.hour * 60 + now.minute
                start_minutes = start_h * 60 + start_m
                end_minutes = end_h * 60 + end_m
                if end_minutes > start_minutes:
                    duration_min = end_minutes - start_minutes
                    elapsed_min = max(0, min(duration_min, current_minutes - start_minutes))
                    shift_progress = round((elapsed_min / duration_min) * 100, 1)
            except Exception:
                shift_progress = 0.0

        live_statuses.append(
            LiveEmployeeStatus(
                employee_id=emp.id,
                employee_name=emp.full_name,
                email=emp.user.email if emp.user else "",
                status=status_text,
                current_app=current_app,
                window_title=window_title,
                is_online=is_online,
                is_tracking=is_tracking,
                last_heartbeat=last_hb,
                today_active_seconds=active_sec,
                today_idle_seconds=idle_sec,
                focus_score_today=focus_score,
                keystrokes_today=keys_count,
                mouse_clicks_today=clicks_count,
                activity_intensity=intensity,
                app_category=category,
                assigned_shift_name=shift_name,
                shift_start_time=shift_start,
                shift_end_time=shift_end,
                shift_progress_percent=shift_progress
            )
        )

    return live_statuses

@router.get("/shifts/history", response_model=List[PastShiftActivityResponse])
async def get_past_shift_activity_history(
    employee_id: Optional[int] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    if current_user.role != RoleEnum.MANAGER and current_user.role != RoleEnum.EMPLOYEE:
        raise HTTPException(status_code=403, detail="Unauthorized")

    manager_id = None
    target_emp_ids = []

    if current_user.role == RoleEnum.MANAGER:
        manager_result = await db.execute(select(Manager).filter(Manager.user_id == current_user.id))
        manager = manager_result.scalars().first()
        if not manager:
            return []
        manager_id = manager.id

        emp_query = await db.execute(select(Employee).options(selectinload(Employee.user)).filter(Employee.manager_id == manager.id))
        emps = emp_query.scalars().all()
        target_emp_ids = [e.id for e in emps]
        if employee_id and employee_id in target_emp_ids:
            target_emp_ids = [employee_id]
    else:
        emp_result = await db.execute(select(Employee).options(selectinload(Employee.user)).filter(Employee.user_id == current_user.id))
        employee = emp_result.scalars().first()
        if not employee:
            return []
        target_emp_ids = [employee.id]

    if not target_emp_ids:
        return []

    # Date filter bounds (default to last 14 days)
    end_d = end_date or date.today()
    start_d = start_date or (end_d - timedelta(days=14))
    start_dt = datetime.combine(start_d, time.min)
    end_dt = datetime.combine(end_d, time.max)

    # Fetch ActivitySummaries with AppUsages
    summaries_res = await db.execute(
        select(ActivitySummary)
        .options(
            selectinload(ActivitySummary.app_usages),
            selectinload(ActivitySummary.employee).selectinload(Employee.user)
        )
        .filter(
            ActivitySummary.employee_id.in_(target_emp_ids),
            ActivitySummary.timestamp >= start_dt,
            ActivitySummary.timestamp <= end_dt
        )
        .order_by(ActivitySummary.timestamp.asc())
    )
    summaries = summaries_res.scalars().all()

    # Load Shift Assignments for target employees
    shifts_res = await db.execute(
        select(ShiftAssignment)
        .options(selectinload(ShiftAssignment.shift))
        .filter(ShiftAssignment.employee_id.in_(target_emp_ids))
    )
    assigned_shifts_map = {sa.employee_id: sa.shift for sa in shifts_res.scalars().all() if sa.shift}

    # Group summaries by (employee_id, day)
    grouped: Dict[tuple, list] = defaultdict(list)
    for s in summaries:
        s_date = s.timestamp.date()
        grouped[(s.employee_id, s_date)].append(s)

    results: List[PastShiftActivityResponse] = []
    session_counter = 1

    for (emp_id, s_date), s_list in grouped.items():
        if not s_list:
            continue

        emp = s_list[0].employee
        emp_name = emp.full_name if emp else f"Employee #{emp_id}"
        emp_email = emp.user.email if emp and emp.user else ""

        assigned_shift = assigned_shifts_map.get(emp_id)
        shift_id = assigned_shift.id if assigned_shift else None
        shift_name = assigned_shift.name if assigned_shift else "Standard Shift"

        first_ts = min(s.timestamp for s in s_list)
        last_ts = max(s.timestamp for s in s_list)
        is_today = s_date == date.today()
        is_ongoing = is_today and (datetime.utcnow() - last_ts) < timedelta(minutes=15)

        active_seconds = sum(s.active_duration_seconds for s in s_list)
        idle_seconds = sum(s.idle_duration_seconds for s in s_list)
        total_seconds = active_seconds + idle_seconds
        mouse_count = sum(s.mouse_event_count for s in s_list)
        key_count = sum(s.keyboard_event_count for s in s_list)

        focus_score = round((active_seconds / total_seconds * 100), 1) if total_seconds > 0 else 100.0
        break_duration = idle_seconds

        # Punctuality calculation
        punctuality = "ON_TIME"
        if assigned_shift and assigned_shift.start_time:
            clock_in_time_val = first_ts.time()
            if clock_in_time_val > (datetime.combine(s_date, assigned_shift.start_time) + timedelta(minutes=15)).time():
                punctuality = "LATE"
            elif assigned_shift.end_time and last_ts.time() > (datetime.combine(s_date, assigned_shift.end_time) + timedelta(minutes=30)).time():
                punctuality = "OVERTIME"

        # App breakdown
        app_time_map: Dict[str, int] = defaultdict(int)
        for s in s_list:
            for au in (s.app_usages or []):
                app_name = au.app_name or "Unknown Application"
                app_time_map[app_name] += au.duration_seconds

        top_apps: List[AppBreakdownItem] = []
        total_app_sec = sum(app_time_map.values()) or total_seconds or 1
        for app_name, sec in sorted(app_time_map.items(), key=lambda x: x[1], reverse=True)[:5]:
            top_apps.append(
                AppBreakdownItem(
                    app_name=app_name,
                    duration_seconds=sec,
                    percentage=round((sec / total_app_sec) * 100, 1),
                    category=classify_app_category(app_name)
                )
            )

        # Hourly timeline breakdown
        hourly_map: Dict[str, dict] = defaultdict(lambda: {"active": 0, "idle": 0})
        for s in s_list:
            hour_str = s.timestamp.strftime("%H:00")
            hourly_map[hour_str]["active"] += s.active_duration_seconds
            hourly_map[hour_str]["idle"] += s.idle_duration_seconds

        timeline = [
            TimelineBucket(
                time_label=h_label,
                active_seconds=h_data["active"],
                idle_seconds=h_data["idle"]
            )
            for h_label, h_data in sorted(hourly_map.items())
        ]

        results.append(
            PastShiftActivityResponse(
                id=session_counter,
                employee_id=emp_id,
                employee_name=emp_name,
                employee_email=emp_email,
                shift_id=shift_id,
                shift_name=shift_name,
                date=s_date.isoformat(),
                clock_in_time=first_ts.strftime("%H:%M:%S"),
                clock_out_time=last_ts.strftime("%H:%M:%S") if not is_ongoing else None,
                is_ongoing=is_ongoing,
                total_duration_seconds=total_seconds,
                active_duration_seconds=active_seconds,
                idle_duration_seconds=idle_seconds,
                break_duration_seconds=break_duration,
                focus_score=focus_score,
                mouse_event_count=mouse_count,
                keyboard_event_count=key_count,
                punctuality_status=punctuality,
                top_applications=top_apps,
                timeline=timeline
            )
        )
        session_counter += 1

    # Sort results by date descending, then employee name
    results.sort(key=lambda x: (x.date, x.employee_name), reverse=True)
    return results

@router.post("/sync")
async def sync_activity(
    sync_req: ActivitySyncRequest,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    if current_user.role != RoleEnum.EMPLOYEE:
        raise HTTPException(status_code=400, detail="Only employees can sync activity")
        
    emp_result = await db.execute(select(Employee).filter(Employee.user_id == current_user.id))
    employee = emp_result.scalars().first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Process each summary
    for summary_in in sync_req.summaries:
        existing = await db.execute(
            select(ActivitySummary).filter(
                ActivitySummary.employee_id == employee.id,
                ActivitySummary.timestamp == summary_in.timestamp
            )
        )
        if existing.scalars().first():
            continue
            
        new_summary = ActivitySummary(
            employee_id=employee.id,
            timestamp=summary_in.timestamp,
            duration_minutes=summary_in.duration_minutes,
            active_duration_seconds=summary_in.active_duration_seconds,
            idle_duration_seconds=summary_in.idle_duration_seconds,
            mouse_event_count=summary_in.mouse_event_count,
            keyboard_event_count=summary_in.keyboard_event_count
        )
        db.add(new_summary)
        await db.flush()
        
        for app_usage in summary_in.app_usages:
            new_app = ApplicationUsage(
                employee_id=employee.id,
                summary_id=new_summary.id,
                app_name=app_usage.app_name,
                window_title=app_usage.window_title,
                duration_seconds=app_usage.duration_seconds
            )
            db.add(new_app)
            
    await db.commit()
    return {"status": "success", "synced": len(sync_req.summaries)}

@router.get("/summaries", response_model=List[ActivitySummaryResponse])
async def get_activity_summaries(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    base_query = select(ActivitySummary).options(
        selectinload(ActivitySummary.app_usages),
        selectinload(ActivitySummary.employee).selectinload(Employee.user)
    ).order_by(ActivitySummary.timestamp.desc())

    if current_user.role == RoleEnum.MANAGER:
        manager_result = await db.execute(select(Manager).filter(Manager.user_id == current_user.id))
        manager = manager_result.scalars().first()
        if not manager:
            return []
        
        emp_query = await db.execute(select(Employee.id).filter(Employee.manager_id == manager.id))
        emp_ids = emp_query.scalars().all()
        if not emp_ids:
            return []
            
        result = await db.execute(base_query.filter(ActivitySummary.employee_id.in_(emp_ids)).limit(100))
        summaries = result.scalars().all()
        
    elif current_user.role == RoleEnum.EMPLOYEE:
        emp_result = await db.execute(select(Employee).filter(Employee.user_id == current_user.id))
        employee = emp_result.scalars().first()
        if not employee:
            return []
        result = await db.execute(base_query.filter(ActivitySummary.employee_id == employee.id).limit(100))
        summaries = result.scalars().all()
    else:
        return []

    res: List[ActivitySummaryResponse] = []
    for s in summaries:
        apps = [
            AppUsageBase(
                app_name=a.app_name,
                window_title=a.window_title,
                duration_seconds=a.duration_seconds
            )
            for a in (s.app_usages or [])
        ]
        res.append(
            ActivitySummaryResponse(
                id=s.id,
                employee_id=s.employee_id,
                timestamp=s.timestamp,
                duration_minutes=s.duration_minutes,
                active_duration_seconds=s.active_duration_seconds,
                idle_duration_seconds=s.idle_duration_seconds,
                mouse_event_count=s.mouse_event_count,
                keyboard_event_count=s.keyboard_event_count,
                app_usages=apps,
                employee_name=s.employee.full_name if s.employee else f"Employee #{s.employee_id}",
                employee_email=s.employee.user.email if s.employee and s.employee.user else ""
            )
        )
    return res


