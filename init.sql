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
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.users (id, name, email, password, google_id, "isAdmin", "isAllowed", "isTest", "createdAt") OVERRIDING SYSTEM VALUE VALUES (1, 'HYE', 'hyeyoungkim3530@gmail.com', '$2b$10$IUXITc0rnVK6mT9IfuW.m.ySSkMKnUuKdBlgY/LjX/y/nyWfn60OK', NULL, true, true, false, '2026-02-14 04:27:51.063878+00');
INSERT INTO public.users (id, name, email, password, google_id, "isAdmin", "isAllowed", "isTest", "createdAt") OVERRIDING SYSTEM VALUE VALUES (2, '얍얍', 'velvetrevelvet91@gmail.com', '$2b$10$BfTFcvkSzk0rZPqzR.KQMepM5vRwsiN.1KbMI33THjfoyqwbubB0.', NULL, false, true, false, '2026-02-14 04:30:24.581582+00');
INSERT INTO public.users (id, name, email, password, google_id, "isAdmin", "isAllowed", "isTest", "createdAt") OVERRIDING SYSTEM VALUE VALUES (3, 'TEST_ADMIN', 'twistersAdmin@gmail.com', '$2b$10$gkUpYiUcmlw9mer.p6HZg.dnm0lzsMDZrZu1c0fnMliStBXW1c8FO', NULL, true, true, true, NOW());
INSERT INTO public.users (id, name, email, password, google_id, "isAdmin", "isAllowed", "isTest", "createdAt") OVERRIDING SYSTEM VALUE VALUES (4, 'TEST_MEMBER', 'twistersMember@gmail.com', '$2b$10$IDdvxRaZMvH9qZ2aDYBlRel1KNXcfb9Y3LWkqySIHDEZqMtlv.Pe6', NULL, false, true, true, NOW());


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
