import json
import os
import sys
import threading
import time
import requests

BUFFER_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "activity_buffer.json")
DEFAULT_API_URL = "http://127.0.0.1:8000/api/v1/activity/sync"

class SyncManager:
    def __init__(self, token: str = "", api_url: str = DEFAULT_API_URL):
        self.token = token
        self.api_url = api_url or DEFAULT_API_URL
        self.buffer = []
        self.lock = threading.Lock()
        self.load_buffer()
        
        # Start background sync thread
        self.sync_thread = threading.Thread(target=self._sync_loop, daemon=True)
        self.sync_thread.start()
        
    def load_buffer(self):
        with self.lock:
            if os.path.exists(BUFFER_FILE):
                try:
                    with open(BUFFER_FILE, "r", encoding="utf-8") as f:
                        self.buffer = json.load(f)
                except Exception:
                    self.buffer = []
                    
    def save_buffer(self):
        with self.lock:
            try:
                with open(BUFFER_FILE, "w", encoding="utf-8") as f:
                    json.dump(self.buffer, f)
            except Exception as e:
                print(f"Error saving buffer: {e}")
            
    def enqueue(self, summary):
        with self.lock:
            self.buffer.append(summary)
        self.save_buffer()
        print(f"Enqueued summary chunk. Total pending in buffer: {len(self.buffer)}")
        # Trigger immediate sync attempt in separate thread
        threading.Thread(target=self.sync_now, daemon=True).start()
        
    def sync_now(self):
        with self.lock:
            if not self.buffer:
                return
            to_sync = list(self.buffer)

        payload = {"summaries": to_sync}
        try:
            headers = {"Authorization": f"Bearer {self.token}", "Content-Type": "application/json"} if self.token else {}
            response = requests.post(self.api_url, json=payload, headers=headers, timeout=10)
            
            if response.status_code == 200:
                with self.lock:
                    self.buffer = [item for item in self.buffer if item not in to_sync]
                self.save_buffer()
                print(f"Successfully synced {len(to_sync)} activity summaries to backend.")
            else:
                print(f"Sync response: {response.status_code} - {response.text}")
        except Exception as e:
            print(f"Sync connection note: {e}. Will retry automatically.")
            
    def _sync_loop(self):
        while True:
            time.sleep(15)
            if self.buffer:
                self.sync_now()
