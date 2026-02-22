import { Stats } from "@/lib/types";

interface StatsBarProps {
  stats: Stats;
}

export function StatsBar({ stats }: StatsBarProps) {
  const items = [
    { value: stats.topicsFound.toString(), label: "Trending Topics" },
    { value: stats.platformsScanned.toString(), label: "Platforms Scanned" },
    { value: stats.peakEngagement, label: "Peak Engagement" },
    { value: stats.publishedCount.toString(), label: "Published" },
  ];

  return (
    <div className="flex gap-4 flex-wrap mb-8">
      {items.map((item) => (
        <div
          key={item.label}
          className="bg-[#1a1a2e] border border-[#2a2a4e] rounded-xl px-5 py-4 flex-1 min-w-[140px]"
        >
          <div className="text-3xl font-bold text-white">{item.value}</div>
          <div className="text-xs text-[#888] uppercase tracking-wider">{item.label}</div>
        </div>
      ))}
    </div>
  );
}
