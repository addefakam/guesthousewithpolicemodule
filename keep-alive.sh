#!/bin/bash
while true; do
  cd /home/z/my-project
  HOSTNAME=0.0.0.0 DATABASE_URL="file:/home/z/my-project/db/custom.db" node .next/standalone/server.js 2>&1
  echo "[$(date)] Server exited, restarting in 1s..." >> /home/z/my-project/server.log
  sleep 1
done
