import { cn } from "@/lib/utils";

function rateColor(rate: number): string {
  if (rate >= 0.9) return "bg-[oklch(0.72_0.19_142)]"; // green
  if (rate >= 0.7) return "bg-[oklch(0.80_0.18_85)]"; // amber
  if (rate >= 0.5) return "bg-[oklch(0.75_0.18_55)]"; // orange
  return "bg-[oklch(0.63_0.21_25)]"; // red
}

export function PassRateBar({
  rate,
  className,
}: {
  rate: number;
  className?: string;
}) {
  return (
    <div className={cn("h-2 w-full rounded-full bg-muted", className)}>
      <div
        className={cn("h-full rounded-full transition-all", rateColor(rate))}
        style={{ width: `${Math.round(rate * 100)}%` }}
      />
    </div>
  );
}
