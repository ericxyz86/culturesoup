// Supplement cache — stores posts from the Mac Mini feeder (Bird + last30days)
import type { RawPost as TrendPost } from "./scanner";

interface SupplementData {
  generatedAt: string;
  birdCount: number;
  last30Count: number;
  totalCount: number;
  posts: TrendPost[];
}

let cached: SupplementData | null = null;
let cachedAt = 0;
const MAX_AGE_MS = 6 * 60 * 60 * 1000; // 6 hours

export function setSupplementData(data: SupplementData) {
  cached = data;
  cachedAt = Date.now();
  console.log(
    `[Supplement] Cached ${data.totalCount} posts (${data.birdCount} Bird, ${data.last30Count} last30days)`
  );
}

export function getSupplementPosts(): TrendPost[] {
  if (!cached) return [];
  if (Date.now() - cachedAt > MAX_AGE_MS) {
    console.log("[Supplement] Cache expired");
    return [];
  }
  return cached.posts;
}

export function getSupplementStatus() {
  if (!cached) return { available: false };
  return {
    available: true,
    generatedAt: cached.generatedAt,
    birdCount: cached.birdCount,
    last30Count: cached.last30Count,
    totalCount: cached.totalCount,
    ageMinutes: Math.round((Date.now() - cachedAt) / 60000),
  };
}
