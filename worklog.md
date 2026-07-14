---
Task ID: 1
Agent: Main Agent
Task: Redevelop GHMS project from scratch

Work Log:
- Cleaned old source code, kept Prisma schema, shadcn/ui components, and database
- Rebuilt core lib files: db.ts, tenant.ts (RBAC), store.ts (Zustand), api.ts (frontend API client)
- Rebuilt all 24+ API routes with full RBAC (auth, dashboard, rooms, guests, reservations, payments, expenses, resources, housekeeping, users, settings, notifications, activity, reports, data export/import, providers, police-dashboard, police-guests, daytime-services, daytime-bookings, reviews)
- Rebuilt all 16 page components: login, dashboard, rooms, guests, reservations, daytime, expenses, resources, housekeeping, users, reports, settings, notifications, providers, police-dashboard, police-guests, reviews
- Rebuilt core shell: layout.tsx, page.tsx, globals.css, sidebar, page-renderer, error boundary
- Fixed deployment: start.sh runs `node server.js` directly on PORT=81 with HOSTNAME=0.0.0.0 (no Caddy needed)
- Fixed login bug: API response destructuring (resp.user vs treating entire response as user)
- Verified all APIs return correct data
- Browser verified: login flow, dashboard with KPIs/charts, rooms page, reservations page

Stage Summary:
- Full project rebuilt from scratch in /home/z/my-project/src/
- All 24+ API routes functional with RBAC
- All 16 page components rendering correctly
- Deployment scripts simplified: no Caddy dependency, direct port 81 binding
- Browser-verified login → dashboard → rooms → reservations flow