import {
  Clock,
  DollarSign,
  RotateCcw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Cpu,
  Zap,
  Tag,
} from "lucide-react";
import type { TraceSummary, TraceMetadata } from "@/lib/trace-types";
import type { AssignmentResult } from "@/lib/types";
import type { AgentMeta } from "@/lib/agent-meta-types";
import { formatCost, formatTime, formatTokens } from "@/lib/formatting";
import { StatCard } from "@/components/ui/StatCard";

export function StatsCards({
  summary,
  assignment,
  agentMeta,
  traceMetadata,
}: {
  summary: TraceSummary | null;
  assignment?: AssignmentResult | null;
  agentMeta?: AgentMeta | null;
  traceMetadata?: TraceMetadata | null;
}) {
  if (!summary) return null;

  const isTimeout = assignment?.isTimeout ?? false;

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
        icon={isTimeout ? AlertTriangle : summary.isError ? XCircle : CheckCircle2}
        label="Status"
        value={isTimeout ? "Timeout" : summary.isError ? "Error" : "Success"}
        valueClassName={isTimeout ? "text-[oklch(0.75_0.15_75)]" : undefined}
      />
      {assignment && (
        <StatCard
          icon={Clock}
          label="API Time"
          value={formatTime(assignment.durationApiMs / 1000)}
        />
      )}
      {assignment && (
        <StatCard
          icon={Cpu}
          label="Tokens"
          value={formatTokens(assignment.tokens)}
        />
      )}
      {summary.rateLimitEvents > 0 && (
        <StatCard
          icon={Zap}
          label="Rate Limits"
          value={String(summary.rateLimitEvents)}
        />
      )}
      {(() => {
        const ccVersion = traceMetadata?.claudeCodeVersion || agentMeta?.claudeCodeVersion;
        return ccVersion ? (
          <StatCard icon={Tag} label="Claude Code" value={`v${ccVersion}`} />
        ) : null;
      })()}
    </div>
  );
}
