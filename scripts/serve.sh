#!/bin/bash
cd /home/z/my-project
while true; do
  PORT=3000 HOSTNAME=:: npx next start 2>/tmp/ghms-err.log
  sleep 1
done
