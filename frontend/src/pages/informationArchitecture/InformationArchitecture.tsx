import { useMemo, useState } from 'react';

type LeafNode = {
  label: string;
  path?: string;
  meta?: string;
  adminOnly?: boolean;
  testOnly?: boolean;
};

type Branch = {
  id: string;
  label: string;
  path?: string;
  description?: string;
  adminOnly?: boolean;
  children?: LeafNode[];
};

type Section = {
  id: string;
  title: string;
  subtitle: string;
  accent: 'slate' | 'blue' | 'amber' | 'emerald' | 'rose';
  branches: Branch[];
};

const SECTIONS: Section[] = [
  {
    id: 'entry',
    title: 'Entry & Authentication',
    subtitle: '비로그인 사용자가 접근 가능한 공개 라우트',
    accent: 'slate',
    branches: [
      {
        id: 'root',
        label: 'Root Redirect',
        path: '/',
        description:
          '인증 상태에 따라 자동 분기 — 세션 만료 시 /signin, 첫 방문 시 /signup, 로그인 상태일 때 /:userId 로 이동합니다.',
      },
      {
        id: 'signup',
        label: 'Sign Up',
        path: '/signup',
        description: '이메일 회원가입 + 소셜 가입 (Google · Kakao). 인증 메일 발송 플로우 포함.',
        children: [
          { label: 'Email · Password Form' },
          { label: 'Social Buttons (Google / Kakao)' },
          { label: 'Email Verification Banner' },
        ],
      },
      {
        id: 'signin',
        label: 'Sign In',
        path: '/signin',
        description: '로그인 화면. 비밀번호 재설정 다이얼로그 진입점.',
        children: [
          { label: 'Login Form Fields' },
          { label: 'Social Buttons (Google / Kakao)' },
          { label: 'Password Reset Dialog' },
          { label: 'Verification Banner' },
        ],
      },
      {
        id: 'kakao-callback',
        label: 'Kakao OAuth Callback',
        path: '/auth/kakao/callback',
        description: '카카오 OAuth 인증 코드 수신 후 토큰 교환 → 로그인 처리.',
      },
      {
        id: 'not-found',
        label: '404 Not Found',
        path: '/*',
        description: '정의되지 않은 모든 경로의 폴백 화면.',
      },
    ],
  },
  {
    id: 'app',
    title: 'Main Application',
    subtitle: 'AppLayout 내부 — 인증된 사용자만 접근 가능 (Header · LNB · Footer 공유)',
    accent: 'blue',
    branches: [
      {
        id: 'home',
        label: '🏠 Home',
        path: '/:userId  ·  /home',
        description: '로그인 직후 진입 페이지. 본인 ID 기반 개인화. 테스트 사용자는 Resume Home.',
        children: [
          { label: 'User Identity Summary' },
          { label: 'Resume Home (Test Users)', testOnly: true },
        ],
      },
      {
        id: 'member',
        label: '👥 Member',
        path: '/member',
        description: '회원 명부 — 사이드바에서 회원 선택 → 상세 패널에서 프로필/회비/출석 조회.',
        children: [
          { label: 'Member Sidebar (List)' },
          { label: 'Profile Header' },
          { label: 'Dues Panel (회비)' },
          { label: 'Attendance Panel (정모 출석)' },
          { label: 'Add Member Dialog', adminOnly: true },
          { label: 'Edit / Delete Member Dialog', adminOnly: true },
          { label: 'Set / Reset Attendance', adminOnly: true },
        ],
      },
      {
        id: 'notice',
        label: '📢 Notice',
        path: '/notice',
        description: '공지사항 피드 — 카드 리스트 + 무한 스크롤. 이미지 첨부/상세 모달 지원.',
        children: [
          { label: 'Notice Card List' },
          { label: 'Notice Detail Modal' },
          { label: 'Load More Pagination' },
          { label: 'Create Notice', adminOnly: true },
          { label: 'Edit Notice', adminOnly: true },
        ],
      },
      {
        id: 'settlement',
        label: '💰 Settlement',
        path: '/settlement',
        description: '회비 정산 그리드 — DataGrid 기반 연도/월별 정산 내역 관리.',
        children: [
          { label: 'Settlement Grid' },
          { label: 'Settlement Detail Modal' },
          { label: 'Add Settlement', adminOnly: true },
          { label: 'Edit Settlement', adminOnly: true },
        ],
      },
      {
        id: 'board',
        label: '🎲 Board',
        path: '/board',
        description: '자유 게시판 — 글 작성·수정·삭제, 댓글, 반응(좋아요/북마크), 이미지 첨부.',
        children: [
          { label: 'Board Toolbar (Filter / Sort)' },
          { label: 'Post Card Feed' },
          { label: 'Post Detail Modal' },
          { label: 'Comment Section' },
          { label: 'Reactions (Like / Bookmark / etc.)' },
          { label: 'Image Lightbox Modal' },
          { label: 'Pin / Unpin Post', adminOnly: true },
        ],
      },
      {
        id: 'mypage',
        label: '🙋 My Page',
        path: '/mypage',
        description: '본인 프로필 관리 — 사진/이름/연락처 편집, 본인이 남긴 반응 모아보기.',
        children: [
          { label: 'Profile Avatar Editor' },
          { label: 'Profile Detail Form (Name / Phone)' },
          { label: 'Reaction Sections (My Likes / Bookmarks)' },
          { label: 'Reaction Posts Modal' },
        ],
      },
    ],
  },
  {
    id: 'admin',
    title: 'Admin Console',
    subtitle: 'isAdmin === true 사용자만 접근 가능',
    accent: 'amber',
    branches: [
      {
        id: 'admin',
        label: '🛡️ Admin Page',
        path: '/admin',
        adminOnly: true,
        description: '가입 승인 대기열, 사용자 관리, 통계 카드 — 운영자 전용 콘솔.',
        children: [
          { label: 'Stats Cards (전체 통계)' },
          { label: 'Pending Users Panel (가입 승인)' },
          { label: 'All Users Table (필터 · 검색 · 페이지네이션)' },
          { label: 'User Detail / Edit Modal' },
          { label: 'Approve / Decline Pending User' },
          { label: 'Delete User · Reset Profile Image' },
        ],
      },
      {
        id: 'ia',
        label: '🗺️ Information Architecture',
        path: '/information-architecture',
        description: '본 페이지 — 전체 사이트 구조 및 라우트 맵.',
      },
    ],
  },
];

const ACCENT_STYLES: Record<
  Section['accent'],
  { ring: string; pillBg: string; pillText: string; bar: string }
> = {
  slate: {
    ring: 'border-slate-200',
    pillBg: 'bg-slate-100',
    pillText: 'text-slate-700',
    bar: 'bg-slate-400',
  },
  blue: {
    ring: 'border-blue-200',
    pillBg: 'bg-blue-50',
    pillText: 'text-blue-700',
    bar: 'bg-blue-500',
  },
  amber: {
    ring: 'border-amber-200',
    pillBg: 'bg-amber-50',
    pillText: 'text-amber-800',
    bar: 'bg-amber-400',
  },
  emerald: {
    ring: 'border-emerald-200',
    pillBg: 'bg-emerald-50',
    pillText: 'text-emerald-800',
    bar: 'bg-emerald-500',
  },
  rose: {
    ring: 'border-rose-200',
    pillBg: 'bg-rose-50',
    pillText: 'text-rose-800',
    bar: 'bg-rose-500',
  },
};

function AdminBadge() {
  return (
    <span className="ml-2 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800">
      Admin
    </span>
  );
}

function TestBadge() {
  return (
    <span className="ml-2 inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-purple-700">
      Test
    </span>
  );
}

function PathPill({ path }: { path: string }) {
  return (
    <code className="rounded-md bg-slate-900/90 px-2 py-0.5 font-mono text-[11px] font-medium text-slate-100">
      {path}
    </code>
  );
}

export default function InformationArchitecture() {
  const [query, setQuery] = useState('');

  const normalizedQuery = query.trim().toLowerCase();

  const filteredSections = useMemo(() => {
    if (!normalizedQuery) {
      return SECTIONS;
    }

    return SECTIONS.map((section) => {
      const branches = section.branches.filter((branch) => {
        const haystack = [
          branch.label,
          branch.path ?? '',
          branch.description ?? '',
          ...(branch.children?.map((c) => c.label) ?? []),
        ]
          .join(' ')
          .toLowerCase();

        return haystack.includes(normalizedQuery);
      });

      return { ...section, branches };
    }).filter((section) => section.branches.length > 0);
  }, [normalizedQuery]);

  const totalRoutes = SECTIONS.reduce((sum, section) => sum + section.branches.length, 0);
  const totalLeaves = SECTIONS.reduce(
    (sum, section) =>
      sum + section.branches.reduce((bSum, b) => bSum + (b.children?.length ?? 0), 0),
    0,
  );
  const adminOnly = SECTIONS.reduce(
    (sum, section) =>
      sum +
      section.branches.reduce(
        (bSum, b) =>
          bSum +
          (b.adminOnly ? 1 : 0) +
          (b.children?.filter((c) => c.adminOnly).length ?? 0),
        0,
      ),
    0,
  );

  return (
    <section className="px-4 py-8 sm:px-6 lg:px-12">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">
                Twisters · Site Map
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
                Information Architecture
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
                Twisters 웹사이트의 전체 라우트 구조와 각 페이지의 주요 구성 요소를 한눈에
                보여주는 IA 다이어그램입니다. 권한 분기와 인증 플로우도 함께 표시됩니다.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
                <span className="h-2 w-2 rounded-full bg-blue-500" />
                Top-level routes · {totalRoutes}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Sub-features · {totalLeaves}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                Admin-only · {adminOnly}
              </span>
            </div>
          </div>

          <div className="relative w-full max-w-md">
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="페이지 / 경로 / 기능 이름으로 검색…"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm shadow-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </header>

        <div className="flex flex-col gap-6">
          {filteredSections.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center text-sm text-slate-500">
              일치하는 라우트나 기능이 없습니다.
            </div>
          ) : (
            filteredSections.map((section) => {
              const accent = ACCENT_STYLES[section.accent];

              return (
                <section
                  key={section.id}
                  className={`overflow-hidden rounded-2xl border ${accent.ring} bg-white shadow-sm`}
                >
                  <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-4">
                    <span className={`h-8 w-1.5 rounded-full ${accent.bar}`} aria-hidden />
                    <div className="flex flex-1 flex-col">
                      <h2 className="text-lg font-bold tracking-tight text-slate-900">
                        {section.title}
                      </h2>
                      <p className="text-xs text-slate-500">{section.subtitle}</p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-[11px] font-semibold ${accent.pillBg} ${accent.pillText}`}
                    >
                      {section.branches.length} routes
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-4 px-6 py-5 md:grid-cols-2">
                    {section.branches.map((branch) => (
                      <article
                        key={branch.id}
                        className="group flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50/50 p-4 transition hover:border-blue-300 hover:bg-white hover:shadow-md"
                      >
                        <header className="flex flex-wrap items-center justify-between gap-2">
                          <h3 className="flex items-center text-sm font-bold text-slate-900">
                            {branch.label}
                            {branch.adminOnly ? <AdminBadge /> : null}
                          </h3>
                          {branch.path ? <PathPill path={branch.path} /> : null}
                        </header>

                        {branch.description ? (
                          <p className="text-xs leading-relaxed text-slate-600">
                            {branch.description}
                          </p>
                        ) : null}

                        {branch.children && branch.children.length > 0 ? (
                          <ul className="flex flex-col gap-1.5 border-l-2 border-slate-200 pl-3">
                            {branch.children.map((leaf) => (
                              <li
                                key={`${branch.id}-${leaf.label}`}
                                className="flex items-center text-[12px] text-slate-700"
                              >
                                <span className="mr-2 inline-block h-1 w-1.5 rounded-full bg-slate-400" />
                                <span>{leaf.label}</span>
                                {leaf.adminOnly ? <AdminBadge /> : null}
                                {leaf.testOnly ? <TestBadge /> : null}
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </article>
                    ))}
                  </div>
                </section>
              );
            })
          )}
        </div>

        <footer className="rounded-2xl border border-slate-200 bg-slate-50/60 px-6 py-5">
          <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Legend
          </h3>
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-700">
            <span className="inline-flex items-center gap-2">
              <PathPill path="/path" />
              <span>실제 라우트 경로</span>
            </span>
            <span className="inline-flex items-center gap-2">
              <AdminBadge />
              <span>관리자(isAdmin)만 접근 가능</span>
            </span>
            <span className="inline-flex items-center gap-2">
              <TestBadge />
              <span>테스트 사용자 전용 화면</span>
            </span>
          </div>
        </footer>
      </div>
    </section>
  );
}
