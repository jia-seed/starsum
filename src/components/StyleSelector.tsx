"use client";

import { BADGE_STYLES } from "@/lib/utils";

interface StyleSelectorProps {
  value: string;
  onChange: (style: string) => void;
}

export default function StyleSelector({ value, onChange }: StyleSelectorProps) {
  return (
    <div className="space-y-3">
      <label className="text-sm text-neutral-500">style</label>
      <div className="flex flex-wrap gap-2">
        {BADGE_STYLES.map((style) => (
          <button
            key={style.value}
            onClick={() => onChange(style.value)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-300 border ${
              value === style.value
                ? "bg-teal-900 text-white border-teal-700"
                : "bg-black text-neutral-400 border-neutral-800 hover:text-white hover:border-neutral-700"
            }`}
          >
            {style.name}
          </button>
        ))}
      </div>
    </div>
  );
}
