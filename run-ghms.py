#!/usr/bin/env python3
"""GHMS Server - runs Next.js on port 3000 with auto-restart."""
import subprocess, os, time, signal, sys

os.chdir("/home/z/my-project")
env = os.environ.copy()
env.update({
    "PORT": "3000",
    "HOSTNAME": "::1", 
    "DATABASE_URL": "file:/home/z/my-project/db/custom.db",
    "NODE_ENV": "production",
})

# Write PID for platform supervisor
with open("/home/z/my-project/.zscripts/dev.pid", "w") as f:
    f.write(str(os.getpid()))

signal.signal(signal.SIGTERM, lambda *a: sys.exit(0))
signal.signal(signal.SIGINT, lambda *a: sys.exit(0))

print(f"GHMS Server starting (PID: {os.getpid()})", flush=True)

while True:
    proc = subprocess.Popen(
        ["npx", "next", "start", "-p", "3000"],
        env=env,
        stdout=sys.stdout,
        stderr=sys.stderr,
    )
    proc.wait()
    print(f"Server exited (code={proc.returncode}), restarting in 2s...", flush=True)
    time.sleep(2)