import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema.ts";

const { Pool } = pg;

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    _db = drizzle(pool, { schema });
  }
  return _db;
}

export function requireDb() {
  const db = getDb();
  if (!db) {
    throw new Error(
      "Database not configured. Set DATABASE_URL in your .env file and run docker compose up -d",
    );
  }
  return db;
}
