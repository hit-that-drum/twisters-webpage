BEGIN;

CREATE TABLE public.users (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255),
  google_id VARCHAR(255),
  kakao_id VARCHAR(255),
  "profileImage" TEXT,
  "isAdmin" BOOLEAN NOT NULL DEFAULT FALSE,
  "isAllowed" BOOLEAN NOT NULL DEFAULT FALSE,
  "isTest" BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.members (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE,
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  phone VARCHAR(30),
  department VARCHAR(100),
  joined_at DATE,
  birth_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.test_members (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE,
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  phone VARCHAR(30),
  department VARCHAR(100),
  joined_at DATE,
  birth_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.notice (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  "createUser" VARCHAR(100) NOT NULL,
  "createDate" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updateUser" VARCHAR(100) NOT NULL,
  "updateDate" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  content TEXT NOT NULL,
  "imageUrl" TEXT,
  pinned BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE public.test_notice (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  "createUser" VARCHAR(100) NOT NULL,
  "createDate" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updateUser" VARCHAR(100) NOT NULL,
  "updateDate" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  content TEXT NOT NULL,
  "imageUrl" TEXT,
  pinned BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE public.settlement (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  settlement_date DATE NOT NULL,
  item VARCHAR(255) NOT NULL,
  amount INTEGER NOT NULL,
  relation VARCHAR(100) NOT NULL
);

CREATE TABLE public.test_settlement (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  settlement_date DATE NOT NULL,
  item VARCHAR(255) NOT NULL,
  amount INTEGER NOT NULL,
  relation VARCHAR(100) NOT NULL
);

CREATE TABLE public.board (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "authorId" INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  "createUser" VARCHAR(100) NOT NULL,
  "createDate" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updateUser" VARCHAR(100) NOT NULL,
  "updateDate" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "imageUrl" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  content TEXT NOT NULL,
  pinned BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE public.test_board (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "authorId" INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  "createUser" VARCHAR(100) NOT NULL,
  "createDate" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updateUser" VARCHAR(100) NOT NULL,
  "updateDate" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "imageUrl" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  content TEXT NOT NULL,
  pinned BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE public.board_comments (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "boardId" INTEGER NOT NULL REFERENCES public.board(id) ON DELETE CASCADE,
  "authorId" INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  "authorName" VARCHAR(100) NOT NULL,
  content TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.test_board_comments (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "boardId" INTEGER NOT NULL REFERENCES public.test_board(id) ON DELETE CASCADE,
  "authorId" INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
  "authorName" VARCHAR(100) NOT NULL,
  content TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.password_reset_tokens (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.user_sessions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  refresh_token_hash CHAR(64) NOT NULL UNIQUE,
  remember_me BOOLEAN NOT NULL DEFAULT FALSE,
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  idle_expires_at TIMESTAMPTZ NOT NULL,
  absolute_expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_members_email_lower ON public.members (LOWER(email));
CREATE INDEX idx_members_department ON public.members (department);
CREATE INDEX idx_test_members_email_lower ON public.test_members (LOWER(email));
CREATE INDEX idx_test_members_department ON public.test_members (department);

CREATE INDEX idx_password_reset_user ON public.password_reset_tokens (user_id);
CREATE INDEX idx_password_reset_expires ON public.password_reset_tokens (expires_at);

CREATE INDEX idx_user_sessions_user_id ON public.user_sessions (user_id);
CREATE INDEX idx_user_sessions_idle_expires_at ON public.user_sessions (idle_expires_at);

CREATE INDEX idx_settlement_date ON public.settlement (settlement_date DESC);
CREATE UNIQUE INDEX idx_settlement_unique_entry
  ON public.settlement (settlement_date, item, amount, relation);

CREATE INDEX idx_test_settlement_date ON public.test_settlement (settlement_date DESC);
CREATE UNIQUE INDEX idx_test_settlement_unique_entry
  ON public.test_settlement (settlement_date, item, amount, relation);

CREATE INDEX idx_board_create_date ON public.board ("createDate" DESC);
CREATE INDEX idx_board_author_id ON public.board ("authorId");
CREATE INDEX idx_test_board_create_date ON public.test_board ("createDate" DESC);
CREATE INDEX idx_test_board_author_id ON public.test_board ("authorId");

CREATE INDEX idx_board_comments_board_id
  ON public.board_comments ("boardId", "createdAt" ASC);
CREATE INDEX idx_board_comments_author_id ON public.board_comments ("authorId");
CREATE INDEX idx_test_board_comments_board_id
  ON public.test_board_comments ("boardId", "createdAt" ASC);
CREATE INDEX idx_test_board_comments_author_id ON public.test_board_comments ("authorId");

CREATE FUNCTION public.update_notice_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updateDate" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION public.update_board_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updateDate" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE FUNCTION public.update_board_comment_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_notice_update_date
BEFORE UPDATE ON public.notice
FOR EACH ROW
EXECUTE FUNCTION public.update_notice_updated_at();

CREATE TRIGGER trg_test_notice_update_date
BEFORE UPDATE ON public.test_notice
FOR EACH ROW
EXECUTE FUNCTION public.update_notice_updated_at();

CREATE TRIGGER trg_board_update_date
BEFORE UPDATE ON public.board
FOR EACH ROW
EXECUTE FUNCTION public.update_board_updated_at();

CREATE TRIGGER trg_test_board_update_date
BEFORE UPDATE ON public.test_board
FOR EACH ROW
EXECUTE FUNCTION public.update_board_updated_at();

CREATE TRIGGER trg_board_comment_update_date
BEFORE UPDATE ON public.board_comments
FOR EACH ROW
EXECUTE FUNCTION public.update_board_comment_updated_at();

CREATE TRIGGER trg_test_board_comment_update_date
BEFORE UPDATE ON public.test_board_comments
FOR EACH ROW
EXECUTE FUNCTION public.update_board_comment_updated_at();

COMMIT;
