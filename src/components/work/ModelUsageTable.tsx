import { formatTokens, formatCost } from "@/lib/formatting";
import type { ModelUsageEntry } from "@/lib/agent-meta-types";

export function ModelUsageTable({ usage }: { usage: ModelUsageEntry[] }) {
  if (usage.length === 0) return null;

  return (
    <div className="rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs uppercase tracking-wider text-muted-foreground border-b">
            <th className="p-3 text-left font-medium">Model</th>
            <th className="p-3 text-right font-medium">Input</th>
            <th className="p-3 text-right font-medium">Output</th>
            <th className="p-3 text-right font-medium">Cache Read</th>
            <th className="p-3 text-right font-medium">Cost</th>
          </tr>
        </thead>
        <tbody>
          {usage.map((u) => (
            <tr key={u.model} className="border-t border-border/50">
              <td className="p-3 font-mono text-xs">{u.model}</td>
              <td className="p-3 text-right tabular-nums">{formatTokens(u.inputTokens)}</td>
              <td className="p-3 text-right tabular-nums">{formatTokens(u.outputTokens)}</td>
              <td className="p-3 text-right tabular-nums">{formatTokens(u.cacheReadTokens)}</td>
              <td className="p-3 text-right tabular-nums">{formatCost(u.costUsd)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
