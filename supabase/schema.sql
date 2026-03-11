CREATE TABLE IF NOT EXISTS users (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255),
  google_id VARCHAR(255),
  kakao_id VARCHAR(255),
  "profileImage" VARCHAR(512),
  "isAdmin" BOOLEAN NOT NULL DEFAULT FALSE,
  "isTest" BOOLEAN NOT NULL DEFAULT FALSE,
  "isAllowed" BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS members (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE,
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  phone VARCHAR(30),
  role VARCHAR(100),
  department VARCHAR(100),
  joined_at DATE,
  bio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS test_members (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE,
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  phone VARCHAR(30),
  role VARCHAR(100),
  department VARCHAR(100),
  joined_at DATE,
  bio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notice (
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

CREATE TABLE IF NOT EXISTS test_notice (
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

ALTER TABLE notice ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;
ALTER TABLE test_notice ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;

CREATE TABLE IF NOT EXISTS test_board (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "authorId" INTEGER REFERENCES users(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  "createUser" VARCHAR(100) NOT NULL,
  "createDate" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updateUser" VARCHAR(100) NOT NULL,
  "updateDate" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  content TEXT NOT NULL,
  pinned BOOLEAN NOT NULL DEFAULT FALSE
);

ALTER TABLE test_board ADD COLUMN IF NOT EXISTS "authorId" INTEGER;
ALTER TABLE test_board ADD COLUMN IF NOT EXISTS pinned BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS settlement (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  settlement_date DATE NOT NULL,
  item VARCHAR(255) NOT NULL,
  amount INTEGER NOT NULL,
  relation VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS board (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "authorId" INTEGER REFERENCES users(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  "createUser" VARCHAR(100) NOT NULL,
  "createDate" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updateUser" VARCHAR(100) NOT NULL,
  "updateDate" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  content TEXT NOT NULL,
  pinned BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS board_comments (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "boardId" INTEGER NOT NULL REFERENCES board(id) ON DELETE CASCADE,
  "authorId" INTEGER REFERENCES users(id) ON DELETE SET NULL,
  "authorName" VARCHAR(100) NOT NULL,
  content TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS test_board_comments (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "boardId" INTEGER NOT NULL REFERENCES test_board(id) ON DELETE CASCADE,
  "authorId" INTEGER REFERENCES users(id) ON DELETE SET NULL,
  "authorName" VARCHAR(100) NOT NULL,
  content TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS test_settlement (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  settlement_date DATE NOT NULL,
  item VARCHAR(255) NOT NULL,
  amount INTEGER NOT NULL,
  relation VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_sessions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token_hash CHAR(64) NOT NULL UNIQUE,
  remember_me BOOLEAN NOT NULL DEFAULT FALSE,
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  idle_expires_at TIMESTAMPTZ NOT NULL,
  absolute_expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_user ON password_reset_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_expires ON password_reset_tokens (expires_at);
CREATE INDEX IF NOT EXISTS idx_members_email ON members (email);
CREATE INDEX IF NOT EXISTS idx_members_role ON members (role);
CREATE INDEX IF NOT EXISTS idx_members_department ON members (department);
CREATE INDEX IF NOT EXISTS idx_test_members_email ON test_members (email);
CREATE INDEX IF NOT EXISTS idx_test_members_role ON test_members (role);
CREATE INDEX IF NOT EXISTS idx_test_members_department ON test_members (department);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_idle_expires_at ON user_sessions (idle_expires_at);
CREATE INDEX IF NOT EXISTS idx_settlement_date ON settlement (settlement_date DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_settlement_unique_entry ON settlement (settlement_date, item, amount, relation);
CREATE INDEX IF NOT EXISTS idx_board_create_date ON board ("createDate" DESC);
CREATE INDEX IF NOT EXISTS idx_board_author_id ON board ("authorId");
CREATE INDEX IF NOT EXISTS idx_test_board_create_date ON test_board ("createDate" DESC);
CREATE INDEX IF NOT EXISTS idx_test_board_author_id ON test_board ("authorId");
CREATE INDEX IF NOT EXISTS idx_board_comments_board_id ON board_comments ("boardId", "createdAt" ASC);
CREATE INDEX IF NOT EXISTS idx_board_comments_author_id ON board_comments ("authorId");
CREATE INDEX IF NOT EXISTS idx_test_board_comments_board_id ON test_board_comments ("boardId", "createdAt" ASC);
CREATE INDEX IF NOT EXISTS idx_test_board_comments_author_id ON test_board_comments ("authorId");
CREATE INDEX IF NOT EXISTS idx_test_settlement_date ON test_settlement (settlement_date DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_test_settlement_unique_entry ON test_settlement (settlement_date, item, amount, relation);

CREATE OR REPLACE FUNCTION update_notice_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updateDate" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_board_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updateDate" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_board_comment_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_notice_update_date ON notice;

CREATE TRIGGER trg_notice_update_date
BEFORE UPDATE ON notice
FOR EACH ROW
EXECUTE FUNCTION update_notice_updated_at();

DROP TRIGGER IF EXISTS trg_board_update_date ON board;

CREATE TRIGGER trg_board_update_date
BEFORE UPDATE ON board
FOR EACH ROW
EXECUTE FUNCTION update_board_updated_at();

DROP TRIGGER IF EXISTS trg_board_comment_update_date ON board_comments;

CREATE TRIGGER trg_board_comment_update_date
BEFORE UPDATE ON board_comments
FOR EACH ROW
EXECUTE FUNCTION update_board_comment_updated_at();

DROP TRIGGER IF EXISTS trg_test_notice_update_date ON test_notice;

CREATE TRIGGER trg_test_notice_update_date
BEFORE UPDATE ON test_notice
FOR EACH ROW
EXECUTE FUNCTION update_notice_updated_at();

DROP TRIGGER IF EXISTS trg_test_board_update_date ON test_board;

CREATE TRIGGER trg_test_board_update_date
BEFORE UPDATE ON test_board
FOR EACH ROW
EXECUTE FUNCTION update_board_updated_at();

DROP TRIGGER IF EXISTS trg_test_board_comment_update_date ON test_board_comments;

CREATE TRIGGER trg_test_board_comment_update_date
BEFORE UPDATE ON test_board_comments
FOR EACH ROW
EXECUTE FUNCTION update_board_comment_updated_at();
