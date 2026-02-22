import { NextResponse } from "next/server";

const LATE_API_KEY = process.env.LATE_API_KEY!;
const LATE_API_URL = process.env.LATE_API_URL!;

export async function GET() {
  try {
    const res = await fetch(`${LATE_API_URL}/accounts`, {
      headers: {
        Authorization: `Bearer ${LATE_API_KEY}`,
      },
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
