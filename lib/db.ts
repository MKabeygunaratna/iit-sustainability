import "server-only";
import { Pool } from "pg";

const globalForDb = globalThis as unknown as { surveyPool?: Pool };

export function database() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured.");
  if (!globalForDb.surveyPool) {
    globalForDb.surveyPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 3,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 10_000,
    });
  }
  return globalForDb.surveyPool;
}
