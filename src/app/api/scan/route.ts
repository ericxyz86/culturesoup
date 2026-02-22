import { NextResponse } from "next/server";
import { scanAllPlatforms } from "@/lib/scanner";
import { setCachedScan } from "@/lib/scan-cache";

export const maxDuration = 30;

export async function POST() {
  try {
    const result = await scanAllPlatforms();
    setCachedScan(result);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Scan failed:", error);
    return NextResponse.json(
      { error: "Scan failed", message: String(error) },
      { status: 500 }
    );
  }
}
