# Plan: TEST User Signup Table Split

## Objective
When a user signs up with a name that starts with exact `TEST` (after trim), classify that account as a TEST user and serve separated domain data from TEST tables for `notice`, `member`, and `settlement`, while preserving current routes and flow behavior.

## Confirmed Decisions
- Data isolation model: separate tables in the same DB.
- TEST tables: `test_notice`, `test_members`, `test_settlement`.
- Prefix rule: case-sensitive `name.trim().startsWith('TEST')`.

## Scope
IN:
- Signup classification and persistence of TEST-user flag.
- TEST-table creation and repository/service routing for notice/member/settlement.
- Auth/session propagation of user TEST flag so protected routes resolve table scope.
- UI indicator for TEST users ("different info") without changing route topology.

OUT:
- New physical database instances/connections.
- Re-architecture of auth flow or route path changes.
- New automated test framework adoption.
- Broader multi-tenant platform generalization.

## Current Codebase Anchors
- Signup chain: `frontend/src/pages/login/Login.tsx` -> `backend/src/routes/authRoutes.ts` -> `backend/src/controllers/authController.ts` -> `backend/src/services/authService.ts` -> `backend/src/repositories/authRepository.ts`.
- Session/auth user shape: `backend/src/sessionService.ts`, `backend/src/config/passport.ts`, `backend/src/types/common.types.ts`.
- Domain repositories: `backend/src/repositories/noticeRepository.ts`, `backend/src/repositories/memberRepository.ts`, `backend/src/repositories/settlementRepository.ts`.
- Domain services/controllers/routes: `backend/src/services/*Service.ts`, `backend/src/controllers/*Controller.ts`, `backend/src/routes/*Routes.ts`.
- Schema source: `supabase/schema.sql`.
- Frontend auth state and me payload: `frontend/src/features/auth/AuthProvider.tsx`, `frontend/src/entities/user/types.ts`, `frontend/src/app/AppLayout.tsx`.

## Architecture Decisions
- Canonical user flag: add `users."isTest" BOOLEAN NOT NULL DEFAULT FALSE`.
- Scope resolution source of truth: authenticated backend user context (`req.user.isTest`), with fallback to REAL scope when unauthenticated.
- Notice GET route behavior preserved as public, but enhanced to optionally read auth context when Authorization header exists.
- Table selection is whitelist-based constants (never user-supplied strings) to avoid SQL injection risk from dynamic table names.
- Member dues query scope must stay internally consistent: TEST members read TEST settlement; REAL members read REAL settlement.
- OAuth account-creation default: apply same prefix rule to provider names when creating first-time users.

## Execution Tasks
### Task 1: Extend schema for TEST-user classification and TEST domain tables
- Target files: `supabase/schema.sql` (and any SQL migration file used by deployment process).
- Implementation:
  - Add `users."isTest" BOOLEAN NOT NULL DEFAULT FALSE`.
  - Create `test_notice` mirroring `notice` structure, including `pinned` and updated-at trigger behavior.
  - Create `test_members` mirroring `members` structure and indexes equivalent to production members search keys.
  - Create `test_settlement` mirroring `settlement` structure including unique composite index and date index.
- Acceptance criteria:
  - New column and all three TEST tables exist idempotently (`IF NOT EXISTS` semantics).
  - TEST table indexes/constraints are functionally equivalent to REAL tables.
- QA scenarios:
  - Run schema on an empty DB and confirm objects are created once without errors.
  - Re-run schema on populated DB and confirm no destructive changes or duplicate-object failures.

### Task 2: Add auth/domain types for TEST user state
- Target files: `backend/src/types/auth.types.ts`, `backend/src/types/common.types.ts`, `frontend/src/entities/user/types.ts`, `frontend/src/features/auth/types.ts`.
- Implementation:
  - Extend backend row/response interfaces to include `isTest` where user identity is represented.
  - Extend authenticated request user type with `isTest?: boolean | number | string` normalization-compatible shape.
  - Extend frontend `MeInfo` to include `isTest: boolean` and update related auth context typing.
- Acceptance criteria:
  - Type-level support exists end-to-end for `isTest` without any `any` fallback.
  - Existing `isAdmin` handling remains intact.
- QA scenarios:
  - Typecheck backend and frontend to confirm no type regressions.
  - Verify me payload parsing gracefully handles boolean/number/string representations for `isTest`.

### Task 3: Implement TEST classification during account creation
- Target files: `backend/src/services/authService.ts`, `backend/src/repositories/authRepository.ts`, optionally `backend/src/types/auth.types.ts` query row types.
- Implementation:
  - In local signup flow, compute `isTest = name.trim().startsWith('TEST')` using confirmed rule.
  - Persist computed `isTest` in users insert path.
  - Apply same default rule on first-time OAuth user creation paths (Google/Kakao) when provider name is available.
  - Keep duplicate-email and approval-pending behaviors unchanged.
- Acceptance criteria:
  - Local signup with `TEST...` stores `isTest=TRUE`; all other names store `FALSE`.
  - OAuth-created accounts also receive deterministic `isTest` based on the same prefix rule.
- QA scenarios:
  - Sign up users with `TESTAlpha`, ` TESTAlpha`, and `testAlpha` and verify only exact-case prefixed values classify as TEST.
  - Perform first-time Google/Kakao signup using prefixed display name and verify stored `isTest` matches rule.

### Task 4: Propagate `isTest` through session validation and authenticated user context
- Target files: `backend/src/sessionService.ts`, `backend/src/config/passport.ts`, `backend/src/types/common.types.ts`, `backend/src/services/authService.ts` (`getMe` response).
- Implementation:
  - Extend session lookup/select statements to fetch `u."isTest"` alongside `isAdmin`.
  - Include normalized `isTest` in authenticated user object returned by session validation.
  - Ensure `/authentication/me` response includes `isTest` so frontend can render TEST-mode indicator.
- Acceptance criteria:
  - Any JWT-authenticated request has `req.user.isTest` available.
  - `/authentication/me` returns `{ id, name, email, isAdmin, isTest }` consistently.
- QA scenarios:
  - Login as TEST user and verify `req.user.isTest === true` in protected route path.
  - Login as REAL user and verify `req.user.isTest === false` and existing auth still passes.

### Task 5: Introduce centralized data-scope resolver and table mapping
- Target files: new `backend/src/utils/dataScope.ts` (or equivalent single source), repositories/services that consume scope.
- Implementation:
  - Define scope enum/type (`REAL` | `TEST`) and resolver from authenticated user (`isTest` true => TEST, else REAL).
  - Define strict whitelist table map:
    - REAL: `notice`, `members`, `settlement`
    - TEST: `test_notice`, `test_members`, `test_settlement`
  - Expose helper APIs so repositories never accept raw table strings from request payloads.
- Acceptance criteria:
  - All domain table selection uses resolver + whitelist constants only.
  - No direct user-input-driven dynamic SQL identifiers.
- QA scenarios:
  - Static review confirms no path builds table names from request body/query values.
  - Runtime check with both scopes selects the correct mapped table names.

### Task 6: Keep notice route public while enabling scoped responses for authenticated callers
- Target files: `backend/src/routes/noticeRoutes.ts`, `backend/src/controllers/noticeController.ts`, `backend/src/services/noticeService.ts`, `backend/src/repositories/noticeRepository.ts`, optional new middleware helper in `backend/src/utils`.
- Implementation:
  - Add optional-auth middleware for `GET /notice` that attaches `req.user` when Bearer token is valid, but never rejects unauthenticated calls.
  - Update notice controller/service signatures to accept optional authenticated user for reads.
  - Query `notice` or `test_notice` based on resolved scope.
  - Preserve existing admin-only behavior for create/update/delete.
- Acceptance criteria:
  - `GET /notice` remains publicly accessible (no 401 requirement introduced).
  - Authenticated TEST users get TEST notices; unauthenticated or REAL users get REAL notices.
- QA scenarios:
  - Call `GET /notice` with no token and verify successful REAL dataset response.
  - Call `GET /notice` with TEST user token and verify TEST dataset response.

### Task 7: Route member reads/writes (including dues status) by scope
- Target files: `backend/src/controllers/memberController.ts`, `backend/src/services/memberService.ts`, `backend/src/repositories/memberRepository.ts`, `backend/src/routes/memberRoutes.ts` (only if signature adjustments required).
- Implementation:
  - Pass authenticated user to member read endpoints (`getMembers`, `getMemberDuesDepositStatus`) instead of ignoring request user.
  - Resolve scope in service layer and forward to repository methods.
  - In repository, switch member table between `members` and `test_members`.
  - For dues-status logic, ensure settlement source table is scope-aligned (`settlement` for REAL, `test_settlement` for TEST).
  - Keep existing admin checks for mutation endpoints.
- Acceptance criteria:
  - Member list and dues status are scope-correct for TEST vs REAL user.
  - Existing member mutation validation and admin guardrails stay unchanged.
- QA scenarios:
  - TEST user fetches member list and receives records from `test_members` only.
  - TEST dues-status computation reads `test_settlement`, not `settlement`.

### Task 8: Route settlement reads/writes by scope
- Target files: `backend/src/controllers/settlementController.ts`, `backend/src/services/settlementService.ts`, `backend/src/repositories/settlementRepository.ts`.
- Implementation:
  - Pass authenticated user into settlement read path.
  - Resolve data scope in service and use scope-aware repository queries.
  - Switch settlement table between `settlement` and `test_settlement` via whitelist mapping.
  - Preserve admin-only create/update/delete authorization behavior.
- Acceptance criteria:
  - Settlement list CRUD operations target table set matching authenticated user scope.
  - REAL and TEST data cannot cross-read through normal API paths.
- QA scenarios:
  - Insert settlement row as TEST admin and verify row appears only for TEST users.
  - Confirm REAL user cannot see TEST settlement rows on `GET /settlement`.

### Task 9: Expose TEST-mode indicator in frontend authenticated UX
- Target files: `frontend/src/features/auth/AuthProvider.tsx`, `frontend/src/entities/user/types.ts`, `frontend/src/features/auth/types.ts`, `frontend/src/app/AppLayout.tsx` (or a shared header component).
- Implementation:
  - Parse/store `isTest` from `/authentication/me` payload in auth state.
  - Render a clear, non-intrusive TEST-mode label/banner in authenticated layout when `meInfo.isTest` is true.
  - Keep routes and page navigation unchanged.
- Acceptance criteria:
  - TEST users visibly see different information (TEST-mode marker).
  - REAL users do not see TEST-mode marker.
- QA scenarios:
  - Login as TEST user and verify banner/marker appears consistently across notice/member/settlement pages.
  - Login as REAL user and verify marker is absent.

### Task 10: Build a no-test-framework verification checklist and data setup script notes
- Target files: `.sisyphus/plans/test-user-signup-table-split.md` verification section and deployment docs if your team tracks runbooks (`DEPLOY_SUPABASE_VERCEL.md` update can be optional follow-up if requested).
- Implementation:
  - Document manual API checks for both scopes because repository has no automated tests currently.
  - Define minimal seed dataset for `test_notice`, `test_members`, `test_settlement` required for smoke checks.
  - Include SQL sanity checks to assert row counts by table/scope before and after API operations.
- Acceptance criteria:
  - A teammate can validate the feature end-to-end using only documented manual steps.
  - Verification explicitly covers cross-scope isolation failures.
- QA scenarios:
  - Execute full checklist in staging with one TEST user and one REAL user and record results.
  - Intentionally query both scopes after writes and confirm no leakage.

## Final Verification Wave
- DB schema validation:
  - Confirm `users."isTest"` exists with default `FALSE`.
  - Confirm `test_notice`, `test_members`, `test_settlement` exist with expected indexes/constraints.
- Auth validation:
  - Local signup `TEST...` creates user with `isTest=TRUE`.
  - Local signup non-TEST creates user with `isTest=FALSE`.
  - `/authentication/me` exposes `isTest` and frontend consumes it.
- Data-scope validation:
  - TEST user sees TEST notices/members/settlements.
  - REAL user sees REAL notices/members/settlements.
  - Notice public access without token still returns REAL dataset.
- Regression validation:
  - Admin approvals still work.
  - Member dues status still computes correctly for each scope.
  - Existing route paths and response contracts remain backward compatible except intentional `isTest` additions.

## Rollout and Rollback
- Rollout:
  - Apply SQL changes in staging first.
  - Seed minimal TEST rows for smoke checks.
  - Deploy backend + frontend together to avoid me-payload mismatch.
- Rollback:
  - Revert backend/frontend deploy.
  - Keep added columns/tables (non-destructive rollback); route defaults continue to REAL when `isTest` absent in session context.

## Handoff to Implementer
- Execute tasks in order.
- Do not change endpoints or URL paths.
- Use whitelist constants for table-name branching.
- Treat any unresolved behavior mismatch as blocker and report before coding beyond task boundary.
