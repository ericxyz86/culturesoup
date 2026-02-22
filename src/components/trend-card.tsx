import { TrendingTopic } from "@/lib/types";
import { LightbulbIcon, ExternalLinkIcon } from "./icons";

interface TrendCardProps {
  trend: TrendingTopic;
}

export function TrendCard({ trend }: TrendCardProps) {
  return (
    <div className="bg-[#111] border border-[#222] rounded-xl p-5 mb-4 transition-colors hover:border-[#ff6b35] group">
      <div className="text-xs text-[#ff6b35] uppercase tracking-wider mb-1">
        {trend.platform} {trend.platformDetail && `\u00B7 ${trend.platformDetail}`}
      </div>
      <h3 className="text-[1.1rem] font-semibold mb-2">
        <a
          href={trend.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-white no-underline hover:text-[#ff6b35] transition-colors inline-flex items-center gap-1.5"
        >
          {trend.title}
          <ExternalLinkIcon className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
        </a>
      </h3>
      <div className="text-[#888] text-sm mb-3">{trend.meta}</div>
      <div className="bg-[#1a1a2e] px-3.5 py-2.5 rounded-lg text-sm text-[#ccc] flex items-start gap-2">
        <LightbulbIcon className="w-4 h-4 text-[#ff6b35] mt-0.5 flex-shrink-0" />
        <span>
          <strong className="text-white">Why it&apos;s trending:</strong> {trend.whyTrending}
        </span>
      </div>
    </div>
  );
}
