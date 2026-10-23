import pg from 'pg';
import { env } from './env.js';

const { Pool } = pg;

export let pool: pg.Pool | null = null;
export let isPostgisConnected = false;

export async function initDatabase(): Promise<boolean> {
  try {
    const testPool = new Pool({
      connectionString: env.DATABASE_URL,
      connectionTimeoutMillis: 2500,
    });

    const client = await testPool.connect();
    try {
      const res = await client.query('SELECT PostGIS_Version()');
      console.log(`[DB] Connected to PostgreSQL with PostGIS: ${res.rows[0].postgis_version}`);
      pool = testPool;
      isPostgisConnected = true;
      return true;
    } catch (err: any) {
      console.warn(`[DB] PostgreSQL connected, but PostGIS extension not active: ${err.message}`);
      pool = testPool;
      return false;
    } finally {
      client.release();
    }
  } catch (error: any) {
    if (env.ALLOW_IN_MEMORY_FALLBACK) {
      console.log(`[DB] PostgreSQL not detected at ${env.DATABASE_URL}.`);
      console.log(`[DB] Using In-Memory Spatial Repository with Haversine spherical math (No DB setup required for quick dev/testing!).`);
      isPostgisConnected = false;
      return false;
    } else {
      console.error(`[DB] Failed to connect to PostgreSQL:`, error.message);
      throw error;
    }
  }
}
