import { json } from "../../../lib/server";

export const runtime = "nodejs";
export async function POST() {
  return json({
    code: "SURVEY_CLOSED",
    error: "This survey is no longer accepting responses. Your response has not been saved.",
  }, 403);
}
