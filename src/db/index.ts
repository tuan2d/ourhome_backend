import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

// Lazy singleton — do not connect at import time (breaks Next.js static build)
let _db: ReturnType<typeof drizzle> | null = null;

function getDb() {
  if (!_db) {
    const url = process.env.DATABASE_URL?.trim();
    if (!url) throw new Error('DATABASE_URL env var is not set');
    _db = drizzle(neon(url), { schema });
  }
  return _db;
}

export const db: ReturnType<typeof getDb> = new Proxy({} as ReturnType<typeof getDb>, {
  get(_, prop) {
    return (getDb() as any)[prop];
  },
});
