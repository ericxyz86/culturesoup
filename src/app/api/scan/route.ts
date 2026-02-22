import { NextResponse } from "next/server";
import { scanAllPlatforms } from "@/lib/scanner";

export const maxDuration = 30; // allow up to 30s for all platforms

export async function POST() {
  try {
    const result = await scanAllPlatforms();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Scan failed:", error);
    return NextResponse.json(
      { error: "Scan failed", message: String(error) },
      { status: 500 }
    );
  }
}
