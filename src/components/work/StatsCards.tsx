import {
  Clock,
  DollarSign,
  RotateCcw,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import type { TraceSummary } from "@/lib/trace-types";
import { formatCost, formatTime } from "@/lib/formatting";
import { StatCard } from "@/components/ui/StatCard";

export function StatsCards({ summary }: { summary: TraceSummary | null }) {
  if (!summary) return null;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatCard
        icon={Clock}
        label="Duration"
        value={formatTime(summary.durationMs / 1000)}
      />
      <StatCard
        icon={RotateCcw}
        label="Turns"
        value={String(summary.numTurns)}
      />
      <StatCard
        icon={DollarSign}
        label="Cost"
        value={formatCost(summary.totalCostUsd)}
      />
      <StatCard
        icon={summary.isError ? XCircle : CheckCircle2}
        label="Status"
        value={summary.isError ? "Error" : "Success"}
      />
    </div>
  );
}
