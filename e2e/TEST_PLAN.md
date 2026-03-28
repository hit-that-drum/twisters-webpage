# E2E TEST PLAN

This document turns the current route inventory and existing Playwright coverage into a concrete file-by-file implementation plan.

## Current baseline

- **Framework**: Playwright (`@playwright/test`)
- **Config**: `playwright.config.ts` runs the built Vite frontend at `http://127.0.0.1:4173`
- **Existing specs**:
  - `e2e/auth-persistence.spec.ts`
  - `e2e/admin-permissions.spec.ts`
- **Current testing style**:
  - Mock backend APIs with `context.route()`
  - Sign in through the UI where possible
  - Prefer `getByRole`, `getByText`, and stable form selectors over `data-testid`

## Route coverage map

| Route | Page | Coverage home |
| --- | --- | --- |
| `/` | Root redirect | `routing.spec.ts` |
| `/signup` | Signup | `auth.spec.ts` |
| `/signin` | Login | `auth.spec.ts` |
| `/auth/kakao/callback` | Kakao callback | `auth.spec.ts` |
| `/:userId` | Personalized home | `routing.spec.ts`, `home.spec.ts` |
| `/home` | Home | `routing.spec.ts`, `home.spec.ts` |
| `/member` | Member management | `member.spec.ts` |
| `/notice` | Notice board | `notice.spec.ts` |
| `/settlement` | Settlement management | `settlement.spec.ts` |
| `/board` | Community board | `board.spec.ts` |
| `/mypage` | Profile page | `mypage.spec.ts` |
| `/flowchart` | Flowchart placeholder | `flowchart.spec.ts` |
| `/admin` | Admin-only user management | `admin.spec.ts` and existing `admin-permissions.spec.ts` |

## Recommended target structure

Keep the existing two specs and add the following feature-focused files:

```text
e2e/
  TEST_PLAN.md
  auth.spec.ts
  routing.spec.ts
  home.spec.ts
  member.spec.ts
  notice.spec.ts
  settlement.spec.ts
  board.spec.ts
  mypage.spec.ts
  flowchart.spec.ts
  admin.spec.ts
  auth-persistence.spec.ts        # keep
  admin-permissions.spec.ts       # keep
```

## Shared helper plan

Before adding many new specs, extract a small helper layer so the suite stays readable.

### Recommended shared helpers

- `e2e/helpers/auth.ts`
  - `signInAs(page, account)`
  - `seedAuthenticatedSession(context, account)`
  - `mockAuthEndpoints(context, options)`
- `e2e/helpers/accounts.ts`
  - `TEST_ADMIN`
  - `TEST_MEMBER`
  - Optional non-test admin/member variants
- `e2e/helpers/api.ts`
  - feature-specific route mocking helpers for member, notice, settlement, board, and admin
- `e2e/helpers/assertions.ts`
  - repeated assertions like auth redirect, test-mode banner, visible list empty states, and success messages

### Mocking guidelines

- **Context-level mocks** for auth/session endpoints
- **Spec-level mocks** for page-specific data such as members, notices, settlements, posts, and admin tables
- Keep mock payloads close to the shape used by the frontend pages so tests stay realistic

## File-by-file plan

---

## `e2e/routing.spec.ts`

**Purpose**: Guard the app shell and route transitions.

**Primary routes**: `/`, `/home`, `/:userId`, protected pages through `AppLayout`

**Core scenarios**

1. Root redirect sends unauthenticated users to `/signup`.
2. Root redirect sends authenticated users to `/:userId`.
3. Protected routes redirect unauthenticated users to `/signin`.
4. Authenticated users can deep-link directly to `/home`, `/member`, `/notice`, `/settlement`, `/board`, `/mypage`, and `/flowchart`.
5. Test accounts show the `TEST MODE` banner on protected pages.
6. Logout from the shared header returns the user to `/signin`.

**Notes**

- This file should focus on shell behavior, not CRUD internals.
- Reuse the same auth mock helpers as `auth-persistence.spec.ts`.

---

## `e2e/auth.spec.ts`

**Purpose**: Cover login, signup, callback, and auth error handling.

**Primary routes**: `/signup`, `/signin`, `/auth/kakao/callback`

**Core scenarios**

1. Member can sign in successfully and lands on their personalized route.
2. Admin can sign in successfully and lands on their personalized route.
3. Invalid credentials show an error and keep the user on `/signin`.
4. Remember-me unchecked creates an in-session login flow; checked creates a persistent login flow.
5. Signup happy path submits valid data and shows the expected pending/next-step state.
6. Signup validation blocks incomplete or malformed input.
7. Kakao callback success path completes auth and redirects correctly.
8. Kakao callback failure path shows a recoverable error state and does not leave the app stuck in loading.
9. Forgot-password dialog opens from the login screen, submits an email, and shows the expected success or failure feedback.
10. Password-reset token flows render the reset state correctly when a reset token is present in the URL.

**Keep existing coverage**

- `auth-persistence.spec.ts` remains the source of truth for storage/session persistence details.
- `auth.spec.ts` should focus on the visible user journey and obvious auth failures.

---

## `e2e/home.spec.ts`

**Purpose**: Verify the authenticated landing experience for `/home` and `/:userId`, which currently behave differently.

**Primary routes**: `/home`, `/:userId`

**Core scenarios**

1. Direct navigation to `/:userId` renders the authenticated user summary for the signed-in user.
2. Refreshing `/:userId` preserves the authenticated experience.
3. Accessing a mismatched `/:userId` redirects to the authenticated user’s real route.
4. Visiting `/home` loads the user-list style page by fetching `/authentication/users`.
5. `/home` handles unauthorized fetch failures by redirecting to `/signin`.
6. Shared navigation from home reaches Member, Notice, Settlement, Board, My Page, and any role-allowed admin link.
7. Test account protected views show the test-data banner from `AppLayout`.

**Notes**

- Keep this file focused on dashboard/home rendering and navigation out of the page.

---

## `e2e/member.spec.ts`

**Purpose**: Cover the member directory, selected-member detail pane, dues status, and permission differences.

**Primary route**: `/member`

**Core scenarios**

1. Member list loads successfully for an authenticated user.
2. Test-mode data source renders the expected isolated rows for test accounts.
3. Selecting a member updates the right-side detail view with profile-like information and dues status chips.
4. Admin can open the `ADD MEMBER` modal, create a member entry, and see the new row appear in the list.
5. Admin can open the edit flow from the selected member, change fields like name, email, phone, or birth date, and see updated values reflected in the UI.
6. Admin can delete a member entry and sees the row removed from the list.
7. Non-admin users see read-only behavior or hidden/disabled management controls.
8. Empty-state and API-failure state render a recoverable message.

**Important mock coverage**

- List fetch
- Create/update/delete endpoints
- Detail payload for modal rendering
- Dues-status payloads keyed by year so the status chips can be asserted

---

## `e2e/notice.spec.ts`

**Purpose**: Cover inline notice-card behavior and admin add/edit flows through `NoticeDetailModal`.

**Primary route**: `/notice`

**Core scenarios**

1. Notice list loads and renders inline notice cards in the expected controlled mock order.
2. Pinned notice items remain visually distinct; if ordering matters, assert it only against a controlled mock payload rather than assumed frontend sorting.
3. Admin can open `NoticeDetailModal` in add mode, create a notice, and see the list update.
4. Admin can open `NoticeDetailModal` in edit mode, change content, and see the updated notice card.
5. Admin can delete a notice and the row/card disappears.
6. Non-admin users can read notices but cannot access write/delete actions.
7. Empty-state and failed-load state render correctly.
8. Clicking `Load More Notices` extends the visible list instead of replacing the existing items.

---

## `e2e/settlement.spec.ts`

**Purpose**: Cover settlement grid behavior, totals, pagination, and admin management flows.

**Primary route**: `/settlement`

**Core scenarios**

1. Settlement entries load correctly into the grid.
2. Total amount, income, expense, and carry-over values render from the controlled payload.
3. Admin can open `ADD SETTLEMENT`, create a new record, and see the row plus totals update.
4. Admin can edit an existing settlement record and see totals recalculate.
5. Admin can delete a settlement record.
6. Non-admin users are limited to read-only access where applicable.
7. Empty-state and API-error state render gracefully.
8. Pagination or rows-per-page changes update the grid slice without breaking totals.

**Important mock coverage**

- List fetch keyed by year
- Create/update/delete flows
- Distinguish test-user dataset vs normal dataset
- Totals payloads for total amount, income, expense, and carry-over assertions

---

## `e2e/board.spec.ts`

**Purpose**: Cover the highest-interaction community page: inline post expansion, comments, images, and member/admin permissions.

**Primary route**: `/board`

**Core scenarios**

1. Board post list loads with author/title/metadata visible.
2. Search and sort controls update the visible post list for keywords and ordering modes such as latest, oldest, recently updated, or pinned.
3. Member can create a new board post.
4. Member can edit their own post.
5. Member can delete their own post.
6. Expanding a board post reveals the full post content inline.
7. Clicking an attached image opens the board image modal and allows next/previous or thumbnail-based navigation when multiple images exist.
8. Expanding a post reveals comments and allows an authorized user to add a comment.
9. Authorized users can delete their own comment, and unauthorized users cannot see destructive comment controls.
10. Unauthorized edit/delete controls are hidden or blocked for users who do not own the post.
11. Admin can manage posts with elevated permissions where the UI allows it, including pinning when available.
12. Empty-state and API-failure state render safely.

**Priority note**

- This page should receive the deepest regression coverage because it combines list loading, authoring, modal behavior, and image interactions.

---

## `e2e/mypage.spec.ts`

**Purpose**: Cover profile rendering and profile image upload behavior.

**Primary route**: `/mypage`

**Core scenarios**

1. My Page renders the current user profile information.
2. Uploading a valid profile image updates the UI preview.
3. Refreshing the page preserves the updated profile image state when the backend mock returns the saved image.
4. API failure during upload surfaces a visible recovery path.
5. Saving a new profile image triggers the explicit `Save Profile Image` action and refreshes the user info shown on the page.

**Notes**

- Do not promise file-type or oversize validation coverage unless `GlobalImageUpload` adds explicit visible validation/error states.

---

## `e2e/flowchart.spec.ts`

**Purpose**: Guard a low-complexity route so it does not regress silently.

**Primary route**: `/flowchart`

**Core scenarios**

1. Authenticated users can open the page successfully.
2. Unauthenticated users are redirected to `/signin`.
3. The expected placeholder content renders.
4. If the route is exposed through the current profile/menu conditions for test users or admins, navigation into `/flowchart` succeeds without shell/layout regressions.

**Notes**

- Keep this file intentionally small unless the page later becomes feature-rich.

---

## `e2e/admin.spec.ts`

**Purpose**: Cover admin-only management flows beyond the existing permission-focused checks.

**Primary route**: `/admin`

**Core scenarios**

1. Admin can load the admin page and see pending users plus approved users.
2. Approving a pending user removes that user from the pending list and records the action in the approved list state.
3. Declining a pending user removes that user from the pending list.
4. Admin can open `AdminUserDetailModal`, edit fields such as name, email, role, or status, and see the table update after save.
5. Admin can delete a user and sees the table update.
6. Status filters and pagination controls change the visible rows without corrupting counts.
7. Test admin behavior uses the test-user dataset correctly.
8. API failures on approve/decline/edit/delete surface visible error handling and leave the table in a sane state.

**Keep existing coverage**

- `admin-permissions.spec.ts` should remain focused on permission boundaries and role-based access.
- `admin.spec.ts` should focus on page-level CRUD and state transitions after admin actions.
- Do not add an admin create-user scenario until the `Add New User` button is implemented beyond its current stub state.

## Suggested rollout order

1. `routing.spec.ts`
2. `auth.spec.ts`
3. `board.spec.ts`
4. `notice.spec.ts`
5. `member.spec.ts`
6. `settlement.spec.ts`
7. `mypage.spec.ts`
8. `home.spec.ts`
9. `flowchart.spec.ts`
10. `admin.spec.ts`

## Smoke suite candidates

These should be fast and run on every PR:

- Root redirect for unauthenticated users
- Sign-in happy path for member
- Protected route redirect to `/signin`
- Board list load
- Notice list load
- Settlement grid and totals render
- My Page render
- Admin page access for admin

## Regression suite candidates

These can run in the fuller E2E suite:

- Signup validation matrix
- Kakao callback failure handling
- Member CRUD
- Notice CRUD
- Settlement CRUD
- Board create/edit/delete with image modal coverage
- Admin approve/decline/edit/delete flows
- Upload failure/retry on My Page

## Definition of done for each new spec

- Covers one page or one shell concern clearly
- Reuses shared auth/mock helpers instead of duplicating route wiring
- Includes one happy path and one failure or permission path
- Uses accessible selectors where possible
- Can run independently with deterministic mocks
