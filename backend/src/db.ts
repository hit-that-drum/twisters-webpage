import { Pool, type QueryResultRow } from 'pg';
import { loadEnvironment } from './config/env.js';

loadEnvironment();

const databaseUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('SUPABASE_DB_URL or DATABASE_URL must be configured.');
}

const resolveShouldUseSsl = () => {
  const rawDbSsl = process.env.DB_SSL?.trim().toLowerCase();
  if (rawDbSsl) {
    if (['1', 'true', 'yes', 'on'].includes(rawDbSsl)) {
      return true;
    }

    if (['0', 'false', 'no', 'off'].includes(rawDbSsl)) {
      return false;
    }
  }

  try {
    const hostname = new URL(databaseUrl).hostname.toLowerCase();
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === 'db') {
      return false;
    }
  } catch (_error) {
    return true;
  }

  return true;
};

const shouldUseSsl = resolveShouldUseSsl();

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
