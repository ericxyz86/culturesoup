import { NextRequest, NextResponse } from "next/server";

const LATE_API_KEY = process.env.LATE_API_KEY!;
const LATE_API_URL = process.env.LATE_API_URL!;

const ACCOUNTS: Record<string, string> = {
  twitter: "699a9e088ab8ae478b3bc009",
  instagram: "699a9e2f8ab8ae478b3bc01d",
};

export async function POST(req: NextRequest) {
  try {
    const { content, platform } = await req.json();

    if (!content || !platform) {
      return NextResponse.json(
        { error: "Missing content or platform" },
        { status: 400 }
      );
    }

    const accountId = ACCOUNTS[platform];
    if (!accountId) {
      return NextResponse.json(
        { error: `Platform "${platform}" is not connected` },
        { status: 400 }
      );
    }

    const body = {
      content,
      platforms: [{ platform, accountId }],
      publishNow: true,
    };

    const res = await fetch(`${LATE_API_URL}/posts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LATE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { error: data.error || data.message || "Late API error" },
        { status: res.status }
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
