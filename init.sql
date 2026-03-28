--
-- PostgreSQL database dump
--

\restrict 2YF2hPpYRfOmyG5vXyT5vCv3dOMymx1KIbLZ22UIedYMGETfDSN7kJZPavie2gC

-- Dumped from database version 16.12 (Debian 16.12-1.pgdg13+1)
-- Dumped by pg_dump version 16.12 (Debian 16.12-1.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE IF EXISTS ONLY public.user_sessions DROP CONSTRAINT IF EXISTS user_sessions_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.password_reset_tokens DROP CONSTRAINT IF EXISTS password_reset_tokens_user_id_fkey;
DROP TRIGGER IF EXISTS trg_notice_update_date ON public.notice;
DROP INDEX IF EXISTS public.idx_user_sessions_user_id;
DROP INDEX IF EXISTS public.idx_user_sessions_idle_expires_at;
DROP INDEX IF EXISTS public.idx_settlement_unique_entry;
DROP INDEX IF EXISTS public.idx_settlement_date;
DROP INDEX IF EXISTS public.idx_password_reset_user;
DROP INDEX IF EXISTS public.idx_password_reset_expires;
DROP INDEX IF EXISTS public.idx_members_role;
DROP INDEX IF EXISTS public.idx_members_email_lower;
DROP INDEX IF EXISTS public.idx_members_department;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_pkey;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_email_key;
ALTER TABLE IF EXISTS ONLY public.user_sessions DROP CONSTRAINT IF EXISTS user_sessions_refresh_token_hash_key;
ALTER TABLE IF EXISTS ONLY public.user_sessions DROP CONSTRAINT IF EXISTS user_sessions_pkey;
ALTER TABLE IF EXISTS ONLY public.settlement DROP CONSTRAINT IF EXISTS settlement_pkey;
ALTER TABLE IF EXISTS ONLY public.password_reset_tokens DROP CONSTRAINT IF EXISTS password_reset_tokens_token_hash_key;
ALTER TABLE IF EXISTS ONLY public.password_reset_tokens DROP CONSTRAINT IF EXISTS password_reset_tokens_pkey;
ALTER TABLE IF EXISTS ONLY public.notice DROP CONSTRAINT IF EXISTS notice_pkey;
ALTER TABLE IF EXISTS ONLY public.members DROP CONSTRAINT IF EXISTS members_pkey;
DROP TABLE IF EXISTS public.users;
DROP TABLE IF EXISTS public.user_sessions;
DROP TABLE IF EXISTS public.settlement;
DROP TABLE IF EXISTS public.password_reset_tokens;
DROP TABLE IF EXISTS public.notice;
DROP TABLE IF EXISTS public.board_comments;
DROP TABLE IF EXISTS public.board;
DROP TABLE IF EXISTS public.members;
DROP FUNCTION IF EXISTS public.update_board_comment_updated_at();
DROP FUNCTION IF EXISTS public.update_board_updated_at();
DROP FUNCTION IF EXISTS public.update_notice_updated_at();
--
-- Name: update_notice_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_notice_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW."updateDate" = NOW();
  RETURN NEW;
END;
$$;
CREATE FUNCTION public.update_board_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW."updateDate" = NOW();
  RETURN NEW;
END;
$$;
CREATE FUNCTION public.update_board_comment_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.members (
    id integer NOT NULL,
    phone character varying(30),
    department character varying(100),
    joined_at date,
    birth_date date,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    name character varying(100) NOT NULL,
    email character varying(100),
    is_admin boolean DEFAULT false NOT NULL
);


--
-- Name: members_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.members ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.members_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: notice; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notice (
    id integer NOT NULL,
    title character varying(255) NOT NULL,
    "createUser" character varying(100) NOT NULL,
    "createDate" timestamp with time zone DEFAULT now() NOT NULL,
    "updateUser" character varying(100) NOT NULL,
    "updateDate" timestamp with time zone DEFAULT now() NOT NULL,
    content text NOT NULL,
    "imageUrl" text,
    pinned boolean DEFAULT false NOT NULL
);
CREATE TABLE public.board (
    id integer NOT NULL,
    "authorId" integer,
    title character varying(255) NOT NULL,
    "createUser" character varying(100) NOT NULL,
    "createDate" timestamp with time zone DEFAULT now() NOT NULL,
    "updateUser" character varying(100) NOT NULL,
    "updateDate" timestamp with time zone DEFAULT now() NOT NULL,
    "imageUrl" text[] DEFAULT ARRAY[]::text[] NOT NULL,
    content text NOT NULL,
    pinned boolean DEFAULT false NOT NULL
);
CREATE TABLE public.board_comments (
    id integer NOT NULL,
    "boardId" integer NOT NULL,
    "authorId" integer,
    "authorName" character varying(100) NOT NULL,
    content text NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: notice_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.notice ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.notice_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);
ALTER TABLE public.board ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.board_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);
ALTER TABLE public.board_comments ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.board_comments_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: password_reset_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.password_reset_tokens (
    id integer NOT NULL,
    user_id integer NOT NULL,
    token_hash character(64) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    used_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: password_reset_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.password_reset_tokens ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.password_reset_tokens_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: settlement; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.settlement (
    id integer NOT NULL,
    settlement_date date NOT NULL,
    item character varying(255) NOT NULL,
    amount integer NOT NULL,
    relation character varying(100) NOT NULL
);


--
-- Name: settlement_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.settlement ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.settlement_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: user_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_sessions (
    id bigint NOT NULL,
    user_id integer NOT NULL,
    refresh_token_hash character(64) NOT NULL,
    remember_me boolean DEFAULT false NOT NULL,
    last_activity_at timestamp with time zone DEFAULT now() NOT NULL,
    idle_expires_at timestamp with time zone NOT NULL,
    absolute_expires_at timestamp with time zone NOT NULL,
    revoked_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.user_sessions ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.user_sessions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    email character varying(100) NOT NULL,
    password character varying(255),
    google_id character varying(255),
    kakao_id character varying(255),
    "profileImage" text,
    "isAdmin" boolean DEFAULT false NOT NULL,
    "isAllowed" boolean DEFAULT false NOT NULL,
    "isTest" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.users ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Data for Name: members; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.members (id, phone, department, joined_at, birth_date, created_at, updated_at, name, email, is_admin) OVERRIDING SYSTEM VALUE VALUES (5, NULL, NULL, NULL, NULL, '2026-02-16 09:34:01.755518+00', '2026-02-16 09:34:01.755518+00', '김혜영', NULL, false);
INSERT INTO public.members (id, phone, department, joined_at, birth_date, created_at, updated_at, name, email, is_admin) OVERRIDING SYSTEM VALUE VALUES (6, NULL, NULL, NULL, NULL, '2026-02-16 09:34:09.459629+00', '2026-02-16 09:34:09.459629+00', '서예진', NULL, false);
INSERT INTO public.members (id, phone, department, joined_at, birth_date, created_at, updated_at, name, email, is_admin) OVERRIDING SYSTEM VALUE VALUES (7, NULL, NULL, NULL, NULL, '2026-02-16 09:34:16.612317+00', '2026-02-16 09:34:16.612317+00', '박정수', NULL, false);
INSERT INTO public.members (id, phone, department, joined_at, birth_date, created_at, updated_at, name, email, is_admin) OVERRIDING SYSTEM VALUE VALUES (8, NULL, NULL, NULL, NULL, '2026-02-16 09:34:22.230392+00', '2026-02-16 09:34:22.230392+00', '기재권', NULL, false);
INSERT INTO public.members (id, phone, department, joined_at, birth_date, created_at, updated_at, name, email, is_admin) OVERRIDING SYSTEM VALUE VALUES (9, NULL, NULL, NULL, NULL, '2026-02-16 09:34:27.447674+00', '2026-02-16 09:34:27.447674+00', '정혁', NULL, false);
INSERT INTO public.members (id, phone, department, joined_at, birth_date, created_at, updated_at, name, email, is_admin) OVERRIDING SYSTEM VALUE VALUES (10, NULL, NULL, NULL, NULL, '2026-02-16 09:34:33.389363+00', '2026-02-16 09:34:33.389363+00', '양동수', NULL, false);
INSERT INTO public.members (id, phone, department, joined_at, birth_date, created_at, updated_at, name, email, is_admin) OVERRIDING SYSTEM VALUE VALUES (11, NULL, NULL, NULL, NULL, '2026-02-16 09:34:37.585784+00', '2026-02-16 09:34:37.585784+00', '정재근', NULL, false);
INSERT INTO public.members (id, phone, department, joined_at, birth_date, created_at, updated_at, name, email, is_admin) OVERRIDING SYSTEM VALUE VALUES (12, NULL, NULL, NULL, NULL, '2026-02-16 09:34:42.28372+00', '2026-02-16 09:34:42.28372+00', '박성모', NULL, false);
INSERT INTO public.members (id, phone, department, joined_at, birth_date, created_at, updated_at, name, email, is_admin) OVERRIDING SYSTEM VALUE VALUES (13, NULL, NULL, NULL, NULL, '2026-02-16 09:34:49.986108+00', '2026-02-16 09:34:49.986108+00', '이은실', NULL, false);
INSERT INTO public.members (id, phone, department, joined_at, birth_date, created_at, updated_at, name, email, is_admin) OVERRIDING SYSTEM VALUE VALUES (14, NULL, NULL, NULL, NULL, '2026-02-16 09:34:54.087016+00', '2026-02-16 09:34:54.087016+00', '이정', NULL, false);
INSERT INTO public.members (id, phone, department, joined_at, birth_date, created_at, updated_at, name, email, is_admin) OVERRIDING SYSTEM VALUE VALUES (15, NULL, NULL, NULL, NULL, '2026-02-16 09:34:59.976012+00', '2026-02-16 09:34:59.976012+00', '이재훈', NULL, false);
INSERT INTO public.members (id, phone, department, joined_at, birth_date, created_at, updated_at, name, email, is_admin) OVERRIDING SYSTEM VALUE VALUES (16, NULL, NULL, NULL, NULL, '2026-02-16 09:35:49.761166+00', '2026-02-16 09:35:49.761166+00', '전충진', NULL, false);


--
-- Data for Name: notice; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.notice (id, title, "createUser", "createDate", "updateUser", "updateDate", content, pinned) OVERRIDING SYSTEM VALUE VALUES (1, '카카오뱅크 모임통장 계좌번호', 'HYE', '2026-02-14 04:48:10.590886+00', 'HYE', '2026-02-14 04:48:10.590886+00', '3333-29-1641307', true);
INSERT INTO public.notice (id, title, "createUser", "createDate", "updateUser", "updateDate", content, pinned) OVERRIDING SYSTEM VALUE VALUES (2, '모임 날짜 관련', 'HYE', '2026-02-14 04:48:49.532711+00', 'HYE', '2026-02-14 04:48:49.532711+00', '- 지방이거나 할 경우에는 평일 저녁 약속에 참석이 힘든 경우가 많으니 토요일로 고정하기로 함.
- 1년에 2번이니까 6월 마지막 주 토요일, 11월 마지막 주 토요일.
- 기억해서 날짜 빼놓기.
- 해당 월마다 알리미는 총무(김혜영)가 알아서 여러번 리마인드 하기.', false);
INSERT INTO public.notice (id, title, "createUser", "createDate", "updateUser", "updateDate", content, pinned) OVERRIDING SYSTEM VALUE VALUES (3, '회비 관련', 'HYE', '2026-02-14 04:49:11.428995+00', 'HYE', '2026-02-14 04:49:11.428995+00', '- 지방인들은 참석률이 저조하니 회비를 반액만 받기로 결정
- 1차 모임에서 40% 한도까지 쓰고 초과된 비용은 참석자들이 부담, 40% 이하로 썼을 때는 남은 금액 2차 모임으로 금액 넘어감.
- 2차 모임에서 60% 모두 소진. 소진 못 할 시에는 다음해로 금액 넘어감.', false);
INSERT INTO public.notice (id, title, "createUser", "createDate", "updateUser", "updateDate", content, pinned) OVERRIDING SYSTEM VALUE VALUES (4, '[2025년 11월 29일] 논의사항', 'HYE', '2026-02-14 04:49:34.741766+00', 'HYE', '2026-02-14 04:49:34.741766+00', '- 30만원 정도는 비상금으로 남기는 것은? 어떨지? (혁오빠가 맘대로 하라고 함)
- 다음 상반기 모임은 하이디라오로 결정.
- 다음번엔 오래 못 봤던 사람들한테도 연락을 해 보는 것이 어떨지?', false);


--
-- Data for Name: password_reset_tokens; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: settlement; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.settlement (id, settlement_date, item, amount, relation) OVERRIDING SYSTEM VALUE VALUES (57, '2023-12-22', '부엉이산장', -76000, '2023년');
INSERT INTO public.settlement (id, settlement_date, item, amount, relation) OVERRIDING SYSTEM VALUE VALUES (59, '2024-01-04', '이제훈 2024년 회비', 120000, '2024년');
INSERT INTO public.settlement (id, settlement_date, item, amount, relation) OVERRIDING SYSTEM VALUE VALUES (61, '2024-01-10', '박성모 2024년 회비', 60000, '2024년');
INSERT INTO public.settlement (id, settlement_date, item, amount, relation) OVERRIDING SYSTEM VALUE VALUES (60, '2024-01-06', '김혜영 2024년 회비', 120000, '2024년');
INSERT INTO public.settlement (id, settlement_date, item, amount, relation) OVERRIDING SYSTEM VALUE VALUES (58, '2024-01-03', '이은실 2024년 회비', 60000, '2024년');
INSERT INTO public.settlement (id, settlement_date, item, amount, relation) OVERRIDING SYSTEM VALUE VALUES (62, '2024-01-27', '이자', 33, '2024년');
INSERT INTO public.settlement (id, settlement_date, item, amount, relation) OVERRIDING SYSTEM VALUE VALUES (63, '2024-02-24', '이자', 41, '2024년');
INSERT INTO public.settlement (id, settlement_date, item, amount, relation) OVERRIDING SYSTEM VALUE VALUES (64, '2024-03-23', '이자', 41, '2024년');
INSERT INTO public.settlement (id, settlement_date, item, amount, relation) OVERRIDING SYSTEM VALUE VALUES (65, '2024-04-27', '이자', 51, '2024년');
INSERT INTO public.settlement (id, settlement_date, item, amount, relation) OVERRIDING SYSTEM VALUE VALUES (66, '2024-05-25', '이자', 41, '2024년');
INSERT INTO public.settlement (id, settlement_date, item, amount, relation) OVERRIDING SYSTEM VALUE VALUES (67, '2024-05-31', '서예진 2024년 회비', 120000, '2024년');
INSERT INTO public.settlement (id, settlement_date, item, amount, relation) OVERRIDING SYSTEM VALUE VALUES (68, '2024-05-31', '양동수 2024년 회비', 120000, '2024년');
INSERT INTO public.settlement (id, settlement_date, item, amount, relation) OVERRIDING SYSTEM VALUE VALUES (69, '2024-06-04', '전충진 2024년 회비', 120000, '2024년');
INSERT INTO public.settlement (id, settlement_date, item, amount, relation) OVERRIDING SYSTEM VALUE VALUES (70, '2024-06-29', '호보식당', -410000, '2024년');
INSERT INTO public.settlement (id, settlement_date, item, amount, relation) OVERRIDING SYSTEM VALUE VALUES (71, '2024-06-29', '텀블러비어', -46764, '2024년');
INSERT INTO public.settlement (id, settlement_date, item, amount, relation) OVERRIDING SYSTEM VALUE VALUES (72, '2024-06-29', '박정수 2024년 회비', 120000, '2024년');
INSERT INTO public.settlement (id, settlement_date, item, amount, relation) OVERRIDING SYSTEM VALUE VALUES (73, '2024-06-29', '정혁 2024년 회비', 120000, '2024년');
INSERT INTO public.settlement (id, settlement_date, item, amount, relation) OVERRIDING SYSTEM VALUE VALUES (74, '2024-06-29', '이자', 69, '2024년');
INSERT INTO public.settlement (id, settlement_date, item, amount, relation) OVERRIDING SYSTEM VALUE VALUES (75, '2024-07-01', '상반기 모임 정산', 164, '2024년');
INSERT INTO public.settlement (id, settlement_date, item, amount, relation) OVERRIDING SYSTEM VALUE VALUES (76, '2024-07-27', '이자', 55, '2024년');
INSERT INTO public.settlement (id, settlement_date, item, amount, relation) OVERRIDING SYSTEM VALUE VALUES (77, '2024-08-24', '이자', 52, '2024년');
INSERT INTO public.settlement (id, settlement_date, item, amount, relation) OVERRIDING SYSTEM VALUE VALUES (78, '2024-09-28', '이자', 65, '2024년');
INSERT INTO public.settlement (id, settlement_date, item, amount, relation) OVERRIDING SYSTEM VALUE VALUES (79, '2024-10-26', '이자', 52, '2024년');
INSERT INTO public.settlement (id, settlement_date, item, amount, relation) OVERRIDING SYSTEM VALUE VALUES (80, '2024-11-16', '한일관', -656000, '2024년');
INSERT INTO public.settlement (id, settlement_date, item, amount, relation) OVERRIDING SYSTEM VALUE VALUES (81, '2024-11-18', '정재근 2024년 회비', 120000, '2024년');
INSERT INTO public.settlement (id, settlement_date, item, amount, relation) OVERRIDING SYSTEM VALUE VALUES (82, '2024-11-23', '이자', 45, '2024년');
INSERT INTO public.settlement (id, settlement_date, item, amount, relation) OVERRIDING SYSTEM VALUE VALUES (83, '2024-12-28', '이자', 14, '2024년');
INSERT INTO public.settlement (id, settlement_date, item, amount, relation) OVERRIDING SYSTEM VALUE VALUES (84, '2025-01-25', '이자', 11, '2025년');
INSERT INTO public.settlement (id, settlement_date, item, amount, relation) OVERRIDING SYSTEM VALUE VALUES (85, '2025-03-01', '이자', 14, '2025년');
INSERT INTO public.settlement (id, settlement_date, item, amount, relation) OVERRIDING SYSTEM VALUE VALUES (86, '2025-03-29', '이자', 11, '2025년');
INSERT INTO public.settlement (id, settlement_date, item, amount, relation) OVERRIDING SYSTEM VALUE VALUES (87, '2025-04-26', '이자', 11, '2025년');
INSERT INTO public.settlement (id, settlement_date, item, amount, relation) OVERRIDING SYSTEM VALUE VALUES (88, '2025-05-07', '이재훈 2025년 회비', 120000, '2025년');
INSERT INTO public.settlement (id, settlement_date, item, amount, relation) OVERRIDING SYSTEM VALUE VALUES (89, '2025-05-08', '김혜영 2025년 회비', 120000, '2025년');
INSERT INTO public.settlement (id, settlement_date, item, amount, relation) OVERRIDING SYSTEM VALUE VALUES (90, '2025-05-08', '정혁 2025년 회비', 120000, '2025년');
INSERT INTO public.settlement (id, settlement_date, item, amount, relation) OVERRIDING SYSTEM VALUE VALUES (91, '2025-05-08', '전충진 2025년 회비', 120000, '2025년');
INSERT INTO public.settlement (id, settlement_date, item, amount, relation) OVERRIDING SYSTEM VALUE VALUES (92, '2025-05-08', '서예진 2025년 회비', 120000, '2025년');
INSERT INTO public.settlement (id, settlement_date, item, amount, relation) OVERRIDING SYSTEM VALUE VALUES (93, '2025-05-08', '박정수 2025년 회비', 120000, '2025년');
INSERT INTO public.settlement (id, settlement_date, item, amount, relation) OVERRIDING SYSTEM VALUE VALUES (94, '2025-05-14', '박성모 2025년 회비', 60000, '2025년');
INSERT INTO public.settlement (id, settlement_date, item, amount, relation) OVERRIDING SYSTEM VALUE VALUES (95, '2025-05-16', '이은실 2025년 회비', 60000, '2025년');
INSERT INTO public.settlement (id, settlement_date, item, amount, relation) OVERRIDING SYSTEM VALUE VALUES (97, '2025-06-21', '서궁', -190000, '2025년');
INSERT INTO public.settlement (id, settlement_date, item, amount, relation) OVERRIDING SYSTEM VALUE VALUES (98, '2025-06-21', '고릴라쉐프', -219000, '2025년');
INSERT INTO public.settlement (id, settlement_date, item, amount, relation) OVERRIDING SYSTEM VALUE VALUES (99, '2025-06-21', '노래방', -102000, '2025년');
INSERT INTO public.settlement (id, settlement_date, item, amount, relation) OVERRIDING SYSTEM VALUE VALUES (100, '2025-06-23', '상반기 모임 정산', 115128, '2025년');
INSERT INTO public.settlement (id, settlement_date, item, amount, relation) OVERRIDING SYSTEM VALUE VALUES (101, '2025-06-23', '이정 2025년 회비', 120000, '2025년');
INSERT INTO public.settlement (id, settlement_date, item, amount, relation) OVERRIDING SYSTEM VALUE VALUES (102, '2025-06-28', '이자', 81, '2025년');
INSERT INTO public.settlement (id, settlement_date, item, amount, relation) OVERRIDING SYSTEM VALUE VALUES (103, '2025-07-26', '이자', 54, '2025년');
INSERT INTO public.settlement (id, settlement_date, item, amount, relation) OVERRIDING SYSTEM VALUE VALUES (104, '2025-08-23', '이자', 54, '2025년');
INSERT INTO public.settlement (id, settlement_date, item, amount, relation) OVERRIDING SYSTEM VALUE VALUES (105, '2025-09-27', '이자', 68, '2025년');
INSERT INTO public.settlement (id, settlement_date, item, amount, relation) OVERRIDING SYSTEM VALUE VALUES (106, '2025-10-25', '이자', 54, '2025년');
INSERT INTO public.settlement (id, settlement_date, item, amount, relation) OVERRIDING SYSTEM VALUE VALUES (52, '2023-12-21', '2023년 잔금', 859435, '2023년');
INSERT INTO public.settlement (id, settlement_date, item, amount, relation) OVERRIDING SYSTEM VALUE VALUES (107, '2025-11-29', '이자', 68, '2025년');
INSERT INTO public.settlement (id, settlement_date, item, amount, relation) OVERRIDING SYSTEM VALUE VALUES (108, '2025-11-29', '피양옥', -230000, '2025년');
INSERT INTO public.settlement (id, settlement_date, item, amount, relation) OVERRIDING SYSTEM VALUE VALUES (55, '2023-12-22', '일편등심', -484000, '2023년');
INSERT INTO public.settlement (id, settlement_date, item, amount, relation) OVERRIDING SYSTEM VALUE VALUES (56, '2023-12-22', '더블린테라스', -117800, '2023년');
INSERT INTO public.settlement (id, settlement_date, item, amount, relation) OVERRIDING SYSTEM VALUE VALUES (109, '2025-11-29', '원당감자탕', -100500, '2025년');
INSERT INTO public.settlement (id, settlement_date, item, amount, relation) OVERRIDING SYSTEM VALUE VALUES (96, '2025-05-24', '이자', 46, '2025년');
INSERT INTO public.settlement (id, settlement_date, item, amount, relation) OVERRIDING SYSTEM VALUE VALUES (110, '2025-12-27', '이자', 37, '2025년');
INSERT INTO public.settlement (id, settlement_date, item, amount, relation) OVERRIDING SYSTEM VALUE VALUES (111, '2026-01-24', '이자', 29, '2026년');


--
-- Data for Name: user_sessions; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.user_sessions (id, user_id, refresh_token_hash, remember_me, last_activity_at, idle_expires_at, absolute_expires_at, revoked_at, created_at, updated_at) OVERRIDING SYSTEM VALUE VALUES (1, 1, 'f5cf4b0cf5078d418e15c49ad01839ccb0ae19c288f72c57d7eb3fecf5afdd14', false, '2026-02-16 14:33:56.254504+00', '2026-02-16 15:33:56.254504+00', '2026-02-23 06:19:58.435566+00', '2026-02-16 17:46:07.422539+00', '2026-02-16 06:19:58.435566+00', '2026-02-16 17:46:07.422539+00');
INSERT INTO public.user_sessions (id, user_id, refresh_token_hash, remember_me, last_activity_at, idle_expires_at, absolute_expires_at, revoked_at, created_at, updated_at) OVERRIDING SYSTEM VALUE VALUES (2, 1, '7275ca269f0680a834fa802d65c3889cb3a5267072f7d5bdb1d8579d2fde85ac', false, '2026-02-20 07:20:09.253946+00', '2026-02-20 08:20:09.253946+00', '2026-02-27 07:16:08.86555+00', '2026-02-20 07:20:17.363153+00', '2026-02-20 07:16:08.86555+00', '2026-02-20 07:20:17.363153+00');


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.users (id, name, email, password, google_id, "isAdmin", "isAllowed", "isTest", "createdAt") OVERRIDING SYSTEM VALUE VALUES (1, 'HYE', 'hyeyoungkim3530@gmail.com', '$2b$10$IUXITc0rnVK6mT9IfuW.m.ySSkMKnUuKdBlgY/LjX/y/nyWfn60OK', NULL, true, true, false, '2026-02-14 04:27:51.063878+00');
INSERT INTO public.users (id, name, email, password, google_id, "isAdmin", "isAllowed", "isTest", "createdAt") OVERRIDING SYSTEM VALUE VALUES (2, '얍얍', 'velvetrevelvet91@gmail.com', '$2b$10$BfTFcvkSzk0rZPqzR.KQMepM5vRwsiN.1KbMI33THjfoyqwbubB0.', NULL, false, true, false, '2026-02-14 04:30:24.581582+00');
INSERT INTO public.users (id, name, email, password, google_id, "isAdmin", "isAllowed", "isTest", "createdAt") OVERRIDING SYSTEM VALUE VALUES (5, 'TEST_ADMIN', 'twistersAdmin@gmail.com', '$2b$10$gkUpYiUcmlw9mer.p6HZg.dnm0lzsMDZrZu1c0fnMliStBXW1c8FO', NULL, true, true, true, NOW());
INSERT INTO public.users (id, name, email, password, google_id, "isAdmin", "isAllowed", "isTest", "createdAt") OVERRIDING SYSTEM VALUE VALUES (6, 'TEST_MEMBER', 'twistersMember@gmail.com', '$2b$10$IDdvxRaZMvH9qZ2aDYBlRel1KNXcfb9Y3LWkqySIHDEZqMtlv.Pe6', NULL, false, true, true, NOW());


--
-- Name: members_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.members_id_seq', 16, true);


--
-- Name: notice_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.notice_id_seq', 5, true);


--
-- Name: password_reset_tokens_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.password_reset_tokens_id_seq', 1, false);


--
-- Name: settlement_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.settlement_id_seq', 111, true);


--
-- Name: user_sessions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.user_sessions_id_seq', 2, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.users_id_seq', 6, true);


--
-- Name: members members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.members
    ADD CONSTRAINT members_pkey PRIMARY KEY (id);


--
-- Name: notice notice_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notice
    ADD CONSTRAINT notice_pkey PRIMARY KEY (id);


--
-- Name: password_reset_tokens password_reset_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (id);


--
-- Name: password_reset_tokens password_reset_tokens_token_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_hash_key UNIQUE (token_hash);


--
-- Name: settlement settlement_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settlement
    ADD CONSTRAINT settlement_pkey PRIMARY KEY (id);


--
-- Name: user_sessions user_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_pkey PRIMARY KEY (id);


--
-- Name: user_sessions user_sessions_refresh_token_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_refresh_token_hash_key UNIQUE (refresh_token_hash);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_members_department; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_members_department ON public.members USING btree (department);


--
-- Name: idx_members_email_lower; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_members_email_lower ON public.members USING btree (lower((email)::text));


--
-- Name: idx_password_reset_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_password_reset_expires ON public.password_reset_tokens USING btree (expires_at);


--
-- Name: idx_password_reset_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_password_reset_user ON public.password_reset_tokens USING btree (user_id);


--
-- Name: idx_settlement_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_settlement_date ON public.settlement USING btree (settlement_date DESC);


--
-- Name: idx_settlement_unique_entry; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_settlement_unique_entry ON public.settlement USING btree (settlement_date, item, amount, relation);


--
-- Name: idx_user_sessions_idle_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_sessions_idle_expires_at ON public.user_sessions USING btree (idle_expires_at);


--
-- Name: idx_user_sessions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_sessions_user_id ON public.user_sessions USING btree (user_id);


--
-- Name: notice trg_notice_update_date; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_notice_update_date BEFORE UPDATE ON public.notice FOR EACH ROW EXECUTE FUNCTION public.update_notice_updated_at();


--
-- Name: password_reset_tokens password_reset_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_sessions user_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict 2YF2hPpYRfOmyG5vXyT5vCv3dOMymx1KIbLZ22UIedYMGETfDSN7kJZPavie2gC
