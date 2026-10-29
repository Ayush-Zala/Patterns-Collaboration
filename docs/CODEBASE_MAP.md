# Codebase Map

This file captures the current frontend-backend wiring for the shared inbox app so future work can recover context quickly when chat context is limited.

## High-Level Architecture

- Backend app: Express + Prisma + Socket.IO in `src/`
- Frontend app: Next.js App Router in `frontend/`
- Shared persistence contract: Prisma schema in `prisma/schema.prisma`
- Backend can run in:
  - `database` mode via `DatabaseStore`
  - `memory` mode via `InMemoryStore`

Core backend bootstrap:

- `src/server.js`
- `src/app.js`
- `src/config.js`

Core frontend app shell:

- `frontend/app/(app)/layout.tsx`
- `frontend/app/page.tsx`

## Backend Structure

### Request pipeline

1. `src/server.js` boots the HTTP server, Socket.IO server, store, lock manager, and services.
2. `src/app.js` mounts middleware and routes.
3. `src/middleware/authContext.js` reads header-based auth context:
   - `x-user-id`
   - `x-org-id`
   - optional `x-user-role`
4. `req.auth` is used by routes and services for authorization decisions.

### Main backend services

- `src/services/threadService.js`
  - thread listing/detail
  - assignment
  - draft save/lock/release
  - replies
  - internal comments
  - realtime broadcasts

- `src/services/emailSyncService.js`
  - Gmail watch startup
  - Gmail history pull sync
  - Gmail push webhook processing
  - converts provider data into inbound thread/message ingestion

- `src/services/authService.js`
  - Gmail OAuth start/callback
  - mock OAuth for other providers
  - token refresh logic

- `src/services/delegationAccess.js`
  - determines access scope for non-admin users
  - resolves accessible inbox IDs and channel IDs
  - central enforcement helper for delegation-based visibility

### Main backend routes

- `src/routes/threadRoutes.js`
- `src/routes/channelRoutes.js`
- `src/routes/inboxRoutes.js`
- `src/routes/delegationRoutes.js`
- `src/routes/authRoutes.js`
- `src/routes/ruleRoutes.js`
- `src/routes/templateRoutes.js`
- `src/routes/signatureRoutes.js`
- `src/routes/activityRoutes.js`
- `src/routes/commentRoutes.js`
- `src/routes/webhookRoutes.js`

## Frontend Structure

### Frontend app shell

- `frontend/app/(app)/layout.tsx`
  - loads Better Auth session
  - redirects unauthenticated users to sign-in
  - calls `ensureOrgMembership` so the user has an active workspace organization

- `frontend/components/app-sidebar.tsx`
  - primary navigation for settings/resources/automation

### Frontend auth layer

- `frontend/lib/auth.ts`
  - Better Auth server config
  - Prisma adapter
  - organization plugin

- `frontend/lib/auth-client.ts`
  - Better Auth client hooks

- `frontend/lib/auth-session.ts`
  - request session helpers for Next route handlers

- `frontend/lib/auth-roles.ts`
  - app role normalization

- `frontend/lib/ensure-org-membership.ts`
  - ensures the signed-in user belongs to an active Better Auth organization

## Frontend -> Backend Proxy Layer

Most product UI does not call the Express backend directly. It usually calls a Next route in `frontend/app/api/**`, and that route forwards the request to the backend.

Core proxy helpers:

- `frontend/lib/backend-proxy.ts`

Important behavior:

- backend base URL comes from `BACKEND_API_URL`
- proxy forwards:
  - `x-user-id`
  - optional `x-org-id`
- default fallback user is `u-sales-1` if no header is present

This proxy layer is an important seam because some features are true pass-throughs while others reshape or aggregate backend data.

## Inbox Flow

### Main UI

- `frontend/app/(app)/inbox/page.tsx`
- `frontend/components/messages-inbox.tsx`

### Data flow

1. `MessagesInbox` calls `GET /api/inbox/threads`
2. `frontend/app/api/inbox/threads/route.ts`:
   - fetches backend `/channels`
   - fetches backend `/threads`
   - fetches backend `/threads/:id` for each thread
   - reshapes backend data into the frontend `MockConversation` shape
   - falls back to mock data if backend is unavailable
3. UI also calls:
   - `GET /api/inbox/access`
   - `GET /api/settings/users?scope=assignable`
   - `PATCH /api/inbox/threads/:id/assign`
   - `PATCH /api/inbox/threads/:id/status`
   - `POST /api/inbox/threads/:id/reply`

### Realtime behavior

`frontend/components/messages-inbox.tsx` connects directly to Socket.IO using `NEXT_PUBLIC_SOCKET_URL`.

It listens for:

- `assignment`
- `new_message`
- `typing`

Current behavior is refresh-oriented:

- realtime events trigger a re-fetch through Next API routes
- client state is not deeply normalized for patch-style updates

### Important coupling

Inbox UI depends on a frontend aggregation layer, not raw backend thread payloads alone. If backend thread or message shapes change, `frontend/app/api/inbox/threads/route.ts` is a likely adjustment point.

## Delegation and Access Control

Main backend source of truth:

- `src/services/delegationAccess.js`

Scope modes currently include:

- `admin`
- `fallback_full`
- `delegated_all_sections`
- `delegated_specific_inboxes`

Used in:

- `src/routes/threadRoutes.js`
- `src/routes/channelRoutes.js`
- `src/routes/inboxRoutes.js`
- `src/routes/commentRoutes.js`
- `src/routes/delegationRoutes.js`

Frontend reads scope via:

- `frontend/app/api/inbox/access/route.ts`
- `frontend/components/messages-inbox.tsx`

Important note:

- backend enforces the actual visibility rules
- frontend mostly surfaces informational banners and scoped filtering UX

## Channels and OAuth Flow

### Main UI

- `frontend/components/connect-channel-flow.tsx`
- `frontend/app/(app)/settings/channels/page.tsx`
- `frontend/components/settings-channels.tsx`

### Connect flow

For Gmail:

1. UI starts OAuth through `POST /api/settings/integrations/google`
2. browser redirects to Google
3. callback returns to `/settings/connect-channel`
4. frontend posts to `POST /api/settings/channels/connect`
5. Next route:
   - calls backend `/auth/callback`
   - creates or reconnects backend channel
   - optionally maps channel to an inbox

Main files:

- `frontend/app/api/settings/channels/connect/route.ts`
- `src/routes/authRoutes.js`
- `src/routes/channelRoutes.js`
- `src/services/authService.js`

### Sync flow

Channel sync actions go through:

- `POST /api/settings/channels/:id/sync/start`
- `POST /api/settings/channels/:id/sync/pull`

Then into:

- `src/routes/channelRoutes.js`
- `src/services/emailSyncService.js`

Current Gmail sync supports:

- watch setup via Google Pub/Sub
- history cursor management
- manual pull sync
- webhook-driven pull continuation

## Inboxes

Main files:

- `frontend/components/settings-inboxes.tsx`
- `frontend/app/api/settings/inboxes/route.ts`
- `frontend/app/api/settings/inboxes/[id]/route.ts`
- `frontend/app/api/settings/inboxes/[id]/connect-channel/route.ts`
- `src/routes/inboxRoutes.js`

Backend handles:

- list/create/delete inbox
- fetch inbox detail
- connect channel to inbox

## User Management

This is one of the more session-native parts of the app.

Main files:

- `frontend/components/settings-users.tsx`
- `frontend/app/api/settings/users/route.ts`
- `frontend/app/api/settings/users/[id]/route.ts`
- `frontend/app/api/settings/users/[id]/password/route.ts`
- `frontend/lib/user-admin.ts`

Behavior:

- uses Better Auth session from `getRequestSession`
- enforces role checks using normalized app role
- resolves active organization
- manages users through Better Auth internal adapter + Prisma membership records

This path does not depend on the Express backend in the same way most settings screens do.

## Rules

Main files:

- `frontend/components/settings-rules.tsx`
- `frontend/app/api/rules/route.ts`
- `frontend/app/api/rules/[id]/route.ts`
- `src/routes/ruleRoutes.js`

Rules are proxied through Next API routes into backend rule routes.

## Current Auth / Authorization Reality

There are two models active at once:

1. Real frontend auth:
   - Better Auth session
   - Better Auth organization membership
   - role-aware Next route handlers for some product areas

2. Prototype backend auth:
   - Express trusts forwarded headers
   - user identity is reconstructed from `x-user-id`
   - authorization depends on `req.auth`

Important consequence:

- the app is mid-transition from prototype auth to real session-backed auth
- future changes should be careful not to assume every screen already uses the same source of truth

## Known Architectural Seams

These are the most important places to look before making non-trivial changes:

### 1. Session auth vs header auth

- frontend has real sessions
- backend still trusts forwarded headers
- this can create mismatches if UI role and forwarded backend role diverge

### 2. Proxy layer vs direct app logic

- many frontend API routes are simple proxies
- some are orchestration/reshape layers
- always inspect the Next route before changing a frontend feature contract

### 3. Header forwarding integrity

Settings screens now rely on the signed-in Better Auth session instead of browser-side `u-admin-1` impersonation.

Important files:

- `frontend/proxy.ts`
- `frontend/lib/backend-proxy.ts`
- `frontend/app/api/settings/**`

If role-sensitive backend behavior seems wrong, check whether:

- middleware is forwarding `x-user-id`, `x-user-role`, and `x-org-id`
- the Next route handler is using `getBackendHeaders(request)` instead of manual header construction

This is likely to matter in future auth cleanup or role-sensitive feature work.

### 4. Delegation filtering is backend-first

- thread/channel/inbox visibility should be treated as backend-enforced
- frontend can show scoped UX, but backend is the authoritative guardrail

### 5. Inbox UI shape differs from backend shape

- backend exposes thread/message models
- frontend inbox consumes transformed `MockConversation`-style data
- the translation layer lives in `frontend/app/api/inbox/threads/route.ts`

## Recommended Starting Points For Future Changes

If the task is about:

- auth/session/org behavior:
  - `frontend/lib/auth.ts`
  - `frontend/lib/auth-session.ts`
  - `frontend/lib/ensure-org-membership.ts`
  - `frontend/app/(app)/layout.tsx`

- inbox UI/data:
  - `frontend/components/messages-inbox.tsx`
  - `frontend/app/api/inbox/threads/route.ts`
  - `src/routes/threadRoutes.js`
  - `src/services/threadService.js`

- channel connect/sync:
  - `frontend/components/connect-channel-flow.tsx`
  - `frontend/app/api/settings/channels/connect/route.ts`
  - `src/routes/channelRoutes.js`
  - `src/services/authService.js`
  - `src/services/emailSyncService.js`

- delegation/access:
  - `src/services/delegationAccess.js`
  - `src/routes/delegationRoutes.js`
  - `src/routes/threadRoutes.js`

- user administration:
  - `frontend/components/settings-users.tsx`
  - `frontend/app/api/settings/users/route.ts`
  - `frontend/lib/user-admin.ts`

## Short Mental Model

Use this shorthand when reloading context:

- Next.js is the product shell and auth source.
- Express is still the main operational backend for inbox/channel/delegation data.
- Next API routes are the integration seam between them.
- Better Auth is real.
- backend header auth is still real too.
- inbox data is aggregated and transformed in the frontend API layer.
- delegation access is enforced on the backend.
- workspace settings modules now persist server-side, but many backend domain areas still use header-based auth rather than direct Better Auth session integration.
