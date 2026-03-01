"use client";

import { useState } from "react";
import { ChevronRight, Brain } from "lucide-react";
import { cn } from "@/lib/utils";

export function TraceThinkingBlock({ text }: { text: string }) {
  const [open, setOpen] = useState(false);

  if (!text) return null;

  const preview = text.slice(0, 80).replace(/\n/g, " ");

  return (
    <div className="rounded-lg border border-border/50 bg-muted/20">
      <button
        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-foreground"
        onClick={() => setOpen(!open)}
      >
        <Brain className="size-3.5 shrink-0" />
        <ChevronRight
          className={cn(
            "size-3 shrink-0 transition-transform",
            open && "rotate-90"
          )}
        />
        <span className="truncate italic">
          {open ? "Thinking" : preview + (text.length > 80 ? "..." : "")}
        </span>
      </button>
      {open && (
        <div className="px-3 pb-3 text-xs text-muted-foreground italic whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto">
          {text}
        </div>
      )}
    </div>
  );
}
