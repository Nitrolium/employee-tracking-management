import os
import sys
import time
import threading
import datetime
import argparse
import requests

# Ensure tracker directory is on Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sync import SyncManager

# Global counters for current chunk
mouse_events = 0
keyboard_events = 0
active_seconds = 0
idle_seconds = 0
last_input_time = time.time()

IDLE_THRESHOLD_SECONDS = 120 # 2 minutes before classifying as idle
CHUNK_INTERVAL_SECONDS = 30 # 30 second chunks for responsive feedback

def on_mouse_move(x, y):
    global mouse_events, last_input_time
    mouse_events += 1
    last_input_time = time.time()

def on_mouse_click(x, y, button, pressed):
    global mouse_events, last_input_time
    mouse_events += 1
    last_input_time = time.time()

def on_key_press(key):
    global keyboard_events, last_input_time
    keyboard_events += 1
    last_input_time = time.time()

def get_active_window_info():
    """Retrieve the current active window title and application name on Windows."""
    title = "Desktop Workspace"
    app_name = "Desktop"
    try:
        if sys.platform == 'win32':
            import pygetwindow as gw
            window = gw.getActiveWindow()
            if window and window.title:
                title = window.title.strip()
                if " - " in title:
                    parts = title.split(" - ")
                    app_name = parts[-1].strip()
                else:
                    app_name = title
            else:
                title = "Desktop Workspace"
                app_name = "Workspace"
    except Exception:
        pass
    return app_name, title

def send_heartbeat(api_url: str, token: str, status: str, app_name: str, window_title: str, active_sec: int, idle_sec: int):
    try:
        hb_url = api_url.replace("/sync", "/heartbeat")
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"} if token else {}
        requests.post(
            hb_url,
            json={
                "status": status,
                "app_name": app_name,
                "window_title": window_title,
                "active_seconds": active_sec,
                "idle_seconds": idle_sec
            },
            headers=headers,
            timeout=4
        )
    except Exception:
        pass

def main():
    global mouse_events, keyboard_events, active_seconds, idle_seconds, last_input_time
    
    parser = argparse.ArgumentParser(description="Employee Activity Tracker Engine")
    parser.add_argument("--token", type=str, default="", help="JWT auth token")
    parser.add_argument("--api-url", type=str, default="http://127.0.0.1:8000/api/v1/activity/sync", help="Backend sync URL")
    parser.add_argument("--interval", type=int, default=CHUNK_INTERVAL_SECONDS, help="Chunk interval in seconds")
    args = parser.parse_args()

    chunk_interval = args.interval or CHUNK_INTERVAL_SECONDS
    sync_manager = SyncManager(token=args.token, api_url=args.api_url)
    
    # Start input listeners
    try:
        from pynput import mouse, keyboard
        mouse_listener = mouse.Listener(on_move=on_mouse_move, on_click=on_mouse_click)
        keyboard_listener = keyboard.Listener(on_press=on_key_press)
        mouse_listener.start()
        keyboard_listener.start()
    except Exception as e:
        print(f"Warning: Could not start pynput listeners ({e}). Running in window tracking mode.")
        mouse_listener = None
        keyboard_listener = None
    
    chunk_start = datetime.datetime.utcnow()
    app_usages = {}
    last_heartbeat_time = 0

    print("Tracker engine started. Monitoring active window and inputs...")

    try:
        while True:
            time.sleep(1)
            current_time = time.time()
            
            # Determine state
            if current_time - last_input_time > IDLE_THRESHOLD_SECONDS:
                idle_seconds += 1
                app_name = "Idle"
                window_title = "User Inactive / Idle"
                status = "IDLE"
            else:
                active_seconds += 1
                app_name, window_title = get_active_window_info()
                status = "ACTIVE"
                
            # Track app usage
            app_key = app_name or "Desktop"
            app_usages[app_key] = app_usages.get(app_key, 0) + 1

            # Heartbeat every 8 seconds
            if current_time - last_heartbeat_time >= 8:
                last_heartbeat_time = current_time
                threading.Thread(
                    target=send_heartbeat,
                    args=(args.api_url, args.token, status, app_name, window_title, 8 if status == "ACTIVE" else 0, 8 if status == "IDLE" else 0),
                    daemon=True
                ).start()
            
            # Check if chunk interval is complete
            if (datetime.datetime.utcnow() - chunk_start).total_seconds() >= chunk_interval:
                summary = {
                    "timestamp": chunk_start.isoformat() + "Z",
                    "duration_minutes": max(1, int(chunk_interval // 60)),
                    "active_duration_seconds": active_seconds,
                    "idle_duration_seconds": idle_seconds,
                    "mouse_event_count": mouse_events,
                    "keyboard_event_count": keyboard_events,
                    "app_usages": [
                        {"app_name": title, "duration_seconds": duration}
                        for title, duration in app_usages.items()
                    ]
                }
                
                # Enqueue for syncing
                sync_manager.enqueue(summary)
                
                # Reset counters
                mouse_events = 0
                keyboard_events = 0
                active_seconds = 0
                idle_seconds = 0
                app_usages = {}
                chunk_start = datetime.datetime.utcnow()
                
    except KeyboardInterrupt:
        print("Tracker engine stopping...")
        if mouse_listener:
            mouse_listener.stop()
        if keyboard_listener:
            keyboard_listener.stop()

if __name__ == "__main__":
    main()

