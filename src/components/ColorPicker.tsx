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
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className="space-y-3">
      <label className="text-sm text-neutral-500">color</label>
      <div className="flex flex-wrap gap-2">
        {BADGE_COLORS.map((color) => (
          <button
            key={color.value}
            onClick={() => onChange(color.value)}
            title={color.name}
            className={`w-8 h-8 rounded-full transition-all duration-300 border ${
              value === color.value
                ? "ring-2 ring-neutral-500 ring-offset-2 ring-offset-black border-transparent"
                : "border-transparent hover:opacity-80"
            }`}
            style={{
              backgroundColor:
                /^[0-9a-fA-F]{6}$/.test(color.value)
                  ? `#${color.value}`
                  : COLOR_MAP[color.value] || color.value,
            }}
          />
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="text"
          placeholder="custom hex (e.g. ff69b4)"
          value={
            isEditing
              ? customHex
              : !BADGE_COLORS.some((c) => c.value === value)
                ? value
                : customHex
          }
          onFocus={() => {
            setIsEditing(true);
            if (!BADGE_COLORS.some((c) => c.value === value)) {
              setCustomHex(value);
            }
          }}
          onChange={(e) => {
            const hex = e.target.value.replace("#", "");
            setCustomHex(hex);
          }}
          onBlur={() => {
            setIsEditing(false);
            if (/^[0-9a-fA-F]{3,6}$/.test(customHex)) {
              onChange(customHex);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && /^[0-9a-fA-F]{3,6}$/.test(customHex)) {
              onChange(customHex);
            }
          }}
          className="px-3 py-1.5 bg-black border border-neutral-800 rounded-md text-sm text-white placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:border-transparent w-52 transition-all duration-300"
        />
      </div>
    </div>
  );
}
