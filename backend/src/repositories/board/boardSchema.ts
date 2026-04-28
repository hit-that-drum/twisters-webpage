import pool from '../../config/database.js';

type BoardImageColumnMeta = {
  data_type: string;
  udt_name: string;
};

let ensureBoardSchemaPromise: Promise<void> | null = null;

const ensureBoardImageColumn = async (tableName: 'board' | 'test_board') => {
  const columnResult = await pool.query<BoardImageColumnMeta>(
    `SELECT data_type, udt_name
       FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = $1
        AND column_name = 'imageUrl'
      LIMIT 1`,
    [tableName],
  );

  const imageColumn = columnResult.rows[0];

  if (!imageColumn) {
    await pool.query(
      `ALTER TABLE ${tableName} ADD COLUMN "imageUrl" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[]`,
    );
    return;
  }

  if (imageColumn.udt_name !== '_text') {
    await pool.query(`
      ALTER TABLE ${tableName}
      ALTER COLUMN "imageUrl" TYPE TEXT[]
      USING CASE
        WHEN "imageUrl" IS NULL OR BTRIM("imageUrl") = '' THEN ARRAY[]::TEXT[]
        ELSE ARRAY["imageUrl"]
      END
    `);
  }

  await pool.query(`UPDATE ${tableName} SET "imageUrl" = ARRAY[]::TEXT[] WHERE "imageUrl" IS NULL`);
  await pool.query(
    `ALTER TABLE ${tableName} ALTER COLUMN "imageUrl" SET DEFAULT ARRAY[]::TEXT[]`,
  );
  await pool.query(`ALTER TABLE ${tableName} ALTER COLUMN "imageUrl" SET NOT NULL`);
};

export const ensureBoardSchema = async () => {
  if (!ensureBoardSchemaPromise) {
    ensureBoardSchemaPromise = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS board (
          id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
          "authorId" INTEGER REFERENCES users(id) ON DELETE SET NULL,
          title VARCHAR(255) NOT NULL,
          "createUser" VARCHAR(100) NOT NULL,
          "createDate" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          "updateUser" VARCHAR(100) NOT NULL,
          "updateDate" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          "imageUrl" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
          content TEXT NOT NULL,
          pinned BOOLEAN NOT NULL DEFAULT FALSE
        )
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS test_board (
          id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
          "authorId" INTEGER REFERENCES users(id) ON DELETE SET NULL,
          title VARCHAR(255) NOT NULL,
          "createUser" VARCHAR(100) NOT NULL,
          "createDate" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          "updateUser" VARCHAR(100) NOT NULL,
          "updateDate" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          "imageUrl" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
          content TEXT NOT NULL,
          pinned BOOLEAN NOT NULL DEFAULT FALSE
        )
      `);

      await pool.query('ALTER TABLE board ADD COLUMN IF NOT EXISTS "authorId" INTEGER');
      await pool.query('ALTER TABLE board ADD COLUMN IF NOT EXISTS pinned BOOLEAN NOT NULL DEFAULT FALSE');
      await pool.query('ALTER TABLE test_board ADD COLUMN IF NOT EXISTS "authorId" INTEGER');
      await pool.query(
        'ALTER TABLE test_board ADD COLUMN IF NOT EXISTS pinned BOOLEAN NOT NULL DEFAULT FALSE',
      );

      await ensureBoardImageColumn('board');
      await ensureBoardImageColumn('test_board');

      await pool.query(`
        CREATE TABLE IF NOT EXISTS board_comments (
          id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
          "boardId" INTEGER NOT NULL REFERENCES board(id) ON DELETE CASCADE,
          "authorId" INTEGER REFERENCES users(id) ON DELETE SET NULL,
          "authorName" VARCHAR(100) NOT NULL,
          content TEXT NOT NULL,
          "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS test_board_comments (
          id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
          "boardId" INTEGER NOT NULL REFERENCES test_board(id) ON DELETE CASCADE,
          "authorId" INTEGER REFERENCES users(id) ON DELETE SET NULL,
          "authorName" VARCHAR(100) NOT NULL,
          content TEXT NOT NULL,
          "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS board_reactions (
          id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
          "boardId" INTEGER NOT NULL REFERENCES board(id) ON DELETE CASCADE,
          "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          type VARCHAR(20) NOT NULL CHECK (type IN ('thumbsUp', 'thumbsDown', 'favorite', 'heart')),
          "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE ("boardId", "userId", type)
        )
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS test_board_reactions (
          id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
          "boardId" INTEGER NOT NULL REFERENCES test_board(id) ON DELETE CASCADE,
          "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          type VARCHAR(20) NOT NULL CHECK (type IN ('thumbsUp', 'thumbsDown', 'favorite', 'heart')),
          "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE ("boardId", "userId", type)
        )
      `);

      await pool.query('CREATE INDEX IF NOT EXISTS idx_board_create_date ON board ("createDate" DESC)');
      await pool.query('CREATE INDEX IF NOT EXISTS idx_board_author_id ON board ("authorId")');
      await pool.query('CREATE INDEX IF NOT EXISTS idx_test_board_create_date ON test_board ("createDate" DESC)');
      await pool.query('CREATE INDEX IF NOT EXISTS idx_test_board_author_id ON test_board ("authorId")');
      await pool.query(
        'CREATE INDEX IF NOT EXISTS idx_board_comments_board_id ON board_comments ("boardId", "createdAt" ASC)',
      );
      await pool.query(
        'CREATE INDEX IF NOT EXISTS idx_board_comments_author_id ON board_comments ("authorId")',
      );
      await pool.query(
        'CREATE INDEX IF NOT EXISTS idx_test_board_comments_board_id ON test_board_comments ("boardId", "createdAt" ASC)',
      );
      await pool.query(
        'CREATE INDEX IF NOT EXISTS idx_test_board_comments_author_id ON test_board_comments ("authorId")',
      );
      await pool.query(
        'CREATE INDEX IF NOT EXISTS idx_board_reactions_board_id ON board_reactions ("boardId", type)',
      );
      await pool.query(
        'CREATE INDEX IF NOT EXISTS idx_board_reactions_user_id ON board_reactions ("userId")',
      );
      await pool.query(
        'CREATE INDEX IF NOT EXISTS idx_test_board_reactions_board_id ON test_board_reactions ("boardId", type)',
      );
      await pool.query(
        'CREATE INDEX IF NOT EXISTS idx_test_board_reactions_user_id ON test_board_reactions ("userId")',
      );

      await pool.query(`
        CREATE OR REPLACE FUNCTION update_board_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW."updateDate" = NOW();
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
      `);

      await pool.query(`
        CREATE OR REPLACE FUNCTION update_board_comment_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW."updatedAt" = NOW();
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
      `);

      await pool.query('DROP TRIGGER IF EXISTS trg_board_update_date ON board');
      await pool.query(`
        CREATE TRIGGER trg_board_update_date
        BEFORE UPDATE ON board
        FOR EACH ROW
        EXECUTE FUNCTION update_board_updated_at()
      `);

      await pool.query('DROP TRIGGER IF EXISTS trg_test_board_update_date ON test_board');
      await pool.query(`
        CREATE TRIGGER trg_test_board_update_date
        BEFORE UPDATE ON test_board
        FOR EACH ROW
        EXECUTE FUNCTION update_board_updated_at()
      `);

      await pool.query('DROP TRIGGER IF EXISTS trg_board_comment_update_date ON board_comments');
      await pool.query(`
        CREATE TRIGGER trg_board_comment_update_date
        BEFORE UPDATE ON board_comments
        FOR EACH ROW
        EXECUTE FUNCTION update_board_comment_updated_at()
      `);

      await pool.query('DROP TRIGGER IF EXISTS trg_test_board_comment_update_date ON test_board_comments');
      await pool.query(`
        CREATE TRIGGER trg_test_board_comment_update_date
        BEFORE UPDATE ON test_board_comments
        FOR EACH ROW
        EXECUTE FUNCTION update_board_comment_updated_at()
      `);
    })().catch((error) => {
      ensureBoardSchemaPromise = null;
      throw error;
    });
  }

  await ensureBoardSchemaPromise;
};
