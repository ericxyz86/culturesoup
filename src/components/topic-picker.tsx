"use client";

import { TrendingTopic, Platform } from "@/lib/types";
import { CheckIcon, ExternalLinkIcon } from "./icons";

interface Selection {
  trendId: string;
  platforms: Platform[];
}

interface TopicPickerProps {
  trends: TrendingTopic[];
  selections: Selection[];
  onToggleTrend: (trendId: string) => void;
  onTogglePlatform: (trendId: string, platform: Platform) => void;
}

const PLATFORMS: { value: Platform; label: string; color: string; icon: string }[] = [
  { value: "twitter", label: "X / Twitter", color: "#1d9bf0", icon: "𝕏" },
  { value: "instagram", label: "Instagram", color: "#e1306c", icon: "📷" },
  { value: "linkedin", label: "LinkedIn", color: "#0a66c2", icon: "in" },
];

function timeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return "just now";
  if (hours === 1) return "1h ago";
  return `${hours}h ago`;
}

export function TopicPicker({
  trends,
  selections,
  onToggleTrend,
  onTogglePlatform,
}: TopicPickerProps) {
  return (
    <div className="space-y-3">
      {trends.map((trend) => {
        const sel = selections.find((s) => s.trendId === trend.id);
        const isSelected = !!sel;

        return (
          <div
            key={trend.id}
            className={`rounded-xl border transition-all ${
              isSelected
                ? "border-[#ff6b35] bg-[#0d1117]"
                : "border-[#222] bg-[#111] hover:border-[#444]"
            }`}
          >
            {/* Trend header — clickable to select/deselect */}
            <button
              onClick={() => onToggleTrend(trend.id)}
              className="w-full text-left p-4 flex items-start gap-3"
            >
              {/* Checkbox */}
              <div
                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                  isSelected
                    ? "bg-[#ff6b35] border-[#ff6b35]"
                    : "border-[#444] bg-transparent"
                }`}
              >
                {isSelected && <CheckIcon className="w-3 h-3 text-white" />}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] text-[#ff6b35] uppercase tracking-wider font-medium">
                    {trend.platform}
                  </span>
                  {trend.discoveredAt && (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-900/40 text-emerald-400 border border-emerald-800/50">
                      {timeAgo(trend.discoveredAt)}
                    </span>
                  )}
                </div>
                <h3 className="text-sm font-semibold text-white leading-tight mb-1">
                  {trend.title}
                </h3>
                <p className="text-xs text-[#888] line-clamp-2">{trend.whyTrending}</p>
              </div>

              {/* External link */}
              <a
                href={trend.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#555] hover:text-[#ff6b35] transition-colors flex-shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLinkIcon className="w-4 h-4" />
              </a>
            </button>

            {/* Platform selector — shows when trend is selected */}
            {isSelected && (
              <div className="px-4 pb-4 pt-0 flex items-center gap-2 ml-8">
                <span className="text-[10px] text-[#666] uppercase tracking-wider mr-1">
                  Post to:
                </span>
                {PLATFORMS.map((p) => {
                  const active = sel?.platforms.includes(p.value);
                  return (
                    <button
                      key={p.value}
                      onClick={() => onTogglePlatform(trend.id, p.value)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                        active
                          ? "text-white shadow-sm"
                          : "bg-[#1a1a2e] text-[#555] hover:text-[#888] hover:bg-[#222]"
                      }`}
                      style={
                        active
                          ? { backgroundColor: p.color }
                          : undefined
                      }
                    >
                      <span className="text-[10px]">{p.icon}</span>
                      {p.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {trends.length === 0 && (
        <div className="text-center py-12 text-[#555] text-sm">
          No trends loaded. Go to Dashboard and hit Scan Now first.
        </div>
      )}
    </div>
  );
}
