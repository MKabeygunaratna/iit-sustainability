import { database, encrypt, json, protectIp, sameOrigin, visitorIp } from "../../../lib/server";
import { validateAnswers } from "../../../lib/questions";

export const runtime = "nodejs";
export async function POST(request: Request) {
  if (!sameOrigin(request)) return json({ error: "Invalid request origin." }, 403);
  try {
    const raw = await request.text();
    if (Buffer.byteLength(raw) > 16_000) return json({ error: "Response is too long." }, 413);
    const body = JSON.parse(raw) as { answers?: unknown; website?: unknown; acknowledgedIp?: unknown };
    if (body.website) return json({ ok: true });
    if (body.acknowledgedIp !== true) return json({ error: "Please acknowledge how the IP address is used." }, 400);
    const result = validateAnswers(body.answers);
    if (!result.ok) return json({ error: result.message }, 400);
    const { iv, ciphertext } = encrypt(result.answers);
    const ip = visitorIp(request);
    const protectedIp = ip ? protectIp(ip) : null;
    await database().query(`INSERT INTO responses (id, is_demo, iv, ciphertext, ip_hash, ip_iv, ip_ciphertext)
      VALUES ($1, false, $2, $3, $4, $5, $6)`,
      [crypto.randomUUID(), iv, ciphertext, protectedIp?.ipHash ?? null, protectedIp?.ipIv ?? null, protectedIp?.ipCiphertext ?? null]);
    return json({ ok: true }, 201);
  } catch { return json({ error: "We couldn't save your response. Please try again." }, 500); }
}
