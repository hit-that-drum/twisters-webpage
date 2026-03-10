# README.md

## 💻 프로젝트 개요 Project Overview

멤버들을 기반으로 한 커뮤니티 웹사이트입니다.<br>
사용자는 회원가입/로그인을 통해 사이트의 내부에 접근할 수 있으며 이는 관리자의 승인으로 인해 접근 가능합니다.<br>
관리자와 일반유저 간의 Role 기반 접근 제어를 통해 권한 관리가 이루어지며, 관리자의 공지 및 멤버 간의 상호작용이 이루어집니다.<br>

This is a community website based on registered members.<br>
Users can access the internal site through singup/login, and access is granted upon administrator approval.<br>
Role-based access control between administrators a nd regular users is implemented to manage permissions, enabling administrative announcements and interactions among members.<br>

---

### 테스트 계정

| Role   | Name        | Email                    | Password            |
| ------ | ----------- | ------------------------ | ------------------- |
| Admin  | TEST_ADMIN  | twistersAdmin@gmail.com  | twisters-admin-test |
| Member | TEST_MEMBER | twistersMember@gmail.com | twister-member-test |

<br>

- 회원가입시 NAME 부분에 "TEST"로 시작하는 이름으로 가입하면 테스트 계정으로 분류됩니다.
- 테스트 계정은 실제 DB가 아닌 테스트 DB의 정보로 각 페이지에 접근 가능합니다.
- ADMIN 계정은 모든 페이지에 대한 접근 및 CRUD 동작이 가능합니다.
- MEMBER 계정은 주로 READ 권한을 가지며 BOARD 페이지에서는 CRUD 동작이 가능합니다.

---
