---
Task ID: 3
Agent: Main Agent
Task: Implement Guest Communication, Group Booking Management, and Staff Activity Log features

Work Log:
- Updated Prisma schema: added GroupBooking, StaffLog, MessageTemplate, MessageLog models + 3 new enums
- Updated init-db.ts: added new enums, 4 CREATE TABLE statements, 7 foreign keys, migration for groupBookingId column, 17 indexes
- Generated Prisma client successfully
- Created /src/lib/staff-log.ts: fire-and-forget staff activity logger with getLogUserInfo helper
- Wired staff logging into checkin and checkout API endpoints
- Created 7 new API routes: group-bookings (GET/POST), group-bookings/[id] (GET/PUT/DELETE), staff-logs (GET), messages/templates (GET/POST), messages/templates/[id] (PUT/DELETE), messages/send (POST), messages/bulk-send (POST), messages/logs (GET)
- Added 11 new API client functions to api.ts
- Built 3 complete frontend pages: staff-logs-page.tsx, group-bookings-page.tsx, guest-communication-page.tsx
- Registered 3 new pages in sidebar (ALL_NAV_ITEMS + PERMISSION_PAGE_MAP) and page-renderer (lazy imports + PAGE_MAP)
- Fixed TypeScript compilation errors - all new files compile cleanly

Stage Summary:
- 3 new database tables: GroupBooking, StaffLog, MessageTemplate, MessageLog
- 7 new API endpoints with full CRUD operations
- 3 new sidebar navigation items: Group Bookings, Messages, Staff Activity
- 4 default message templates auto-seeded: Check-in Reminder, Welcome, Check-out Reminder, Reservation Confirmation
- Bulk SMS/WhatsApp send capability (simulated - needs external API integration)
- Staff activity auto-logged on checkin and checkout operations
- All new TypeScript files compile with zero errors

---
Task ID: 4
Agent: Main Agent
Task: Implement Notification Dispatch System for Police and Admin modules

Work Log:
- Updated ensure-tables.ts: added BroadcastPriority enum, NotificationBroadcast table, telegramChatId column on Provider
- Created /api/messages/broadcast/route.ts (GET): returns list of approved providers with contact info for broadcast targeting
- Created /api/notifications/broadcast/route.ts (GET/POST): broadcast history + send broadcast to all/selected providers
- Broadcast API supports 4 channels: In-App Notification, SMS, WhatsApp, Telegram
- Broadcast API supports 4 priority levels: LOW, NORMAL, HIGH, URGENT
- In-App channel creates real Notification records for all active users of each provider
- SMS/WhatsApp/Telegram channels are logged in NotificationBroadcast (external API integration needed for actual delivery)
- Added 3 API client functions: apiGetBroadcastProviders, apiSendBroadcast, apiGetBroadcastHistory
- Added 'notification-dispatch' to POLICE_NAV_ITEMS and SUPERUSER_NAV_ITEMS in sidebar.tsx
- Added Megaphone icon import to sidebar.tsx
- Added 'notification-dispatch' to police permissions for ADMIN, DETECTIVE, OFFICER ranks (not VIEWER)
- Built notification-dispatch-page.tsx: full compose form + provider selection + broadcast history with pagination
- Registered 'notification-dispatch' in page-renderer.tsx (lazy import + PAGE_MAP)

Stage Summary:
- New NotificationBroadcast table tracks all broadcast dispatches with delivery stats
- Police (OFFICER+) and Admin/Superuser can send broadcasts to all or selected providers
- Police VIEWER rank can view history but cannot send (read-only)
- 4 delivery channels: In-App (working), SMS/WhatsApp/Telegram (logged, need external API integration)
- 4 priority levels with visual indicators (LOW/NORMAL/HIGH/URGENT)
- Channel availability warnings shown in UI (e.g., '3 of 10 providers have Telegram configured')
- Provider list shows contact capabilities (phone, telegram, in-app user count)
- Broadcast history with pagination, delivery stats (sent/failed), and filter by date---
Task ID: 1
Agent: main
Task: Fix subscription tables not created on existing databases

Work Log:
- Identified root cause: init-db.ts skipped TABLES_SQL when User table already existed
- Subscription, SubscriptionPayment, SubscriptionPlan tables were only in TABLES_SQL
- On existing production DB, init-db ran only MIGRATIONS_SQL + INDEXES_SQL, skipping table creation
- Fixed both Strategy 1 (pg) and Strategy 2 (Prisma fallback) to always run TABLES_SQL + FKS_SQL
- Added SubscriptionPlan seeding to the existing-DB path
- Improved error message in my-subscription-page.tsx to show actual error
- Pushed fix to GitHub

Stage Summary:
- Root cause: init-db.ts optimization skipped new table creation on existing DBs
- Fix: Run all SQL blocks (TABLES, FKS, MIGRATIONS, INDEXES) since they use IF NOT EXISTS
- Committed as 8135cff and pushed to main
- Vercel will auto-deploy; subscription should work after redeployment
---
Task ID: 2
Agent: main
Task: Fix execViaPrisma DO block compatibility with Prisma

Work Log:
- Identified that Prisma $executeRawUnsafe cannot execute DO $$ ... END $$ PL/pgSQL blocks
- On Vercel, pg native module fails, falling back to Prisma path
- All ALTER TABLE ADD COLUMN/CONSTRAINT migrations used DO blocks with EXCEPTION handlers
- These silently failed, so configJson and other columns were never added
- Rewrote execViaPrisma with extractStatements() that unwraps DO blocks via regex
- Inner SQL runs individually; duplicate errors caught at JS level
- Tested regex against ENUMS, MIGRATIONS, FKS, and mixed SQL patterns
- Pushed as commit 83adb96

Stage Summary:
- Root cause: Prisma driver cannot execute anonymous PL/pgSQL DO blocks
- Fix: extractStatements() parses DO blocks, extracts inner SQL, runs individually
- This fixes configJson missing column AND all previous/future column migrations
- Vercel will auto-deploy; subscription should work after redeployment
---
Task ID: 3
Agent: main
Task: Fix warm instance schema staleness on Vercel

Work Log:
- Identified that Vercel warm instances cache _initDone=true from old code
- New deployments don’t re-run migrations on warm instances
- Rewrote db.ts with withSchemaRetry() wrapper around all Prisma calls
- Detects schema errors: "column does not exist", "relation does not exist", etc.
- On schema error: resets init flag, re-runs migrations, retries query once
- Added resetInitFlag() export to init-db.ts
- Guard against concurrent migration runs with _migrating flag
- Pushed as commit d73d1d6

Stage Summary:
- Root cause: _initDone=true cached in warm serverless instances
- Fix: db.ts auto-detects schema errors and triggers migration re-run
- Self-healing: any missing column/table gets fixed on first failed request
- No more dependency on cold starts for schema updates

---
Task ID: 5
Agent: Main Agent
Task: Integrate Chapa payment gateway for automated subscription payments

Work Log:
- Created .env.local with CHAPA_SECRET_KEY (test key provided by user) and NEXT_PUBLIC_APP_URL
- Created src/lib/chapa.ts: Chapa REST API client with initializePayment(), verifyPayment(), tx_ref generator, URL builders
- Created POST /api/my-subscription/pay/chapa/route.ts: initializes Chapa checkout, creates pending SubscriptionPayment with [CHAPA PENDING] tag, notifies superuser
- Created POST /api/chapa/webhook/route.ts: receives Chapa webhook (charge.completed), double-verifies via API, updates payment record [CHAPA VERIFIED], extends subscription dates, notifies superuser
- Updated my-subscription-page.tsx: added "Pay Online (Chapa)" as first payment method with Zap icon, violet color scheme; when Chapa selected, hides manual fields (ref/notes), shows redirect info box; on return from Chapa (?chapa=success), shows processing banner and re-fetches; payment history shows Chapa Pending/Verified badges
- Updated super-system-config-page.tsx: Payment Method dropdown now shows "Manual (Offline)" and "Chapa (Online - Telebirr, CBE Birr, Cards)"
- Updated middleware.ts: relaxed rate limit for /api/chapa/webhook (100/min) since it's called by Chapa servers
- Updated api.ts: added apiInitiateChapaPayment() helper function
- Wrapped MySubscriptionPage in Suspense boundary for useSearchParams compatibility
- All Chapa files compile with zero TypeScript errors

Stage Summary:
- Chapa test key configured: CHASECK_TEST-jQ3TLojglKnKzICUO9dq5lsiy1G7mXCq
- Payment flow: Operator clicks plan → selects "Pay Online (Chapa)" → redirected to Chapa checkout → pays via Telebirr/CBE Birr/card → Chapa webhook auto-verifies → subscription extended
- 4 new files: chapa.ts, pay/chapa/route.ts, webhook/route.ts, .env.local
- 4 modified files: my-subscription-page.tsx, super-system-config-page.tsx, middleware.ts, api.ts
- Webhook is public (no JWT required) — Chapa calls it server-to-server
- Pending payments tracked with [CHAPA PENDING] tag, verified with [CHAPA VERIFIED] tag
- Superuser gets notification on both initiation and verification

---
Task ID: 6
Agent: Main Agent
Task: Make nationality & ID type required on guest registration + validate all phone/email per standard

Work Log:
- Created shared validation utilities in src/lib/utils.ts: isValidPhone() (E.164, 7-15 digits), isValidEmail() (RFC 5322 simplified)
- Made nationality & ID Type required fields in guests-page.tsx: added red asterisk labels + validation in handleSave
- Made nationality & ID Type required in reservations-page.tsx inline guest form: labels + step1Valid + handleCreate validation
- Added phone validation (isValidPhone) to all form submit handlers: guests, reservations, group bookings, login/register, settings
- Added email validation (isValidEmail) to all form submit handlers where email is collected
- Added type="tel" to 12 phone inputs that were missing it (all except settings-page which already had it)
- Updated backend API validation: guests/route.ts POST (phone, email, nationality, idType), guests/[id]/route.ts PUT (phone, email), settings/route.ts PUT (phone, email)
- Backend validation returns 400 with descriptive error messages

Files modified (14 total):
- src/lib/utils.ts — added isValidPhone, isValidEmail
- src/components/ghms/pages/guests-page.tsx — required labels + validation + type=tel
- src/components/ghms/pages/reservations-page.tsx — required labels + validation + type=tel + step1Valid
- src/components/ghms/pages/group-bookings-page.tsx — validation + type=tel on 3 phone inputs
- src/components/ghms/login-page.tsx — phone/email validation + type=tel
- src/components/ghms/pages/providers-page.tsx — type=tel
- src/components/ghms/pages/super-profile-page.tsx — type=tel
- src/components/ghms/pages/super-user-management-page.tsx — type=tel
- src/components/ghms/pages/suspected-persons-page.tsx — type=tel
- src/components/ghms/pages/daytime-page.tsx — type=tel
- src/components/ghms/pages/accommodation-guests-page.tsx — type=tel
- src/components/ghms/pages/settings-page.tsx — phone/email validation
- src/app/api/guests/route.ts — backend phone/email/nationality/idType validation
- src/app/api/guests/[id]/route.ts — backend phone/email validation on update
- src/app/api/settings/route.ts — backend phone/email validation

Stage Summary:
- Nationality and ID Type are now required (red asterisk) on all guest registration forms
- All phone numbers validated: 7-15 digits, international format with optional + prefix
- All email addresses validated: standard user@domain.tld format (only when provided)
- All 14 phone inputs now use type="tel" for mobile numeric keyboard
- Frontend + backend双重验证 (dual-layer validation)
- No new TypeScript errors introduced
---
Task ID: 1
Agent: main
Task: Update superuser Register Guesthouse form to match login page self-registration and add bulk import from Excel

Work Log:
- Examined login-page.tsx self-registration form (fields: Full Name, Phone, Email, GH Name, Type, License No, License Upload, Sub-City, Woreda, Username, Password)
- Examined providers-page.tsx superuser registration dialog (was missing: Sub-City, Woreda, had fewer type options, email was optional)
- Updated RegisterForm interface to add subCity and woreda fields
- Updated GUESTHOUSE_TYPES to match login page (added HOMESTAY, DHARAMSHALA, OTHER; removed HOSTEL)
- Added SUB_CITY_WOREDAS constant for Bishoftu sub-cities
- Completely rewrote registration dialog with 4 sections matching login page: Contact Information, Guest House Details, Location, Desired Login Credentials
- Made email, type, license no, sub-city, woreda all required (with red asterisk)
- Changed type selection from button group to Select dropdown
- Added Sub-City/Woreda cascading dropdowns
- Updated validation in handleRegister to require all fields + validate email
- Added bulk import feature: Bulk Import button, 3-step dialog (download template, upload file, preview data)
- Template download generates .xlsx with headers and 2 example rows
- File upload parses Excel with xlsx library, validates all rows (phone, email, type, sub-city/woreda mapping)
- Preview table shows data before import with validation error display
- Created API endpoint /api/providers/bulk-import for server-side import (max 100 records, duplicate username check, per-row error tracking)
- Added apiSuperBulkImportProviders to api.ts
- Fixed TypeScript compilation errors (missing comment bracket, auth.userName vs username)

Stage Summary:
- Modified: src/components/ghms/pages/providers-page.tsx (registration form redesigned + bulk import UI)
- Modified: src/lib/api.ts (added apiSuperBulkImportProviders)
- Created: src/app/api/providers/bulk-import/route.ts (bulk import API endpoint)
- All TypeScript checks pass for modified files
