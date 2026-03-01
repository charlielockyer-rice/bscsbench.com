import type React from "react";
import { cn } from "@/lib/utils";

export function StatCard({
  icon: Icon,
  label,
  value,
  sublabel,
  valueClassName,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sublabel?: string;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="size-4" />
        {label}
      </div>
      <div className={cn("mt-1 text-2xl font-bold font-mono tabular-nums", valueClassName)}>
        {value}
      </div>
      {sublabel && (
        <div className="text-xs text-muted-foreground mt-0.5">
          {sublabel}
        </div>
      )}
    </div>
  );
}
