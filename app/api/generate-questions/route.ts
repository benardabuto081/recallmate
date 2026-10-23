import { NextResponse } from "next/server";
import { badRequest, generateQuestions, toErrorResponse } from "@/lib/ai";
import { generateRequestSchema } from "@/lib/schemas";

export const maxDuration = 60;

export async function POST(req: Request) {
  let body: unknown;
  try { body = await req.json(); } catch { return badRequest("Request body must be valid JSON."); }
  const parsed = generateRequestSchema.safeParse(body);
  if (!parsed.success) return badRequest("Invalid request. Check the topic, study material (20–40,000 characters) and question count.");
  try {
    return NextResponse.json({ questions: await generateQuestions(parsed.data) });
  } catch (e) {
    return toErrorResponse(e);
  }
}
