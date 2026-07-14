---
Task ID: 2
Agent: Main Agent
Task: Fix production deployment 500 errors

Work Log:
- Diagnosed that the old approach (writing absolute DB path to .env at runtime) could fail in publish container
- Restructured build: database now copied INSIDE next-service-dist/db/custom.db
- .env now uses RELATIVE path (file:db/custom.db) — no runtime write needed
- server.js does process.chdir(__dirname), so relative path resolves correctly
- Simplified start.sh: no .env writing, no SCRIPT_DIR calculation, just cd + run
- Added runtime auto-detection (node vs bun) in start.sh
- Added images.unoptimized: true to next.config.ts (eliminates sharp native dependency)
- Tested production build with BOTH node and bun — all 200s
- Tested: root page 200, favicon 200, auth API works, dashboard API works

Stage Summary:
- Key fix: DB path is now relative, .env is baked into build, no runtime filesystem writes needed
- start.sh simplified from 60 lines to 30 lines
- build.sh restructured to put db/ inside next-service-dist/
- Production build verified: page 200, favicon 200, all APIs functional