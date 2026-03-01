export interface ModelUsageEntry {
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  costUsd: number;
}

export interface AgentMeta {
  workspaceId: string;
  modelUsage: ModelUsageEntry[];
  claudeCodeVersion: string;
  rateLimitEvents: number;
}
