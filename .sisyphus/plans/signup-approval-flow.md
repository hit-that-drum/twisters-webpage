# Plan: Approval-Gated Signup with Admin Approval API

## Objective
Implement approval-gated access so new users are created in pending state and cannot sign in until an admin approves them, while preserving access for existing users.

## Locked Decisions
- Column name is `"isAllowed"` on `users` table.
- All new users (local signup + Google signup) are created with `"isAllowed" = FALSE`.
- Existing users are backfilled with `"isAllowed" = TRUE` during migration.
- Signup returns HTTP `201` with pending state and no auth tokens.
- Signin for pending users returns HTTP `403` with error code `ACCOUNT_PENDING_APPROVAL`.
- Admin approval API is included in scope.
- Admin workflow in this scope is approve-only (no deny/unapprove endpoint in this change set).

## Scope
### IN
- DB schema update and migration/backfill path.
- Backend auth flow changes for signup/signin/google/refresh/session validation.
- Admin-only endpoints for listing pending users and approving users.
- Frontend signup/signin UX updates for pending state.
- API error contract extension to support stable machine-readable code.

### OUT
- Full admin UI build-out beyond minimal approval workflow integration.
- Email notification system for approvals.
- Multi-state account lifecycle (pending/approved/denied/suspended); keep boolean only.

## Guardrails
- Do not break current approved-user sign-in flow.
- Ensure no token issuance path bypasses approval check.
- Ensure protected APIs reject unapproved users even with previously minted tokens.
- Keep backward-safe error shape: preserve `error` while adding optional `code`.
- Use exact file paths and existing repository/service/controller patterns.

## Implementation Tasks

### Task 1: Add `isAllowed` to canonical DB schema and dump
- Files: `supabase/schema.sql`, `init.sql`.
- Update `users` table definitions to include `"isAllowed" BOOLEAN NOT NULL DEFAULT FALSE` near `"isAdmin"`.
- Update existing `INSERT INTO public.users` rows in `init.sql` to include explicit `"isAllowed"` values set to `true`.
- Add a migration note block (SQL snippet) in plan handoff for existing deployed DBs:
  - `ALTER TABLE users ADD COLUMN IF NOT EXISTS "isAllowed" BOOLEAN NOT NULL DEFAULT FALSE;`
  - `UPDATE users SET "isAllowed" = TRUE WHERE id IS NOT NULL;`
- QA scenarios:
  - Fresh schema load has `users."isAllowed"` as non-null boolean default false.
  - Existing seeded users in `init.sql` remain loggable (approved true).

### Task 2: Extend backend auth types for approval-aware flows
- Files: `backend/src/types/auth.types.ts`, any affected DTO/row interfaces.
- Add `isAllowed` to user row interfaces used by login/google/session checks.
- Add pending-signup response type that contains no token fields and includes status marker (`pending`).
- Keep existing token response types for approved sign-in paths unchanged.
- QA scenarios:
  - TypeScript compile enforces handling of `isAllowed` where required.
  - Signup controller/service return type no longer implies token issuance.

### Task 3: Extend HTTP error contract with optional machine-readable code
- Files: `backend/src/errors/httpError.ts`, `backend/src/utils/controllerErrorHandler.ts`.
- Update `HttpError` to accept optional `code` string (e.g., `ACCOUNT_PENDING_APPROVAL`).
- Ensure controller error handler responds as `{ error: message, code?: string }`.
- Preserve existing behavior for all current errors that do not set code.
- QA scenarios:
  - Existing endpoints still return `{ error: ... }` without breakage.
  - Pending signin returns `{ error: ..., code: 'ACCOUNT_PENDING_APPROVAL' }`.

### Task 4: Update auth repository queries for approval state and admin approval API
- Files: `backend/src/repositories/authRepository.ts`.
- Update read queries used by signin/google/session paths to fetch `"isAllowed"`.
- Keep `createUser` insert minimal and rely on DB default (`false`) for new signups.
- Add repository methods:
  - `findPendingUsers()` (ordered, non-sensitive fields only)
  - `approveUserById(userId)` (sets `"isAllowed" = TRUE`, optionally approval timestamp)
  - `findUserApprovalById(userId)` as needed for guard checks.
- QA scenarios:
  - New local/google users are stored with `"isAllowed" = FALSE`.
  - Pending list excludes already approved users.

### Task 5: Change signup to pending-only (no session creation)
- Files: `backend/src/services/authService.ts`, `backend/src/controllers/authController.ts`.
- In `signUp`, remove call to `createSessionAuthResponse` and return pending payload (`201`).
- Ensure duplicate email behavior is preserved (existing conflict handling).
- Ensure response does not include `token`/`refreshToken` fields.
- QA scenarios:
  - `POST /authentication/signup` returns `201` and pending payload.
  - Signup response never includes auth tokens.

### Task 6: Enforce approval gate in local signin and Google auth
- Files: `backend/src/config/passport.ts`, `backend/src/services/authService.ts`.
- Local signin path: after password validation and before session creation, block unapproved user with `HttpError(403, ..., 'ACCOUNT_PENDING_APPROVAL')`.
- Google auth path: for both existing and newly created users, check `"isAllowed"`; if false, return same 403/code and do not create session.
- Keep approved-user sign-in behavior unchanged.
- QA scenarios:
  - Pending user local signin returns `403` with code.
  - Pending Google user auth returns `403` with code.
  - Approved users still receive tokens.

### Task 7: Enforce approval in session validation and refresh (defense in depth)
- Files: `backend/src/sessionService.ts`.
- In `getAuthenticatedUserBySession`, require joined user row `"isAllowed" = TRUE`.
- In `refreshSessionAuthResponse`, require the same `"isAllowed" = TRUE` condition before issuing new access token.
- Ensure unauthorized result path remains consistent with existing 401 handling.
- QA scenarios:
  - Unapproved user with old token cannot access `/authentication/me`.
  - Unapproved user with valid refresh token cannot obtain new access token.

### Task 8: Add admin-only approval APIs in existing auth route namespace
- Files: `backend/src/utils/requireAdmin.ts` (new), `backend/src/controllers/authController.ts`, `backend/src/services/authService.ts`, `backend/src/routes/authRoutes.ts`, `backend/src/types/common.types.ts`.
- Add `requireAdmin` middleware using authenticated `req.user.isAdmin` normalization.
- Add endpoints under `/authentication` (and automatically `/api/authentication` via app mount):
  - `GET /admin/pending-users`
  - `PATCH /admin/users/:id/approve`
- Ensure both endpoints require `passport.authenticate('jwt', { session: false })` + `requireAdmin`.
- Include guardrails: invalid user id -> 400, missing target -> 404, non-admin -> 403.
- Response contracts:
  - Pending list returns array of `{ id, name, email, createdAt }` only.
  - Approve endpoint returns `{ message: 'approved', userId }`.
- QA scenarios:
  - Admin can list pending users and approve one successfully.
  - Non-admin receives 403 for both endpoints.

### Task 9: Update frontend signup/login UX for pending approval contract
- Files: `frontend/src/pages/login/Login.tsx`.
- Signup branch: when response is pending (no tokens), show success/pending message and do not call token storage helpers.
- Keep existing login branch for approved users unchanged.
- Login failure branch: when `code === 'ACCOUNT_PENDING_APPROVAL'`, show dedicated pending message (not generic invalid credentials copy).
- Ensure navigation after pending signup goes to signin (or remains on current page) with clear next step copy.
- QA scenarios:
  - New signup does not set tokens in storage and does not navigate to private route.
  - Pending user signin shows approval-needed guidance.

### Task 10: Keep auth-provider behavior stable with no-token signup responses
- Files: `frontend/src/features/auth/AuthProvider.tsx`, `frontend/src/common/lib/api/apiClient.ts` (verify only; modify only if required by changed API contract).
- Confirm no assumption that signup always populates tokens.
- Confirm 403 pending responses are not treated as refreshable auth errors.
- Preserve current refresh-on-401 behavior only.
- QA scenarios:
  - Pending signin 403 does not trigger token refresh loop.
  - Existing approved session still auto-refreshes as before.

### Task 11: Execute migration-safe rollout order and verification matrix
- Order (must follow exactly):
  1) Apply DB migration/backfill on running DB.
  2) Deploy backend approval-aware auth changes.
  3) Deploy frontend pending-aware signup/login UX.
- Validate with explicit matrix:
  - Existing approved user login: success
  - New local signup: pending/no token
  - New google signup: pending/no token
  - Pending signin: 403 + code
  - Admin approve then signin: success
- QA scenarios:
  - No existing user outage during migration.
  - No pending user receives token before approval.

## Final Verification Wave
- Run backend: `npm run typecheck` in `backend/`.
- Run frontend: `npm run build` and `npm run lint` in `frontend/`.
- Run end-to-end manual auth verification cases listed in tasks.
- Confirm no auth endpoint returns tokens for pending users.
- Confirm approved users retain normal login behavior.
