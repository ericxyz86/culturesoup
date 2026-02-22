import { NextResponse } from "next/server";
import { getCachedScan } from "@/lib/scan-cache";

export async function GET() {
  const cached = getCachedScan();
  if (!cached) {
    return NextResponse.json({ trends: [], scannedAt: null, sources: [], rawCount: 0 });
  }
  return NextResponse.json(cached);
}
