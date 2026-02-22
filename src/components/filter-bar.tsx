"use client";

import { Platform } from "@/lib/types";

interface FilterBarProps {
  selectedPlatform: Platform | "all";
  onPlatformChange: (platform: Platform | "all") => void;
}

const PLATFORMS: { value: Platform | "all"; label: string }[] = [
  { value: "all", label: "All Platforms" },
  { value: "twitter", label: "X / Twitter" },
  { value: "instagram", label: "Instagram" },
  { value: "linkedin", label: "LinkedIn" },
];

export function FilterBar({ selectedPlatform, onPlatformChange }: FilterBarProps) {
  return (
    <div className="flex gap-2 mb-4 flex-wrap">
      {PLATFORMS.map((p) => (
        <button
          key={p.value}
          onClick={() => onPlatformChange(p.value)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            selectedPlatform === p.value
              ? "bg-[#ff6b35] text-white"
              : "bg-[#1a1a2e] text-[#888] hover:text-white hover:bg-[#2a2a4e]"
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
