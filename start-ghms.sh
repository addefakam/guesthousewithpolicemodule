#!/bin/bash
cd /home/z/my-project
export HOSTNAME=0.0.0.0
export NODE_OPTIONS="--max-old-space-size=384"
exec node node_modules/next/dist/bin/next start -p 3000
