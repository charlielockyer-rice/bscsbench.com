"use client";

import { useState } from "react";
import {
  ChevronRight,
  FileText,
  Terminal,
  Pencil,
  Search,
  FolderSearch,
  Globe,
  FileOutput,
  Wrench,
} from "lucide-react";
import type { ToolCall } from "@/lib/trace-types";
import { toolSummary } from "./ToolSummary";
import { ToolOutputDisplay } from "./ToolOutputDisplay";
import { cn } from "@/lib/utils";

const TOOL_ICONS: Record<string, React.ElementType> = {
  Read: FileText,
  Write: FileOutput,
  Edit: Pencil,
  Bash: Terminal,
  Grep: Search,
  Glob: FolderSearch,
  WebFetch: Globe,
  WebSearch: Globe,
};

export function TraceToolCall({ call }: { call: ToolCall }) {
  const [open, setOpen] = useState(false);

  const Icon = TOOL_ICONS[call.name] || Wrench;
  const summary = toolSummary(call);

  return (
    <div className="rounded-lg border border-border/50 overflow-hidden">
      <button
        className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted/30"
        onClick={() => setOpen(!open)}
      >
        <Icon className="size-3.5 shrink-0 text-muted-foreground" />
        <span className="font-medium">{call.name}</span>
        {summary && (
          <span className="text-muted-foreground truncate font-mono">
            {summary}
          </span>
        )}
        <ChevronRight
          className={cn(
            "size-3 shrink-0 ml-auto text-muted-foreground transition-transform",
            open && "rotate-90"
          )}
        />
      </button>
      {open && (
        <div className="border-t border-border/50 p-3 space-y-2">
          {/* Input */}
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
              Input
            </div>
            <pre className="bg-muted/30 rounded p-3 font-mono text-[11px] leading-relaxed overflow-x-auto max-h-48 overflow-y-auto whitespace-pre-wrap break-all">
              {formatInput(call)}
            </pre>
          </div>
          {/* Output */}
          {call.output && (
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                Output
              </div>
              <ToolOutputDisplay output={call.output} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function formatInput(call: ToolCall): string {
  // For common tools, show a more readable format
  switch (call.name) {
    case "Read":
      return String(call.input.file_path || "");
    case "Bash":
      return String(call.input.command || "");
    case "Grep":
      return `pattern: ${call.input.pattern || ""}\npath: ${call.input.path || "."}`;
    case "Glob":
      return `pattern: ${call.input.pattern || ""}`;
    case "Edit": {
      const parts: string[] = [];
      if (call.input.file_path) parts.push(`file: ${call.input.file_path}`);
      if (call.input.old_string) parts.push(`old:\n${call.input.old_string}`);
      if (call.input.new_string) parts.push(`new:\n${call.input.new_string}`);
      return parts.join("\n\n");
    }
    case "Write": {
      const parts: string[] = [];
      if (call.input.file_path) parts.push(`file: ${call.input.file_path}`);
      if (call.input.content) {
        const content = String(call.input.content);
        parts.push(content.length > 2000 ? content.slice(0, 2000) + "\n..." : content);
      }
      return parts.join("\n\n");
    }
    default:
      return JSON.stringify(call.input, null, 2);
  }
}
