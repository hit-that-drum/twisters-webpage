import type { ReactElement } from 'react';
import { FaGithub } from 'react-icons/fa';
import { SiVelog } from 'react-icons/si';
import LanguageIcon from '@/assets/language-icon.svg';
import FrontendIcon from '@/assets/frontend-icon.svg';
import BackendIcon from '@/assets/backend-icon.svg';
import DevopsIcon from '@/assets/dev-ops-icon.svg';
import KnouIcon from '@/assets/knou-icon.png';
import HanyangIcon from '@/assets/hanyang-icon.png';

// TECHNICAL SKILLS
type SkillCategory = {
  title: string;
  icon: string;
  items: string[];
};

export const skillCategories: SkillCategory[] = [
  {
    title: 'Language',
    icon: LanguageIcon,
    items: ['TypeScript', 'JavaScript'],
  },
  {
    title: 'Frontend Architecture',
    icon: FrontendIcon,
    items: [
      'React',
      'Next.js',
      'Tailwind CSS',
      'Zustand',
      'Recoil',
      'React-Query',
      'Vite',
      'Styled-Component',
      'Redux',
    ],
  },
  {
    title: 'Backend Engineering',
    icon: BackendIcon,
    items: ['Node.js', 'PostgreSQL', 'Supabase'],
  },
  {
    title: 'Systems & Deployment',
    icon: DevopsIcon,
    items: ['Docker', 'CI/CD', 'Vercel'],
  },
];

// SOCIAL LINK
type socialLink = {
  title: string;
  icon: ReactElement;
  description: string;
  link: string;
};

export const socialLinks: socialLink[] = [
  {
    title: 'GitHub',
    icon: <FaGithub />,
    description: 'View source code for personal repositories.',
    link: 'https://github.com/hit-that-drum?tab=repositories',
  },
  {
    title: 'Dev Blog',
    icon: <SiVelog />,
    description: 'Maintain records as a Frontend Developer.',
    link: 'https://velog.io/@hit-that-drum/posts',
  },
];

// CAREER
type SubTask = {
  title: string;
  period: string;
  tech?: string[];
  details: string[];
};

type CareerItem = {
  company: string;
  period: string;
  role: string;
  employmentType?: string;
  summary: string[];
  active?: boolean;
  subTasks?: SubTask[];
};

export const timeline: CareerItem[] = [
  {
    company: '주식회사 현대벤디스',
    period: '2022.10 - 재직중',
    role: '웹 프론트엔드 매니저',
    employmentType: '정규직',
    active: true,
    summary: [
      '식권대장 서비스 전반의 웹 프론트엔드 개발 및 운영보수를 담당.',
      '레거시 관리 시스템 개편과 통합 백오피스(VONE) 신규 개발에 참여.',
      '프론트엔드 개발 표준화, 코드 리뷰, API 인터페이스 정합성 조율 등 협업 프로세스 개선 주도.',
    ],
    subTasks: [
      {
        title: '식권대장 통합 백오피스(VONE) 신규 개발 및 운영보수',
        period: '2024.10 - 2025.12',
        tech: ['React', 'TypeScript', 'AG Grid', 'Formik'],
        details: [
          '10년 이상 운영된 레거시 관리 시스템 개편에 참여하며 신규 프로젝트를 제로베이스부터 설계 및 개발.',
          '팀 내 코드 리뷰와 논의를 통해 코드 컨벤션 수립 및 표준화 작업 진행.',
          '가독성과 유지보수성을 고려한 클린 코드 작성 원칙을 정립하고 적용.',
          '핵심 화면을 컴포넌트화하고 테이블/폼 라이브러리를 적용하여 개발 생산성 향상.',
          '백엔드 팀과 협업하여 API 명세 규칙 정의 및 인터페이스 정합성 조율.',
          '백오피스 사이트, 내부 관리자사이트, 정산 사이트의 통합 백오피스 차세대 개발 완수.',
        ],
      },
      {
        title: '식권대장 관리 사이트 유지 개발 및 운영보수',
        period: '2022.10 - 2026.02',
        tech: ['React', 'TypeScript', 'React Query', 'Redux', 'MobX', 'PHP', 'HTML', 'CSS'],
        details: [
          '식권대장 앱 웹뷰, 공식 홈페이지, 기업 관리자사이트, 제휴점 관리자사이트, 내부 관리자사이트 등 다양한 서비스 운영 및 유지보수.',
          '모바일 웹뷰 특성에 맞는 UI 구조를 고민하며 개발 수행.',
          '레거시 코드를 분석하고, 사이드이펙트를 최소화하는 방향으로 요구사항 반영.',
          '앱과 웹 간 정보 불일치 이슈 발견 시 관련 팀과 기준을 조율하고 화면 및 API 계약을 정비.',
          '내부 실무자 피드백을 빠르게 반영하며 업무 효율 중심의 기능 개발 수행.',
        ],
      },
      {
        title: '식권대장 앱 웹뷰',
        period: '운영 기간 중 담당',
        tech: ['React', 'TypeScript', 'React Query'],
        details: [
          '앱뷰와 웹뷰가 혼합된 하이브리드 구조에서 웹뷰 영역 개발 담당.',
          '회사 내부 규칙에 따른 앱-웹 통신 규칙을 이해하고 적용.',
          '쇼핑몰 형식 화면 등 모바일 환경에 적합한 UI/UX를 고려하여 개발.',
        ],
      },
      {
        title: '식권대장 공식 홈페이지',
        period: '운영 기간 중 담당',
        tech: ['PHP', 'HTML', 'CSS'],
        details: [
          '신규 페이지 개발을 주로 담당.',
          '모바일 페이지 특성을 고려하여 반응형 디자인 중심으로 구현.',
        ],
      },
      {
        title: '식권대장 기업 관리자사이트 대장마켓플레이스',
        period: '운영 기간 중 담당',
        tech: ['React', 'JavaScript', 'Redux'],
        details: [
          '레거시 코드 분석 후 요구사항 반영.',
          '운영 중인 관리자 서비스 특성을 고려해 사이드이펙트를 최소화하며 개발.',
        ],
      },
      {
        title: '식권대장 제휴점 관리자사이트 식권대장 사장님',
        period: '운영 기간 중 담당',
        tech: ['React', 'JavaScript', 'TypeScript', 'React Query'],
        details: [
          '앱에서 처리하기 어려운 엑셀 및 복잡한 데이터 중심 화면 개발.',
          '앱/웹 간 동일 기능의 정보 불일치 문제를 조율하고 화면 및 API 계약 정비.',
          '운영 리스크를 줄이고 동일한 정보를 제공할 수 있도록 개선.',
        ],
      },
      {
        title: '식권대장 내부 관리자사이트 NGR',
        period: '운영 기간 중 담당',
        tech: ['React', 'JavaScript', 'MobX'],
        details: [
          '내부 실무자들이 사용하는 시스템으로, 빠른 기능 개발과 피드백 반영에 집중.',
          '사소한 피드백까지 적극 반영하며 다양한 팀과 협업 경험 축적.',
        ],
      },
    ],
  },
  {
    company: '(주)스타제이엔터테인먼트',
    period: '2015.04 - 2021.06',
    role: '홍보마케팅 대리',
    employmentType: '정규직',
    summary: [
      '배우 매니지먼트 및 홍보 업무 전반을 담당.',
      '보도자료 작성 및 배포, 인터뷰 기사 작성, 대본 및 시나리오 모니터링, SNS 채널 운영 수행.',
    ],
    subTasks: [
      {
        title: '배우 매니지먼트 및 홍보 담당',
        period: '2015.04 - 2021.05',
        details: [
          '소속 아티스트 관련 보도자료 작성 및 발송.',
          '소속 아티스트 인터뷰 기사 작성 및 컨펌.',
          '대본 및 시나리오 모니터링.',
          '회사 SNS 채널 관리 및 운영.',
        ],
      },
      {
        title: '부산국제영화제 아시아콘텐츠어워즈(ACA) 행사 담당',
        period: '2019.06 - 2020.11',
        details: ['행사 입찰, 행사 준비, RSVP, 현장 진행요원 운영, 결과보고까지 행사 전반 진행.'],
      },
      {
        title: 'NetKAL 1기 - 3기 행정 지원',
        period: '2017.10 - 2020.03',
        details: ['차세대 한인 지도자 육성 프로그램의 행정 보조, 섭외 및 행사 진행 실무 담당.'],
      },
      {
        title: '간송데이 행사 담당',
        period: '2017.04 - 2017.05',
        details: [
          "'훈민정음과 난중일기: 다시, 바라보다' 전시 프리오픈 행사 기획 및 운영 전반 참여.",
        ],
      },
      {
        title: 'OCN 드라마 <동네의 영웅> 홍보 담당',
        period: '2015.10 - 2016.03',
        details: [
          '대본 모니터링 및 수정, 자료 발송.',
          '드라마 관련 보도자료 및 홍보자료 작성 및 발송.',
          '드라마 모니터링 보도자료 작성 및 발송.',
        ],
      },
    ],
  },
];

// EDUCATION
type EducationItem = {
  school: string;
  period: string;
  status?: string;
  major?: string;
  minor?: string;
  course?: string;
  summary?: string[];
  details?: string[];
  icon?: string;
};

export const educationItems: EducationItem[] = [
  {
    school: '원티드 x 코드스테이츠 프론트엔드 프리온보딩 코스',
    period: '2022.02 - 2022.03',
    status: '수료',
    course: '웹 프론트엔드',
    summary: ['8개의 기업 과제를 팀원들과 함께 수행하며 협업 역량을 강화했습니다.'],
  },
  {
    school: '코드스테이츠(Code States)',
    period: '2021.06 - 2022.01',
    status: '수료',
    course: 'Software Engineering Bootcamp 34기',
    summary: ['JavaScript 기반 풀스택 과정 수료'],
    details: [
      'JavaScript/Node.js, HTML, CSS 기초',
      'Linux, Git 기초',
      'DOM, React 기초',
      'HTTP/네트워크, 비동기 기초',
      '자료구조와 알고리즘',
      'Redux 상태관리',
      'RDBMS, MVC, 인증/보안 기초',
      'AWS 배포 기초(S3, CloudFront, EC2, ELB, RDS, Route53)',
      '2인 페어 학습을 통한 커뮤니케이션 능력 강화',
      '4인 프로젝트를 통한 협업 및 프로젝트 진행 경험',
    ],
  },
  {
    school: '한국방송통신대학교',
    period: '2020.03 - 2024.02',
    status: '졸업',
    major: '컴퓨터과학과',
    minor: '법학과(복수전공)',
    icon: KnouIcon,
  },
  {
    school: '한양대학교 ERICA 캠퍼스',
    period: '2009.03 - 2015.08',
    status: '졸업',
    major: '중국학과',
    minor: '신문방송학과(부전공)',
    icon: HanyangIcon,
  },
];

//CERTIFICATION
type CertificationItem = {
  name: string;
  period: string;
  issuer?: string;
  description?: string[];
  active?: boolean;
};

export const certificationItems: CertificationItem[] = [
  {
    name: 'SQLD (SQL 개발자 자격증)',
    period: '2023.09',
    issuer: '한국데이터산업진흥원',
    description: ['SQL 쿼리 작성 및 데이터 분석 역량 검증'],
    active: true,
  },
];

// LANGUAGE
type LanguageItem = {
  language: string;
  levelOne: string;
  levelTwo?: string;
  certificates?: {
    name: string;
    score?: string;
    date?: string;
  }[];
  description?: string[];
};

export const languageItems: LanguageItem[] = [
  {
    language: '영어',
    levelOne: '✅ 비즈니스 회화 가능',
    levelTwo: '✅ 읽기/쓰기 가능',
    certificates: [
      {
        name: 'TOEIC',
        score: '930',
        date: '2020.02.01',
      },
      {
        name: 'OPIC',
        score: 'IM2',
        date: '2020.02.01',
      },
    ],
  },
  {
    language: '일본어',
    levelOne: '✅ 비즈니스 회화 가능',
    levelTwo: '✅ 읽기/쓰기 가능',
    certificates: [
      {
        name: 'OPIC',
        score: 'AL',
        date: '2020.02.01',
      },
    ],
  },
  {
    language: '중국어',
    levelOne: '✅ 읽기/쓰기 가능',
  },
];

// const projects: Project[] = [
//   {
//     title: 'Vortex Financial Dash',
//     tags: ['Fintech', 'SaaS'],
//     description:
//       'Lead developer for a real-time trading dashboard handling 50k+ sockets simultaneously. Engineered a custom caching layer for ultra-low latency updates.',
//     image:
//       'https://lh3.googleusercontent.com/aida-public/AB6AXuCgWElRLBxziWDhRccHJI6m5gWtggimgkPJJ4n6U1lOE7O_oij7zX0ZhEEx4eU4SD24zMiFudUV23BB9GgQaRALG7FiOtKvUHITC-J5DcxoR1wzQgZK3kAQQsRyJ_yZALePP8Z6FRCsCiHQlXgfkegOvu4Y19zIQBbBWUhk8gDi5oaQp4o5jM_4Er0Exnvm-BCeFJHYV7EfRItPjpDRIxUHSKqYefMqbfC6PTZexjyMhmQWnyuv-Hp45mBBr4PLyOSeGozwclR5Awo',
//     links: [
//       { label: 'Read More', href: '#' },
//       { label: 'Live Demo', href: '#' },
//     ],
//   },
//   {
//     title: 'Aether Design Store',
//     tags: ['Ecommerce', 'Headless'],
//     description:
//       'A high-performance headless commerce platform using Shopify Storefront API and Next.js. Achieved a perfect 100/100 Lighthouse score across the board.',
//     image:
//       'https://lh3.googleusercontent.com/aida-public/AB6AXuDMETZeugUhzXDsJxxbfBzBSYDZnES8L6IOcgouZaUkP6EOy3J4SaHhdroVZtMKD-3FbmCg-TAmvh9XvTrWeNXP1vYKInOVsgMLMyLEiV5w34MoDCGv-2Xx7IKlkM3BMSJ0RZ5PdlEGneO2m0DF9l2SUtdP1C03o82PhSCLhbxSEziuGemeVoGn-41383FHM0XOz3ZwI50Cdk-G7lDAstzIpB722ZJ2uWx2ecq2n_qXUS2wXhKN2t7DywusJLiySlF2fKjp9xmUz0s',
//     links: [
//       { label: 'Read More', href: '#' },
//       { label: 'Live Demo', href: '#' },
//     ],
//   },
// ];
