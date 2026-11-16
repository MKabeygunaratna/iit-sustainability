import { checkPasscode, clearCookieHeader, cookieHeader, database, decrypt, isAdmin, issueSession, json, registerFailure, revealIp, sameOrigin, tooManyAttempts, unauthorized } from "../../../../lib/server";
import { questions } from "../../../../lib/questions";
import { seedSamples } from "../../../../lib/demo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Row = { id: string; created_at: Date; is_demo: boolean; iv: string; ciphertext: string; ip_hash: string | null; ip_iv: string | null; ip_ciphertext: string | null };
async function rows() {
  const all: Row[] = []; const db = database();
  for (let offset = 0; ; offset += 400) {
    const batch = await db.query<Row>("SELECT id, created_at, is_demo, iv, ciphertext, ip_hash, ip_iv, ip_ciphertext FROM responses ORDER BY created_at DESC, id DESC LIMIT 400 OFFSET $1", [offset]);
    all.push(...batch.rows);
    if (batch.rows.length < 400) break;
  }
  const counts = new Map<string, number>();
  for (const row of all) if (row.ip_hash) { const key = `${row.is_demo}:${row.ip_hash}`; counts.set(key, (counts.get(key) || 0) + 1); }
  return all.map(row => ({ id: row.id, createdAt: row.created_at.toISOString(), isDemo: row.is_demo, ip: revealIp(row), possibleRepeat: !!row.ip_hash && (counts.get(`${row.is_demo}:${row.ip_hash}`) || 0) > 1, answers: decrypt(row) }));
}
function csvCell(value: unknown) {
  let text = Array.isArray(value) ? value.join(" | ") : String(value ?? "");
  if (/^[\s]*[=+\-@]/.test(text)) text = "'" + text;
  return `"${text.replace(/"/g, '""')}"`;
}
export async function GET(request: Request, context: { params: Promise<{ action: string }> }) {
  const { action } = await context.params;
  if (action === "session") return json({ authenticated: await isAdmin(request) });
  if (!(await isAdmin(request))) return unauthorized();
  if (action === "data") return json({ responses: await rows() });
  if (action === "csv") {
    const records = await rows();
    const columns = ["id", "created_at", "is_demo", "ip_address", "possible_repeat_ip", ...questions.flatMap(q => q.options?.includes("Other") ? [q.id, `${q.id}_other`] : [q.id])];
    const csv = "\uFEFF" + [columns.map(csvCell).join(","), ...records.map(row => columns.map(key => csvCell(key === "id" ? row.id : key === "created_at" ? row.createdAt : key === "is_demo" ? row.isDemo ? 1 : 0 : key === "ip_address" ? row.ip : key === "possible_repeat_ip" ? row.possibleRepeat ? 1 : 0 : row.answers[key])).join(","))].join("\r\n");
    return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": "attachment; filename=IIT-sustainability-responses.csv", "Cache-Control": "no-store" } });
  }
  return json({ error: "Not found." }, 404);
}
export async function POST(request: Request, context: { params: Promise<{ action: string }> }) {
  const { action } = await context.params;
  if (!sameOrigin(request)) return json({ error: "Invalid request origin." }, 403);
  if (action === "login") {
    const state = await tooManyAttempts(request);
    if (state.blocked) return json({ error: "Too many attempts. Please wait 15 minutes." }, 429);
    const body = await request.json().catch(() => ({})) as { passcode?: unknown };
    if (typeof body.passcode !== "string" || body.passcode.length > 200 || !(await checkPasscode(body.passcode))) {
      await registerFailure(state.key); return json({ error: "Incorrect passcode." }, 401);
    }
    await database().query("DELETE FROM auth_attempts WHERE key = $1", [state.key]);
    const response = json({ ok: true }); response.headers.set("Set-Cookie", cookieHeader(await issueSession())); return response;
  }
  if (!(await isAdmin(request))) return unauthorized();
  if (action === "logout") { const response = json({ ok: true }); response.headers.set("Set-Cookie", clearCookieHeader()); return response; }
  if (action === "clear-demo") { const result = await database().query("DELETE FROM responses WHERE is_demo = true"); return json({ ok: true, deleted: result.rowCount }); }
  if (action === "seed") {
    const created = await seedSamples();
    if (!created) return json({ error: "Sample records already exist. Clear them first to reseed." }, 409);
    return json({ ok: true, created: 24 });
  }
  return json({ error: "Not found." }, 404);
}
