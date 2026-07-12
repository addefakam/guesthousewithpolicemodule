#!/bin/bash
cd /home/z/my-project
export NODE_OPTIONS="--max-old-space-size=256"
export HOSTNAME=0.0.0.0

while true; do
  npx next start -p 3000 2>/dev/null
  EXIT_CODE=$?
  echo "$(date): Server exited with code $EXIT_CODE, restarting in 2s..." >> /tmp/ghms-keepalive.log
  sleep 2
done