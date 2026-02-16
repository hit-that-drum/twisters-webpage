CREATE TABLE IF NOT EXISTS users (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255),
  google_id VARCHAR(255),
  "isAdmin" BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notice (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  "createUser" VARCHAR(100) NOT NULL,
  "createDate" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updateUser" VARCHAR(100) NOT NULL,
  "updateDate" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  content TEXT NOT NULL,
  pinned BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS settlement (
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

CREATE INDEX IF NOT EXISTS idx_password_reset_user ON password_reset_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_expires ON password_reset_tokens (expires_at);
CREATE INDEX IF NOT EXISTS idx_settlement_date ON settlement (settlement_date DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_settlement_unique_entry ON settlement (settlement_date, item, amount, relation);

CREATE OR REPLACE FUNCTION update_notice_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updateDate" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_notice_update_date ON notice;

CREATE TRIGGER trg_notice_update_date
BEFORE UPDATE ON notice
FOR EACH ROW
EXECUTE FUNCTION update_notice_updated_at();
