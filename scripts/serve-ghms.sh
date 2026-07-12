#!/bin/bash
# Keep-alive script for GHMS Next.js server
cd /home/z/my-project
while true; do
  echo "$(date): Starting GHMS server..."
  HOSTNAME=0.0.0.0 npx next start -p 3000 2>&1 &
  SERVER_PID=$!
  echo "$(date): Server PID=$SERVER_PID"
  # Wait for process to exit
  wait $SERVER_PID 2>/dev/null
  echo "$(date): Server exited, restarting in 3s..."
  sleep 3
done