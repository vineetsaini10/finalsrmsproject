import time
import requests
import os
import subprocess
from pathlib import Path

class ReliabilityMonitor:
    def __init__(self, check_interval=60):
        self.services = [
            {"name": "Backend", "url": "http://localhost:5000/health", "restart_cmd": "npm run dev", "cwd": "backend"},
            {"name": "AIML Service", "url": "http://localhost:8000/health", "restart_cmd": "python main.py", "cwd": "aiml"}
        ]
        self.check_interval = check_interval
        self.log_file = Path("logs/reliability.log")
        self.log_file.parent.mkdir(exist_ok=True)

    def log_event(self, message):
        timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
        with open(self.log_file, "a") as f:
            f.write(f"[{timestamp}] {message}\n")
        print(f"[{timestamp}] {message}")

    def check_health(self, service):
        try:
            response = requests.get(service["url"], timeout=5)
            if response.status_code == 200:
                return True
            else:
                self.log_event(f"Service {service['name']} returned status {response.status_code}")
                return False
        except Exception as e:
            self.log_event(f"Service {service['name']} connection failed: {e}")
            return False

    def attempt_restart_docker(self, service_name):
        """Attempts to restart the service using docker-compose if available."""
        try:
            # This assumes we are running in an environment with docker-compose
            subprocess.run(["docker-compose", "restart", service_name.lower().replace(" ", "")], check=True)
            self.log_event(f"Docker restart command issued for {service_name}")
            return True
        except Exception as e:
            self.log_event(f"Docker restart failed for {service_name}: {e}")
            return False

    def run_monitor(self):
        self.log_event("Starting Reliability Monitor...")
        while True:
            for service in self.services:
                if not self.check_health(service):
                    self.log_event(f"ALERT: {service['name']} IS DOWN!")
                    # In a real environment, we would trigger auto-fix here
                    self.attempt_restart_docker(service['name'])
                else:
                    self.log_event(f"{service['name']} is healthy.")

            time.sleep(self.check_interval)

if __name__ == "__main__":
    monitor = ReliabilityMonitor(check_interval=30)
    monitor.run_monitor()
