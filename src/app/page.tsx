"use client";

import { useState } from "react";
import { StatsBar } from "@/components/stats-bar";
import { TrendCard } from "@/components/trend-card";
import { MOCK_TRENDS, MOCK_POSTS } from "@/lib/mock-data";
import { FireIcon, RefreshIcon } from "@/components/icons";
import { Stats } from "@/lib/types";

export default function DashboardPage() {
  const [trends] = useState(MOCK_TRENDS);

  const stats: Stats = {
    topicsFound: trends.length,
    platformsScanned: 4,
    peakEngagement: "17M+",
    publishedCount: MOCK_POSTS.filter((p) => p.status === "published").length,
  };

  return (
    <>
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <FireIcon className="w-6 h-6 text-[#ff6b35]" />
          AI <span className="text-[#ff6b35]">Trend Scanner</span>
        </h1>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#1a1a2e] text-[#888] hover:text-white hover:bg-[#2a2a4e] transition-colors">
          <RefreshIcon className="w-3.5 h-3.5" />
          Scan Now
        </button>
      </div>
      <p className="text-[#888] text-sm mb-8">
        High-engagement AI content across platforms — {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} | Powered by Agile Intelligence
      </p>

      <StatsBar stats={stats} />

      <div className="mb-10">
        <h2 className="text-xl font-semibold mb-4 pb-2 border-b-2 border-[#ff6b35] inline-block">
          <FireIcon className="w-5 h-5 text-[#ff6b35] inline mr-1 -mt-1" />
          Trending Now
        </h2>
        <div>
          {trends.map((trend) => (
            <TrendCard key={trend.id} trend={trend} />
          ))}
        </div>
      </div>
    </>
  );
}
