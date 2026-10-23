import { NextResponse } from "next/server";
import { badRequest, evaluateAnswer, generateHint, toErrorResponse } from "@/lib/ai";
import { evaluateRequestSchema } from "@/lib/schemas";

export const maxDuration = 60;

export async function POST(req: Request) {
  let body: unknown;
  try { body = await req.json(); } catch { return badRequest("Request body must be valid JSON."); }
  const parsed = evaluateRequestSchema.safeParse(body);
  if (!parsed.success) return badRequest("Invalid request. Answers must be under 4,000 characters.");
  const d = parsed.data;
  try {
    if (d.action === "hint") return NextResponse.json({ hint: await generateHint(d) });
    if (d.exchanges.length === 0 || !d.exchanges[d.exchanges.length - 1].answer.trim()) return badRequest("An answer is required.");
    return NextResponse.json({ evaluation: await evaluateAnswer(d) });
  } catch (e) {
    return toErrorResponse(e);
  }
}
