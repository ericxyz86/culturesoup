import { TrendingTopic } from "@/lib/types";
import { ExternalLinkIcon } from "./icons";

interface TrendCardProps {
  trend: TrendingTopic;
}

function timeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / (1000 * 60));
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatDate(isoDate: string): string {
  const d = new Date(isoDate);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const PLATFORM_ICONS: Record<string, { icon: string; color: string }> = {
  "X/Twitter": { icon: "𝕏", color: "#1d9bf0" },
  Reddit: { icon: "🔴", color: "#ff4500" },
  YouTube: { icon: "▶", color: "#ff0000" },
  "Hacker News": { icon: "Y", color: "#ff6600" },
  TikTok: { icon: "♪", color: "#00f2ea" },
};

export function TrendCard({ trend }: TrendCardProps) {
  const age = trend.discoveredAt ? timeAgo(trend.discoveredAt) : null;
  const posted = trend.discoveredAt ? formatDate(trend.discoveredAt) : null;
  const pi = PLATFORM_ICONS[trend.platform] || { icon: "●", color: "#ff6b35" };

  return (
    <div className="bg-[#111] border border-[#222] rounded-xl p-5 mb-4 transition-colors hover:border-[#ff6b35] group">
      {/* Header: platform + age badge */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span
            className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold"
            style={{ backgroundColor: `${pi.color}22`, color: pi.color }}
          >
            {pi.icon}
          </span>
          <span className="text-xs font-medium" style={{ color: pi.color }}>
            {trend.platform}
          </span>
          {trend.platformDetail && (
            <span className="text-[11px] text-[#666]">· {trend.platformDetail}</span>
          )}
        </div>
        {age && (
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-900/40 text-emerald-400 border border-emerald-800/50">
            {age}
          </span>
        )}
      </div>

      {/* Title */}
      <h3 className="text-[1.05rem] font-semibold mb-2 leading-snug">
        <a
          href={trend.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-white no-underline hover:text-[#ff6b35] transition-colors inline-flex items-start gap-1.5"
        >
          <span>{trend.title}</span>
          <ExternalLinkIcon className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1" />
        </a>
      </h3>

      {/* Engagement + date row */}
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        {trend.engagement && (
          <span className="text-xs text-[#aaa] bg-[#1a1a2e] px-2.5 py-1 rounded-md">
            📊 {trend.engagement}
          </span>
        )}
        {posted && (
          <span className="text-[11px] text-[#666]">
            📅 {posted}
          </span>
        )}
      </div>

      {/* Why trending */}
      <div className="bg-[#0d1117] border border-[#1e2a3a] px-3.5 py-2.5 rounded-lg text-[13px] text-[#aaa] leading-relaxed">
        <strong className="text-[#ccc]">Why it&apos;s trending:</strong> {trend.whyTrending}
      </div>
    </div>
  );
}
