#!/bin/bash
# GHMS Server - persistent with keepalive
cd /home/z/my-project

while true; do
  HOSTNAME=0.0.0.0 NODE_OPTIONS="--max-old-space-size=384" \
    node node_modules/next/dist/bin/next start -p 3000 2>/tmp/next-err.log
  
  echo "$(date): Server exited, restarting in 2s..." >> /tmp/ghms.log
  sleep 2
done