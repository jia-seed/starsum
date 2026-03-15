"use client";

interface DiffPreviewProps {
  original: string;
  updated: string;
}

type DiffLine = {
  type: "add" | "remove" | "context";
  content: string;
};

function computeDiff(
  original: string,
  updated: string
): { lines: DiffLine[]; skippedBefore: number; skippedAfter: number } {
  if (!original) {
    return {
      lines: updated
        .split("\n")
        .map((line) => ({ type: "add" as const, content: line })),
      skippedBefore: 0,
      skippedAfter: 0,
    };
  }

  const oldLines = original.split("\n");
  const newLines = updated.split("\n");

  let firstDiff = 0;
  while (
    firstDiff < oldLines.length &&
    firstDiff < newLines.length &&
    oldLines[firstDiff] === newLines[firstDiff]
  ) {
    firstDiff++;
  }

  let oldEnd = oldLines.length - 1;
  let newEnd = newLines.length - 1;
  while (
    oldEnd > firstDiff &&
    newEnd > firstDiff &&
    oldLines[oldEnd] === newLines[newEnd]
  ) {
    oldEnd--;
    newEnd--;
  }

  const ctx = 3;
  const contextStart = Math.max(0, firstDiff - ctx);
  const contextEndIdx = Math.min(newLines.length - 1, newEnd + ctx);

  const result: DiffLine[] = [];

  for (let i = contextStart; i < firstDiff; i++) {
    result.push({ type: "context", content: oldLines[i] });
  }

  for (let i = firstDiff; i <= oldEnd; i++) {
    result.push({ type: "remove", content: oldLines[i] });
  }

  for (let i = firstDiff; i <= newEnd; i++) {
    result.push({ type: "add", content: newLines[i] });
  }

  for (
    let i = Math.max(firstDiff, newEnd + 1);
    i <= contextEndIdx;
    i++
  ) {
    result.push({ type: "context", content: newLines[i] });
  }

  return {
    lines: result,
    skippedBefore: contextStart,
    skippedAfter: Math.max(0, newLines.length - 1 - contextEndIdx),
  };
}

export default function DiffPreview({ original, updated }: DiffPreviewProps) {
  const { lines, skippedBefore, skippedAfter } = computeDiff(
    original,
    updated
  );

  return (
    <div className="rounded-lg overflow-hidden border border-neutral-800 text-left">
      <div className="bg-neutral-800/80 px-4 py-2 text-xs text-neutral-400 font-mono flex items-center gap-2">
        <svg
          className="w-3.5 h-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        README.md
      </div>
      <div className="overflow-x-auto text-xs font-mono leading-relaxed max-h-72 overflow-y-auto">
        {skippedBefore > 0 && (
          <div className="px-4 py-1 text-neutral-600 text-center text-[10px]">
            {skippedBefore} unchanged {skippedBefore === 1 ? "line" : "lines"}
          </div>
        )}
        {lines.map((line, i) => (
          <div
            key={i}
            className={`px-4 py-px whitespace-pre ${
              line.type === "add"
                ? "bg-green-500/15 text-green-300"
                : line.type === "remove"
                ? "bg-red-500/10 text-red-400/60 line-through"
                : "text-neutral-500"
            }`}
          >
            <span className="inline-block w-4 select-none opacity-50 mr-2">
              {line.type === "add" ? "+" : line.type === "remove" ? "−" : " "}
            </span>
            {line.content || "\u00A0"}
          </div>
        ))}
        {skippedAfter > 0 && (
          <div className="px-4 py-1 text-neutral-600 text-center text-[10px]">
            {skippedAfter} unchanged {skippedAfter === 1 ? "line" : "lines"}
          </div>
        )}
      </div>
    </div>
  );
}
