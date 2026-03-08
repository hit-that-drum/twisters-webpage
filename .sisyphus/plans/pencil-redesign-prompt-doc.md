# Twisters Pencil.dev Redesign Master Prompt

## How to use
- Copy this whole document into Pencil.dev as the working prompt.
- Follow phases in order. Do not skip earlier phases.
- Keep route information architecture unchanged.

## Source of truth (must align)
- `PENCIL_DESIGN_PLAYBOOK.md`
- `docs/REDESIGN_SPEC.md`
- `frontend/src/app/AppRouter.tsx`
- `frontend/src/common/components/LNB.tsx`
- `frontend/src/common/lib/theme/twisterTheme.ts`

## Project context (fixed)
- Product: member-based community web app
- Frontend stack: React + TypeScript + Vite
- UI stack: Tailwind CSS + MUI + notistack
- Existing route structure must remain as-is

### Routes (must stay unchanged)
- `/` (root redirect route)
- `/signup`
- `/signin`
- `/auth/kakao/callback`
- `/:userId`
- `/home`
- `/member`
- `/notice`
- `/settlement`
- `/board`
- `/mypage`
- `/admin`

### Existing shell/components to preserve conceptually
- App shell: `AppLayout` with `Header`, `LNB`, `Footer`
- Main navigation: `LNB` (admin-only item visibility)
- Secondary navigation: `SubLNB` (list/detail style)
- Auth shell split: `/signup`, `/signin`, `/auth/kakao/callback` are outside `AppLayout`

### Existing implementation references
- Router: `frontend/src/app/AppRouter.tsx`
- Layout: `frontend/src/app/AppLayout.tsx`
- Shared nav: `frontend/src/common/components/Header.tsx`
- Shared nav: `frontend/src/common/components/LNB.tsx`
- Shared nav: `frontend/src/common/components/SubLNB.tsx`
- Theme/tokens source: `frontend/src/common/lib/theme/twisterTheme.ts`

## Non-negotiable constraints
- Do not change route names, path structure, or auth gating model.
- Do not add new routes/pages or redesign auth flow logic.
- Keep admin/member role behavior explicit in navigation and actions.
- Keep admin-only navigation hidden for non-admin users by default.
- Design desktop and mobile variants for each route.
- Include state design for loading, empty, error, success.
- Keep outputs implementation-friendly for Tailwind + MUI.
- Avoid default-looking MUI visuals; apply a clear, coherent visual system.
- Use token-first styling; avoid ad-hoc hex values outside mapped token system.
- Remove emoji-heavy navigation style in final UI language.

## Phase workflow

### Phase 1 - Existing screen analysis
Analyze current screens and summarize current UX/UI structure before redesign.

Required analysis targets:
- Auth: `frontend/src/pages/login/Login.tsx`
- Home: `frontend/src/pages/home/Home.tsx`
- Member: `frontend/src/pages/member/Member.tsx`
- Notice: `frontend/src/pages/notice/Notice.tsx`
- Settlement: `frontend/src/pages/settlement/Settlement.tsx`
- Board: `frontend/src/pages/board/Board.tsx`
- MyPage: `frontend/src/pages/mypage/MyPage.tsx`
- Admin: `frontend/src/pages/adminpage/AdminPage.tsx`

For each route, output:
- Current layout pattern (single, split, table-heavy, dialog-heavy)
- Core user jobs
- Pain points in hierarchy/readability/action clarity
- Responsive risks on mobile
- Required edge states (loading/empty/error/success)

### Phase 2 - Design system definition
Define a concrete design system aligned to existing token source and implementation stack.

System definition requirements:
- Use `twisterTheme.ts` as baseline token source.
- Preserve existing blue/neutral palette direction unless a new value is mapped back to token system.
- Create token table for: color, typography, spacing, radius, shadow.
- Define semantic roles: primary, surface, text, divider, success, warning, error, info.
- Define component style principles for MUI-skinned components.
- Define responsive rules: breakpoints, density rules, table overflow behavior.

Output format:
- Token table with token name, value, usage, Tailwind mapping, MUI mapping.
- One style principle paragraph per component family (navigation, form, data table, dialog, feedback).

### Phase 3 - Frame creation
Create canonical frames for all routes in desktop and mobile.

Frame requirements:
- Build global shell frames first (desktop/mobile): header, nav, content container, footer.
- Build route frames under the fixed IA without changing route purposes.
- Include explicit frame variants for:
  - `/` root redirect loading state
  - `/:userId` and `/home`
  - `/auth/kakao/callback` loading/success/error handoff
  - `/admin` admin-only data-heavy view
- For data-heavy routes (`/member`, `/settlement`, `/admin`), include mobile overflow strategy frame.

Output format:
- Frame inventory table: route, desktop frame id/name, mobile frame id/name, notes.

### Phase 4 - UI redesign
Redesign each frame with a cohesive visual language and strong information hierarchy.

Redesign requirements:
- Navigation labels should be text-first and professional.
- Keep role-based visibility behavior (admin nav and admin actions).
- Improve clarity of primary/secondary actions.
- Unify card, table, form, and dialog visuals under one system.
- Keep readability and accessibility high (contrast, touch target, spacing).

Per-route redesign outputs:
- Before/after rationale (short bullets)
- Key UI decisions (layout, hierarchy, action placement)
- State variants (loading/empty/error/success)

### Phase 5 - Variable/style cleanup
Normalize all styling decisions into reusable tokens and rules.

Cleanup requirements:
- Remove ad-hoc stylistic decisions from page-level designs.
- Consolidate color/spacing/radius/shadow into token set.
- Map token usage to Tailwind utility strategy and MUI theme overrides.
- Define do/don't rules for consistency across pages.

Output format:
- Final variable/style matrix:
  - Token
  - Visual value
  - Tailwind mapping
  - MUI mapping
  - Usage examples

### Phase 6 - Componentization
Convert redesigned UI into reusable component architecture.

Componentization requirements:
- Define shared components and page-composed components separately.
- Reuse shell-level components conceptually (`Header`, `LNB`, `SubLNB`, `Footer`).
- Propose reusable primitives for:
  - Page header
  - Section card
  - Data table wrapper
  - Form section and field row
  - Dialog template
  - Empty/error state blocks
- For each component, specify variants, props intent, and state behavior.

Output format:
- Component inventory table:
  - Component name
  - Responsibility
  - Reuse scope (global/page)
  - Variant/state list
  - Tailwind vs MUI implementation note

### Phase 7 - Developer handoff package
Produce implementation-ready handoff artifacts for engineers.

Handoff requirements:
- Route-by-route implementation notes (desktop/mobile).
- Interaction behavior notes:
  - dialogs
  - toasts
  - table actions
  - role gating
  - redirect/fallback behavior
- State behavior spec for each route.
- Priority implementation sequence (high impact first).
- QA checklist for acceptance validation.

Required final deliverables:
- Route architecture table (route -> shell -> access -> fallback)
- Final design token table
- Component inventory table
- Responsive strategy summary
- State spec matrix
- Developer implementation checklist


## Final Verification Wave
- Ensure all phases are completed in sequence.
- Ensure all listed routes have desktop + mobile frames.
- Ensure all shared components and tokens are mapped for implementation.
- Ensure output includes route architecture, token table, component inventory, and state matrix.
- Ensure `/member`, `/settlement`, and `/admin` include explicit mobile data-density strategy.
- Ensure final design handoff maps decisions to Tailwind + MUI implementation notes.
