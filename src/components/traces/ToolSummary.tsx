import type { ToolCall } from "@/lib/trace-types";

export function toolSummary(call: ToolCall): string {
  const input = call.input;

  switch (call.name) {
    case "Read":
      return stripPath(input.file_path as string || "");
    case "Write":
      return stripPath(input.file_path as string || "");
    case "Edit":
      return stripPath(input.file_path as string || "");
    case "Bash":
      return truncLine(input.command as string || "", 60);
    case "Grep":
      return truncLine(input.pattern as string || "", 60);
    case "Glob":
      return truncLine(input.pattern as string || "", 60);
    case "WebFetch":
      return truncLine(input.url as string || "", 60);
    case "WebSearch":
      return truncLine(input.query as string || "", 60);
    case "Task":
      return truncLine(input.description as string || "", 60);
    case "TodoWrite":
      return "updating todos";
    default:
      return "";
  }
}

function stripPath(p: string): string {
  return p.replace(/^\.\//, "");
}

function truncLine(s: string, max: number): string {
  const line = s.split("\n")[0];
  if (line.length <= max) return line;
  return line.slice(0, max) + "...";
}
