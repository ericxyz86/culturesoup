import { TrendingTopic } from "./types";

interface ScanResult {
  trends: TrendingTopic[];
  scannedAt: string;
  sources: string[];
  rawCount: number;
}

// Simple in-memory cache for the last scan result
let lastScan: ScanResult | null = null;

export function setCachedScan(result: ScanResult) {
  lastScan = result;
}

export function getCachedScan(): ScanResult | null {
  return lastScan;
}
