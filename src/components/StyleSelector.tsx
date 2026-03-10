"use client";

import { BADGE_STYLES } from "@/lib/utils";

interface StyleSelectorProps {
  value: string;
  onChange: (style: string) => void;
}

export default function StyleSelector({ value, onChange }: StyleSelectorProps) {
  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-text-muted">Style</label>
      <div className="flex flex-wrap gap-2">
        {BADGE_STYLES.map((style) => (
          <button
            key={style.value}
            onClick={() => onChange(style.value)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              value === style.value
                ? "bg-accent text-black"
                : "bg-background text-text-muted hover:text-foreground border border-border"
            }`}
          >
            {style.name}
          </button>
        ))}
      </div>
    </div>
  );
}
