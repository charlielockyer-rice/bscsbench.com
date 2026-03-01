export interface TraceMetadata {
  workspaceId: string;
  model: string;
  sessionId: string;
  tools: string[];
  claudeCodeVersion: string;
}

export interface TraceSummary {
  durationMs: number;
  numTurns: number;
  totalCostUsd: number;
  isError: boolean;
  resultText: string;
  rateLimitEvents: number;
}

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
  output: string;
}

export type TraceBlock =
  | { type: "text"; text: string }
  | { type: "thinking"; text: string }
  | { type: "tool_call"; call: ToolCall };

export interface TraceTurn {
  index: number;
  blocks: TraceBlock[];
}

export interface ProcessedTrace {
  metadata: TraceMetadata;
  turns: TraceTurn[];
  summary: TraceSummary;
}
