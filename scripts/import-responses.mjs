import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createCipheriv, createDecipheriv, randomBytes, randomUUID } from "node:crypto";
import { Pool } from "pg";
import { questions, validateAnswers } from "../lib/questions.ts";

// Accept quoted fields, embedded newlines, escaped quotes and a UTF-8 BOM.
function parseCsv(source) {
  const rows = [];
  let row = [], field = "", quoted = false, closed = false;
  const csv = source.replace(/^\uFEFF/, "");
  for (let i = 0; i < csv.length; i++) {
    const char = csv[i];
    if (quoted) {
      if (char === '"' && csv[i + 1] === '"') { field += '"'; i++; }
      else if (char === '"') { quoted = false; closed = true; }
      else field += char;
    } else if (char === '"' && !field && !closed) quoted = true;
    else if (char === "," || char === "\n" || char === "\r") {
      row.push(field); field = ""; closed = false;
      if (char !== ",") {
        if (row.some(value => value !== "")) rows.push(row);
        row = [];
        if (char === "\r" && csv[i + 1] === "\n") i++;
      }
    } else {
      if (closed || char === '"') throw new Error("Malformed CSV quoting.");
      field += char;
    }
  }
  if (quoted) throw new Error("Unclosed CSV quote.");
  row.push(field);
  if (row.some(value => value !== "")) rows.push(row);
  return rows;
}

const [file, flag] = process.argv.slice(2);
if (!file || flag !== "--replace") throw new Error("Usage: npm run db:import -- <file.csv> --replace (replaces all survey responses)");
try { process.loadEnvFile(resolve(".env.local")); } catch (error) {
  if (error.code !== "ENOENT") throw error;
}
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
const key = Buffer.from(process.env.DATA_ENCRYPTION_KEY || "", "base64url");
if (key.length !== 32) throw new Error("DATA_ENCRYPTION_KEY must decode to 32 bytes.");

const [headers, ...csvRows] = parseCsv(await readFile(resolve(file), "utf8"));
if (!headers || new Set(headers).size !== headers.length) throw new Error("Missing or duplicate CSV headers.");
for (const name of ["is_demo", ...questions.map(q => q.id)]) {
  if (!headers.includes(name)) throw new Error(`Missing CSV column: ${name}`);
}
if (!csvRows.length) throw new Error("Refusing to replace responses with an empty CSV.");
const records = csvRows.map((values, index) => {
  if (values.length !== headers.length) throw new Error(`CSV row ${index + 2}: incorrect column count.`);
  const record = Object.fromEntries(headers.map((header, i) => [header, values[i]]));
  if (!["true", "false", "1", "0"].includes(record.is_demo)) throw new Error(`CSV row ${index + 2}: invalid is_demo.`);
  const input = { ...record };
  for (const q of questions) if (q.type === "multi") input[q.id] = record[q.id].split("|").map(value => value.trim()).filter(Boolean);
  const result = validateAnswers(input);
  if (!result.ok) throw new Error(`CSV row ${index + 2}: ${result.message}`);
  return { answers: result.answers, isDemo: ["true", "1"].includes(record.is_demo) };
});

const pool = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 10_000 });
const client = await pool.connect();
try {
  await client.query("BEGIN");
  await client.query("LOCK TABLE responses, site_state IN EXCLUSIVE MODE");
  const previous = await client.query("SELECT * FROM responses ORDER BY created_at, id");
  const state = await client.query("SELECT * FROM site_state");
  const backupDir = resolve(".backups");
  await mkdir(backupDir, { recursive: true, mode: 0o700 });
  const backupPath = resolve(backupDir, `responses-${new Date().toISOString().replace(/[:.]/g, "-")}-${randomUUID()}.json`);
  await writeFile(backupPath, JSON.stringify({ responses: previous.rows, site_state: state.rows }, null, 2), { mode: 0o600, flag: "wx" });
  await client.query("DELETE FROM responses");
  for (const record of records) {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", key, iv);
    const payload = Buffer.concat([cipher.update(JSON.stringify(record.answers), "utf8"), cipher.final(), cipher.getAuthTag()]);
    await client.query("INSERT INTO responses (id, is_demo, iv, ciphertext) VALUES ($1, $2, $3, $4)",
      [randomUUID(), record.isDemo, iv.toString("base64url"), payload.toString("base64url")]);
  }
  // Prevent the homepage initializer from adding the old 24 samples.
  await client.query("INSERT INTO site_state (key, value) VALUES ('demo_initialized', 'yes') ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value");
  const imported = await client.query("SELECT is_demo, iv, ciphertext FROM responses ORDER BY created_at, id");
  const actual = imported.rows.map(row => {
    const payload = Buffer.from(row.ciphertext, "base64url");
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(row.iv, "base64url"));
    decipher.setAuthTag(payload.subarray(-16));
    const answers = JSON.parse(Buffer.concat([decipher.update(payload.subarray(0, -16)), decipher.final()]).toString("utf8"));
    return JSON.stringify({ answers, isDemo: row.is_demo });
  }).sort();
  if (JSON.stringify(actual) !== JSON.stringify(records.map(record => JSON.stringify(record)).sort())) throw new Error("Imported data did not match the CSV; rolling back.");
  await client.query("COMMIT");
  console.log(`Replaced ${previous.rowCount} responses with ${records.length} verified CSV responses (${records.filter(r => r.isDemo).length} synthetic).`);
  console.log(`Encrypted database backup: ${backupPath}`);
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await pool.end();
}
