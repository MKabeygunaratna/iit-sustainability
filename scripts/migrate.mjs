import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Pool } from "pg";

try { process.loadEnvFile(resolve(".env.local")); } catch (error) {
  if (error.code !== "ENOENT") throw error;
}
if (!process.env.DATABASE_URL) throw new Error("Set DATABASE_URL in .env.local or the environment.");
const pool = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 10_000 });
try {
  await pool.query(await readFile(new URL("../db/schema.sql", import.meta.url), "utf8"));
  console.log("PostgreSQL schema is ready. The first homepage visit will add 24 sample responses.");
} finally {
  await pool.end();
}
