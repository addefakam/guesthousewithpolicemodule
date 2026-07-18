---
Task ID: 1
Agent: Main Agent
Task: Add suspected persons registration and automatic alert system for police module

Work Log:
- Explored existing codebase: schema, API routes, tenant auth, police pages, sidebar, page renderer
- Added SuspectSeverity enum + SuspectedPerson model + SuspectMatch model to Prisma schema
- Ran prisma generate + db push successfully
- Created /src/lib/suspect-check.ts - background matching utility (matches by name, last name, phone, ID number)
- Created /api/suspected-persons/route.ts - GET (list+search) + POST (create) - police only
- Created /api/suspected-persons/[id]/route.ts - GET (with match history) + PUT (update) + DELETE
- Created /api/suspect-matches/route.ts - GET (list with unread count) + PUT (mark read/mark all read)
- Injected suspect-check calls into reservation POST, guest POST, daytime-booking POST (fire-and-forget)
- Created suspect-alerts-page.tsx - mobile-responsive alert viewer with full detail dialogs
- Created suspected-persons-page.tsx - full CRUD management (add/edit/delete/deactivate/search/history)
- Updated police-dashboard-page.tsx to show unread alert count KPI card
- Updated sidebar with ShieldAlert + UserX icons and 2 new nav items for police
- Updated page-renderer.tsx with lazy-loaded pages
- Updated api.ts with 6 new API functions
- Build passed, pushed to GitHub, Vercel will auto-deploy

Stage Summary:
- 14 files changed, 1736 insertions
- New features: Suspected Persons registry, automatic matching alerts, full police UI
- All APIs are police-only (requirePolice guard)
- Matching runs silently in background, never breaks normal operations
- Other users (superuser/operator/staff) cannot see suspected persons or matches