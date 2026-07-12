#!/usr/bin/env python3
"""Persistent server runner - keeps Next.js alive via Python process supervision."""
import subprocess
import sys
import os
import time
import signal

os.chdir("/home/z/my-project")
env = os.environ.copy()
env["PORT"] = "3000"
env["HOSTNAME"] = "::1"
env["DATABASE_URL"] = "file:/home/z/my-project/db/custom.db"
env["NODE_ENV"] = "production"

def run_server():
    while True:
        print(f"[{time.strftime('%H:%M:%S')}] Starting Next.js server on port 3000 (IPv6 ::1)...")
        proc = subprocess.Popen(
            ["npx", "next", "start", "-p", "3000"],
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
        )
        # Stream output
        for line in proc.stdout:
            print(line.decode(), end="", flush=True)
        proc.wait()
        print(f"[{time.strftime('%H:%M:%S')}] Server exited with code {proc.returncode}. Restarting in 3s...")
        time.sleep(3)

if __name__ == "__main__":
    run_server()