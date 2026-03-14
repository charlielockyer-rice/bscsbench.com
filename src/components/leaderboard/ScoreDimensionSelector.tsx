"use client";

import type { ScoreDimension } from "@/lib/types";
import { cn } from "@/lib/utils";

const DIMENSIONS: { value: ScoreDimension; label: string }[] = [
  { value: "overall", label: "Overall" },
  { value: "code", label: "Code" },
  { value: "written", label: "Written" },
  { value: "review", label: "Review" },
];

export function ScoreDimensionSelector({
  value,
  onChange,
}: {
  value: ScoreDimension;
  onChange: (dimension: ScoreDimension) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      {DIMENSIONS.map((d) => (
        <button
          key={d.value}
          onClick={() => onChange(d.value)}
          className={cn(
            "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
            value === d.value
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
          )}
        >
          {d.label}
        </button>
      ))}
    </div>
  );
}
