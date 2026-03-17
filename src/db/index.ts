import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema.ts";

const { Pool } = pg;

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;
let _pool: InstanceType<typeof Pool> | null = null;
let _healthy = false;

export async function initDb(timeoutMs = 5000): Promise<void> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL not set. Add it to your .env file.");
  }

  _pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: timeoutMs,
  });

  const client = await Promise.race([
    _pool.connect(),
    new Promise<never>((_, reject) =>
      setTimeout(
        () =>
          reject(
            new Error(
              "Cannot connect to database — is Docker running? (docker compose up -d)",
            ),
          ),
        timeoutMs,
      ),
    ),
  ]);

  client.release();
  _db = drizzle(_pool, { schema });
  _healthy = true;
}

export function getDb() {
  return _db;
}

export function isDbHealthy() {
  return _healthy;
}

export function requireDb() {
  if (!_db) {
    throw new Error(
      "Database not initialized. Run docker compose up -d and restart the app.",
    );
  }
  return _db;
}
