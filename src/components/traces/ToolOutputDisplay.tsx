"use client";

import { useState } from "react";

export function ToolOutputDisplay({ output }: { output: string }) {
  const [expanded, setExpanded] = useState(false);

  if (!output) return null;

  const lines = output.split("\n");
  const isLong = lines.length > 20;
  const displayLines = expanded ? lines : lines.slice(0, 20);

  return (
    <div className="relative">
      <pre className="bg-muted/30 rounded p-3 font-mono text-[11px] leading-relaxed overflow-x-auto max-h-64 overflow-y-auto whitespace-pre-wrap break-all">
        {displayLines.join("\n")}
      </pre>
      {isLong && !expanded && (
        <div className="flex justify-end mt-1">
          <button
            className="text-[10px] text-muted-foreground hover:text-foreground"
            onClick={() => setExpanded(true)}
          >
            Show all {lines.length} lines
          </button>
        </div>
      )}
    </div>
  );
}
