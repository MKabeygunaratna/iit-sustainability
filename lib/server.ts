import "server-only";
import { createCipheriv, createDecipheriv, createHmac, createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";
import type { Answers } from "./questions";
import { database } from "./db";

export { database };

function required(name: "SURVEY_PASSCODE" | "SESSION_SECRET" | "DATA_ENCRYPTION_KEY" | "IP_HASH_KEY") {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}
function key(name: "SESSION_SECRET" | "DATA_ENCRYPTION_KEY" | "IP_HASH_KEY") {
  const value = Buffer.from(required(name), "base64url");
  if (value.length !== 32) throw new Error(`${name} must be a base64url-encoded 32-byte secret.`);
  return value;
}
function seal(plaintext: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key("DATA_ENCRYPTION_KEY"), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final(), cipher.getAuthTag()]);
  return { iv: iv.toString("base64url"), ciphertext: ciphertext.toString("base64url") };
}
function open(ivText: string, ciphertextText: string) {
  const iv = Buffer.from(ivText, "base64url");
  const payload = Buffer.from(ciphertextText, "base64url");
  const decipher = createDecipheriv("aes-256-gcm", key("DATA_ENCRYPTION_KEY"), iv);
  decipher.setAuthTag(payload.subarray(-16));
  return Buffer.concat([decipher.update(payload.subarray(0, -16)), decipher.final()]).toString("utf8");
}
export function encrypt(answers: Answers) { return seal(JSON.stringify(answers)); }
export function decrypt(row: { iv: string; ciphertext: string }): Answers { return JSON.parse(open(row.iv, row.ciphertext)); }
export function protectIp(ip: string) {
  const protectedValue = seal(ip);
  return {
    ipHash: createHmac("sha256", key("IP_HASH_KEY")).update(ip).digest("base64url"),
    ipIv: protectedValue.iv, ipCiphertext: protectedValue.ciphertext,
  };
}
export function revealIp(row: { ip_iv: string | null; ip_ciphertext: string | null }) {
  return row.ip_iv && row.ip_ciphertext ? open(row.ip_iv, row.ip_ciphertext) : null;
}
export function visitorIp(request: Request) {
  // Vercel sets these headers at its edge. Locally, only trust the dev request's forwarded header.
  const forwarded = process.env.VERCEL
    ? request.headers.get("x-vercel-forwarded-for") || request.headers.get("x-forwarded-for")
    : request.headers.get("x-forwarded-for");
  const value = forwarded?.split(",")[0]?.trim() || "";
  return isIP(value) ? value : null;
}
export function checkPasscode(value: string) {
  const a = createHash("sha256").update(value).digest();
  const b = createHash("sha256").update(required("SURVEY_PASSCODE")).digest();
  return timingSafeEqual(a, b);
}
function sign(value: string) { return createHmac("sha256", key("SESSION_SECRET")).update(value).digest("base64url"); }
export function issueSession() {
  const payload = Buffer.from(JSON.stringify({ exp: Date.now() + 12 * 60 * 60 * 1000 })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}
export function isAdmin(request: Request) {
  try {
    const cookie = request.headers.get("cookie")?.split(/;\s*/).find(c => c.startsWith("iit_admin="))?.slice(10);
    if (!cookie) return false;
    const [payload, signature, extra] = cookie.split(".");
    if (!payload || !signature || extra) return false;
    const expected = Buffer.from(sign(payload), "base64url");
    const supplied = Buffer.from(signature, "base64url");
    if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return false;
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { exp?: number };
    return typeof session.exp === "number" && session.exp > Date.now();
  } catch { return false; }
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !!origin && origin === new URL(request.url).origin;
}
export function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}
export function unauthorized() { return json({ error: "Passcode required." }, 401); }
export function cookieHeader(token: string) {
  return `iit_admin=${token}; HttpOnly; ${process.env.NODE_ENV === "production" ? "Secure; " : ""}SameSite=Strict; Path=/; Max-Age=43200`;
}
export function clearCookieHeader() {
  return `iit_admin=; HttpOnly; ${process.env.NODE_ENV === "production" ? "Secure; " : ""}SameSite=Strict; Path=/; Max-Age=0`;
}
export async function tooManyAttempts(request: Request) {
  const ip = visitorIp(request) || "unknown";
  const hash = sign(`login:${ip}`);
  const now = Date.now();
  const { rows } = await database().query<{ attempts: number; window_start: number }>("SELECT attempts, window_start FROM auth_attempts WHERE key = $1", [hash]);
  return { blocked: !!rows[0] && now - Number(rows[0].window_start) < 900_000 && rows[0].attempts >= 7, key: hash };
}
export async function registerFailure(hash: string) {
  const now = Date.now();
  await database().query(`INSERT INTO auth_attempts (key, attempts, window_start) VALUES ($1, 1, $2)
    ON CONFLICT (key) DO UPDATE SET attempts = CASE WHEN $2 - auth_attempts.window_start > 900000 THEN 1 ELSE auth_attempts.attempts + 1 END,
    window_start = CASE WHEN $2 - auth_attempts.window_start > 900000 THEN $2 ELSE auth_attempts.window_start END`, [hash, now]);
}
