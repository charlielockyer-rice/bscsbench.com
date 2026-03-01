"use client";

import { useEffect, useState } from "react";
import {
  RotateCcw,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import type { ProcessedTrace } from "@/lib/trace-types";
import { TraceTurn } from "./TraceTurn";

export function TraceViewer({
  workspaceId,
}: {
  workspaceId: string;
}) {
  const [trace, setTrace] = useState<ProcessedTrace | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/traces/${workspaceId}.json`)
      .then((res) => {
        if (!res.ok) throw new Error("Trace not found");
        return res.json();
      })
      .then(setTrace)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [workspaceId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <RotateCcw className="size-5 animate-spin mr-2" />
        Loading trace...
      </div>
    );
  }

  if (error || !trace) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center text-sm text-destructive">
        {error || "Failed to load trace"}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Turns */}
      <div className="space-y-3">
        {trace.turns.map((turn) => (
          <TraceTurn key={turn.index} turn={turn} />
        ))}
      </div>

      {/* Summary footer */}
      {trace.summary.resultText && (
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 text-sm font-medium mb-2">
            {trace.summary.isError ? (
              <XCircle className="size-4 text-[oklch(0.63_0.21_25)]" />
            ) : (
              <CheckCircle2 className="size-4 text-[oklch(0.72_0.19_142)]" />
            )}
            Result
          </div>
          <div className="text-sm text-muted-foreground whitespace-pre-wrap">
            {trace.summary.resultText}
          </div>
        </div>
      )}
    </div>
  );
}
