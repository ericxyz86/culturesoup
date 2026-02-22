import { NextResponse } from "next/server";
import { MOCK_POSTS } from "@/lib/mock-data";

// v1: Returns mock generated posts
// Future: Will use LLM to generate platform-specific posts from trending topics
export async function POST() {
  return NextResponse.json({
    posts: MOCK_POSTS,
    generatedAt: new Date().toISOString(),
  });
}
