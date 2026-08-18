import json
import os
import threading
import time
import requests

BUFFER_FILE = "activity_buffer.json"
API_URL = "http://localhost:8000/api/v1/activity/sync"
TOKEN = "dummy-token"  # In a real app, this is passed from Electron via CLI args or IPC

class SyncManager:
    def __init__(self):
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
            time.sleep(60) # Try syncing every 60 seconds
            if not self.buffer:
                continue
                
            # Copy buffer for this sync attempt
            to_sync = self.buffer.copy()
            payload = {"summaries": to_sync}
            
            try:
                headers = {"Authorization": f"Bearer {TOKEN}"}
                response = requests.post(API_URL, json=payload, headers=headers, timeout=10)
                
                if response.status_code == 200:
                    # Sync successful, remove synced items from buffer
                    self.buffer = [item for item in self.buffer if item not in to_sync]
                    self.save_buffer()
                    print(f"Successfully synced {len(to_sync)} summaries.")
                else:
                    print(f"Sync failed with status: {response.status_code}")
            except requests.RequestException as e:
                print(f"Network error during sync: {e}. Will retry later.")
