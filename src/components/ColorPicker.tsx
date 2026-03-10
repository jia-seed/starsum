"use client";

import { BADGE_COLORS } from "@/lib/utils";
import { useState } from "react";

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

const COLOR_MAP: Record<string, string> = {
  yellow: "#dfb317",
  blue: "#007ec6",
  green: "#097969",
  red: "#e05d44",
  orange: "#fe7d37",
  brightgreen: "#44cc11",
};

export default function ColorPicker({ value, onChange }: ColorPickerProps) {
  const [customHex, setCustomHex] = useState("");

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-text-muted">Color</label>
      <div className="flex flex-wrap gap-2">
        {BADGE_COLORS.map((color) => (
          <button
            key={color.value}
            onClick={() => onChange(color.value)}
            className={`px-3 py-1.5 rounded-md text-sm transition-all ${
              value === color.value
                ? "ring-2 ring-accent ring-offset-2 ring-offset-background"
                : "hover:opacity-80"
            }`}
            style={{
              backgroundColor:
                color.value.length === 6
                  ? `#${color.value}`
                  : COLOR_MAP[color.value] || color.value,
              color: ["yellow", "orange", "brightgreen"].includes(color.value)
                ? "black"
                : "white",
            }}
          >
            {color.name}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="text"
          placeholder="Custom hex (e.g. ff69b4)"
          value={
            !BADGE_COLORS.some((c) => c.value === value) ? value : customHex
          }
          onChange={(e) => {
            const hex = e.target.value.replace("#", "");
            setCustomHex(hex);
            if (/^[0-9a-fA-F]{3,6}$/.test(hex)) {
              onChange(hex);
            }
          }}
          className="px-3 py-1.5 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-accent w-48"
        />
      </div>
    </div>
  );
}
