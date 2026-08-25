import time
import threading
import datetime
from pynput import mouse, keyboard
from sync import SyncManager

# Global counters for the current chunk
mouse_events = 0
keyboard_events = 0
active_seconds = 0
idle_seconds = 0
last_input_time = time.time()

import argparse

IDLE_THRESHOLD_SECONDS = 120 # 2 minutes
CHUNK_INTERVAL_SECONDS = 60 # 1 minute chunks for responsive feedback

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

def get_active_window():
    try:
        import sys
        if sys.platform == 'win32':
            import pygetwindow as gw
            window = gw.getActiveWindow()
            return window.title if window else "Desktop"
    except Exception:
        pass
    return "Workspace"

def main():
    global mouse_events, keyboard_events, active_seconds, idle_seconds, last_input_time
    
    parser = argparse.ArgumentParser(description="Employee Activity Tracker Engine")
    parser.add_argument("--token", type=str, default="", help="JWT auth token")
    parser.add_argument("--api-url", type=str, default="http://127.0.0.1:8000/api/v1/activity/sync", help="Backend sync URL")
    parser.add_argument("--interval", type=int, default=CHUNK_INTERVAL_SECONDS, help="Chunk interval in seconds")
    args = parser.parse_args()

    chunk_interval = args.interval or CHUNK_INTERVAL_SECONDS
    sync_manager = SyncManager(token=args.token, api_url=args.api_url)
    
    # Start listeners
    mouse_listener = mouse.Listener(on_move=on_mouse_move, on_click=on_mouse_click)
    keyboard_listener = keyboard.Listener(on_press=on_key_press)
    
    mouse_listener.start()
    keyboard_listener.start()
    
    chunk_start = datetime.datetime.utcnow()
    app_usages = {}

    print("Tracker started. Monitoring activity...")

    try:
        while True:
            time.sleep(1)
            current_time = time.time()
            
            # Determine state
            if current_time - last_input_time > IDLE_THRESHOLD_SECONDS:
                idle_seconds += 1
                active_window = "Idle"
            else:
                active_seconds += 1
                active_window = get_active_window()
                
            # Track app usage
            app_usages[active_window] = app_usages.get(active_window, 0) + 1
            
            # Check if chunk is complete
            if (datetime.datetime.utcnow() - chunk_start).total_seconds() >= chunk_interval:
                # Prepare summary
                summary = {
                    "timestamp": chunk_start.isoformat() + "Z",
                    "duration_minutes": max(1, chunk_interval // 60),
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
        print("Tracker stopping...")
        mouse_listener.stop()
        keyboard_listener.stop()

if __name__ == "__main__":
    main()
