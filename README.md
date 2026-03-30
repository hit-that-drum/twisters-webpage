# README.md

## 💻 프로젝트 개요 Project Overview

멤버들을 기반으로 한 커뮤니티 웹사이트입니다.<br>
사용자는 회원가입/로그인을 통해 사이트의 내부에 접근할 수 있으며 이는 관리자의 승인으로 인해 접근 가능합니다.<br>
관리자와 일반유저 간의 Role 기반 접근 제어를 통해 권한 관리가 이루어지며, 관리자의 공지 및 멤버 간의 상호작용이 이루어집니다.<br>

This is a community website based on registered members.<br>
Users can access the internal site through singup/login, and access is granted upon administrator approval.<br>
Role-based access control between administrators a nd regular users is implemented to manage permissions, enabling administrative announcements and interactions among members.<br>

<br>

## 🏗️ 기술스택 Architecture


### Frontend (`/frontend`)

- **React 19**
- **Vite**
- **TypeScript**
- **Tailwind CSS v4**
- **Material UI (MUI)**
- **Zustand**
- **notistack**
- **Google OAuth**


### Backend (`/backend`)

- **Node.js**
- **Express 5**
- **TypeScript**
- **ES Modules**
- **Passport.js**
  - `LocalStrategy`
  - `JwtStrategy`
- **JWT + Refresh Token**
- **PostgreSQL**


### Database
- **PostgreSQL 16**
- Driver: **pg**
- Local DB bootstrapped with:
  - `docker-compose.yml`
  - `init.sql`

### Infra
- **Docker Compose**
  - Runs local frontend / backend / PostgreSQL environment
- **Vercel**
  - Backend is deployed through a serverless adapter (`backend/api/[...route].ts`)
- **Supabase-hosted PostgreSQL support**
  - The backend reads DB connection from `SUPABASE_DB_URL` or `DATABASE_URL`

### 인증 / 권한 구조
- Email/password login via `LocalStrategy`
- JWT authentication via `JwtStrategy`
- Refresh-token based session renewal
- Admin approval flow for account activation
- Google OAuth login
- Kakao OAuth login
- Role-based access control for admin/member permissions


### 기술스택을 선택한 이유

- **React + Vite + TypeScript**
  - 빠른 개발 속도와 안정적인 타입 체크를 함께 가져가기 좋음
  - 화면 단위 기능이 많은 프로젝트에서 유지보수성과 생산성을 동시에 확보할 수 있음
- **Tailwind CSS + MUI**
  - Tailwind로 빠르게 레이아웃을 구성하고
  - MUI로 Dialog, Input, Date Picker 같은 복잡한 UI를 안정적으로 재사용할 수 있음
- **Zustand**
  - 인증 상태처럼 전역에서 공유해야 하는 데이터를 가볍게 관리하기 좋음
  - Redux보다 설정이 단순해서 현재 프로젝트 규모에 더 잘 맞음
- **Express + Passport + JWT**
  - 로그인, OAuth, 관리자 승인, 세션 갱신 같은 인증 흐름을 세밀하게 직접 제어할 수 있음
  - 단순 로그인뿐 아니라 승인 기반 커뮤니티 구조에 맞는 권한 로직을 구현하기 쉬움
- **PostgreSQL**
  - 사용자, 권한, 게시판, 정산, 공지처럼 관계형 데이터가 많은 구조에 적합함
  - SQL 기반으로 데이터 구조를 명확하게 유지할 수 있고 확장에도 유리함
- **Docker Compose**
  - 로컬 개발 환경을 프론트엔드 / 백엔드 / DB까지 한 번에 맞출 수 있어 협업과 재현성이 좋음
- **Vercel**
  - 배포 구성이 단순하고 서버리스 형태로 운영하기 쉬움
  - 빠르게 배포하고 확인하는 개발 흐름에 잘 맞음

- 프론트엔드 중심으로 SaaS를 빠르게 만들고 타입 안정성과 인프라 최소화를 고려하여 안전하게 확장하기 위해 이 조합을 선택

---

### 테스트 계정

| Role   | Name        | Email                    | Password            |
| ------ | ----------- |--------------------------| ------------------- |
| Admin  | TEST_ADMIN  | twistersadmin@gmail.com  | twisters-admin-test |
| Member | TEST_MEMBER | twistersmember@gmail.com | twister-member-test |

<br>

- 회원가입시 NAME 부분에 "TEST"로 시작하는 이름으로 가입하면 테스트 계정으로 분류됩니다.
- 테스트 계정은 실제 DB가 아닌 테스트 DB의 정보로 각 페이지에 접근 가능합니다.
- ADMIN 계정은 모든 페이지에 대한 접근 및 CRUD 동작이 가능합니다.
- MEMBER 계정은 주로 READ 권한을 가지며 BOARD 페이지에서는 CRUD 동작이 가능합니다.

---
