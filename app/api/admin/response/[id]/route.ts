import { database, isAdmin, json, sameOrigin, unauthorized } from "../../../../../lib/server";

export const runtime = "nodejs";
export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(request)) return json({ error: "Invalid request origin." }, 403);
  if (!(await isAdmin(request))) return unauthorized();
  const { id } = await context.params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return json({ error: "Invalid response ID." }, 400);
  const result = await database().query("DELETE FROM responses WHERE id = $1", [id]);
  return json({ ok: true, deleted: result.rowCount });
}
