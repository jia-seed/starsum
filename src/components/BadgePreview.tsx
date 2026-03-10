"use client";

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

  return (
    <div className="flex flex-col items-center gap-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={badgeUrl}
        alt={`Total Stars: ${totalStars}`}
        className="h-8"
        key={badgeUrl}
      />
      <code className="text-xs text-text-muted bg-background px-3 py-2 rounded-lg break-all max-w-full block text-center">
        {`![Total Stars](${badgeUrl})`}
      </code>
    </div>
  );
}
