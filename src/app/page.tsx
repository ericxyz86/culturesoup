"use client";

import { useState, useMemo, useCallback } from "react";
import { StatsBar } from "@/components/stats-bar";
import { TrendCard } from "@/components/trend-card";
import { MOCK_TRENDS, MOCK_POSTS } from "@/lib/mock-data";
import { FireIcon, RefreshIcon } from "@/components/icons";
import { TrendingTopic, Stats } from "@/lib/types";

const TWENTY_FOUR_HOURS = 48 * 60 * 60 * 1000;

export default function DashboardPage() {
  const [trends, setTrends] = useState<TrendingTopic[]>(MOCK_TRENDS);
  const [scanning, setScanning] = useState(false);
  const [lastScan, setLastScan] = useState<string | null>(null);
  const [sources, setSources] = useState<string[]>([]);
  const [rawCount, setRawCount] = useState(0);

  const filteredTrends = useMemo(() => {
    const cutoff = Date.now() - TWENTY_FOUR_HOURS;
    return trends
      .filter((t) => t.discoveredAt && new Date(t.discoveredAt).getTime() > cutoff)
      .sort((a, b) => new Date(b.discoveredAt).getTime() - new Date(a.discoveredAt).getTime());
  }, [trends]);

  const handleScan = useCallback(async () => {
    setScanning(true);
    try {
      const res = await fetch("/api/scan", { method: "POST" });
      const data = await res.json();
      if (data.trends?.length) {
        setTrends(data.trends);
        setSources(data.sources || []);
        setRawCount(data.rawCount || 0);
      }
      setLastScan(new Date().toLocaleTimeString());
    } catch (e) {
      console.error("Scan failed:", e);
    } finally {
      setScanning(false);
    }
  }, []);

  const stats: Stats = {
    topicsFound: filteredTrends.length,
    platformsScanned: sources.length || 4,
    peakEngagement: filteredTrends[0]?.engagement || "\u2014",
    publishedCount: MOCK_POSTS.filter((p) => p.status === "published").length,
  };

  return (
    <>
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <FireIcon className="w-6 h-6 text-[#ff6b35]" />
          CultureSoup <span className="text-[#ff6b35]">v0.4</span>
        </h1>
        <button
          onClick={handleScan}
          disabled={scanning}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#1a1a2e] text-[#888] hover:text-white hover:bg-[#2a2a4e] transition-colors disabled:opacity-50"
        >
          <RefreshIcon className={`w-3.5 h-3.5 ${scanning ? "animate-spin" : ""}`} />
          {scanning ? "Scanning..." : "Scan Now"}
        </button>
      </div>
      <p className="text-[#888] text-sm mb-1">
        Last 48 hours \u00B7 {filteredTrends.length} hot AI trends \u00B7{" "}
        {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} | Powered by Agile Intelligence
      </p>
      {lastScan && (
        <p className="text-[#555] text-xs mb-1">
          Last scan: {lastScan} \u00B7 {rawCount} posts scanned across {sources.join(", ")}
        </p>
      )}
      <div className="mb-8" />

      <StatsBar stats={stats} />

      <div className="mb-10">
        <h2 className="text-xl font-semibold mb-4 pb-2 border-b-2 border-[#ff6b35] inline-block">
          <FireIcon className="w-5 h-5 text-[#ff6b35] inline mr-1 -mt-1" />
          Trending Now
        </h2>
        <div>
          {filteredTrends.map((trend) => (
            <TrendCard key={trend.id} trend={trend} />
          ))}
          {filteredTrends.length === 0 && !scanning && (
            <p className="text-[#666] text-sm py-8 text-center">No trends in the last 24 hours. Hit Scan Now to refresh.</p>
          )}
          {scanning && (
            <div className="text-center py-12">
              <div className="inline-block w-8 h-8 border-2 border-[#ff6b35] border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-[#888] text-sm">Scanning Reddit, Hacker News, YouTube, TikTok...</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
