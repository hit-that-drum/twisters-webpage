import { Pool, type QueryResultRow } from 'pg';
import { loadEnvironment } from './config/env.js';

loadEnvironment();

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
