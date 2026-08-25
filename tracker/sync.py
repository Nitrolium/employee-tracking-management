import json
import os
import threading
import time
import requests

BUFFER_FILE = "activity_buffer.json"
DEFAULT_API_URL = "http://127.0.0.1:8000/api/v1/activity/sync"

class SyncManager:
    def __init__(self, token: str = "", api_url: str = DEFAULT_API_URL):
        self.token = token
        self.api_url = api_url or DEFAULT_API_URL
        self.buffer = []
        self.load_buffer()
        
        # Start background sync thread
        self.sync_thread = threading.Thread(target=self._sync_loop, daemon=True)
        self.sync_thread.start()
        
    def load_buffer(self):
        if os.path.exists(BUFFER_FILE):
            try:
                with open(BUFFER_FILE, "r") as f:
                    self.buffer = json.load(f)
            except Exception:
                self.buffer = []
                
    def save_buffer(self):
        with open(BUFFER_FILE, "w") as f:
            json.dump(self.buffer, f)
            
    def enqueue(self, summary):
        self.buffer.append(summary)
        self.save_buffer()
        
    def _sync_loop(self):
        while True:
            time.sleep(15) # Check for sync every 15 seconds
            if not self.buffer:
                continue
                
            # Copy buffer for this sync attempt
            to_sync = self.buffer.copy()
            payload = {"summaries": to_sync}
            
            try:
                headers = {"Authorization": f"Bearer {self.token}"} if self.token else {}
                response = requests.post(self.api_url, json=payload, headers=headers, timeout=10)
                
                if response.status_code == 200:
                    # Sync successful, remove synced items from buffer
                    self.buffer = [item for item in self.buffer if item not in to_sync]
                    self.save_buffer()
                    print(f"Successfully synced {len(to_sync)} summaries.")
                else:
                    print(f"Sync failed with status: {response.status_code} - {response.text}")
            except requests.RequestException as e:
                print(f"Network error during sync: {e}. Will retry later.")
