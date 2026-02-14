import { Pool, type QueryResultRow } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

const databaseUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('SUPABASE_DB_URL or DATABASE_URL must be configured.');
}

const shouldUseSsl = process.env.DB_SSL !== 'false';

const pool = new Pool({
  connectionString: databaseUrl,
  max: 10,
  ssl: shouldUseSsl
    ? {
        rejectUnauthorized: false,
      }
    : false,
});

export const query = async <TRow extends QueryResultRow>(text: string, values: unknown[] = []) => {
  return pool.query<TRow>(text, values);
};

export default pool;
