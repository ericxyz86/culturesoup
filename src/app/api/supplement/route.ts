import { NextResponse } from "next/server";
import { setSupplementData, getSupplementStatus } from "@/lib/supplement-cache";

const FEEDER_KEY = process.env.FEEDER_KEY || "cs-feeder-2026";

// POST — receive supplement data from Mac Mini feeder
export async function POST(req: Request) {
  const key = req.headers.get("x-feeder-key");
  if (key !== FEEDER_KEY) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const data = await req.json();
    if (!data.posts || !Array.isArray(data.posts)) {
      return NextResponse.json(
        { error: "invalid payload: posts array required" },
        { status: 400 }
      );
    }

    setSupplementData(data);
    return NextResponse.json({
      ok: true,
      received: data.posts.length,
      birdCount: data.birdCount || 0,
      last30Count: data.last30Count || 0,
    });
  } catch (e) {
    return NextResponse.json(
      { error: "invalid JSON" },
      { status: 400 }
    );
  }
}

// GET — check supplement status
export async function GET() {
  return NextResponse.json(getSupplementStatus());
}
