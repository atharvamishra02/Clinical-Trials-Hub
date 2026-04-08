import pg from 'pg';
const { Pool } = pg;

const isRemote = process.env.DB_HOST && process.env.DB_HOST !== '127.0.0.1' && process.env.DB_HOST !== 'localhost';

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5433'),
  user: process.env.DB_USER || 'hub_user',
  password: process.env.DB_PASSWORD || 'hub_password',
  database: process.env.DB_NAME || 'clinical_trials_hub',
  ssl: isRemote ? { rejectUnauthorized: false } : undefined,
  max: 5,
  idleTimeoutMillis: 30000,
  statement_timeout: 120000,
});

export const query = (text: string, params?: any[]) => pool.query(text, params);
export default pool;
