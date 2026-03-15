"use client";

import { useState } from "react";
import { generateBadgeUrl } from "@/lib/utils";

interface BadgePreviewProps {
  totalStars: number;
  color: string;
  style: string;
}

export default function BadgePreview({
  totalStars,
  color,
  style,
}: BadgePreviewProps) {
  const badgeUrl = generateBadgeUrl(totalStars, color, style);
  const markdown = `![Total Stars](${badgeUrl})`;
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={badgeUrl}
        alt={`Total Stars: ${totalStars}`}
        className="h-8"
        key={badgeUrl}
      />
      <div className="flex items-center gap-2 max-w-full">
        <code className="text-xs text-neutral-500 bg-neutral-800 px-4 py-2 rounded-lg break-all block text-center border border-neutral-700 font-mono">
          {markdown}
        </code>
        <button
          onClick={handleCopy}
          className="shrink-0 p-2 rounded-md bg-neutral-800 border border-neutral-700 text-neutral-400 hover:text-white transition-colors duration-200"
          title="Copy to clipboard"
        >
          {copied ? (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
