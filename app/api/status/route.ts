import { NextResponse } from "next/server";
import { isLiveConfigured } from "@/lib/ai";

export const dynamic = "force-dynamic";

// Only reports WHETHER a key exists; never the key itself.
export function GET() {
  return NextResponse.json({ live: isLiveConfigured() });
}
