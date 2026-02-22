import { NextResponse } from "next/server";
import { MOCK_TRENDS } from "@/lib/mock-data";

// v1: Returns mock trending topics
// Future: Will trigger real web search + Reddit + news scanning
export async function POST() {
  return NextResponse.json({
    trends: MOCK_TRENDS,
    scannedAt: new Date().toISOString(),
    sources: ["X/Twitter", "Reddit", "CNN", "CNBC", "Reuters", "PCMag", "ScienceDaily"],
  });
}
