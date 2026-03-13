/**
 * Shared model display metadata.
 * Lightweight module safe for both server and client ("use client") imports.
 * Covers workspace model IDs (e.g. "claude-opus-4-6") and reviewer model IDs
 * (e.g. "claude-opus-4.6", "gpt-5.4") used in LLM grades and code reviews.
 */

export interface ModelMeta {
  name: string;
  logo: string;
}

const MODEL_META: Record<string, ModelMeta> = {
  "claude-opus-4-6": { name: "Claude Opus 4.6", logo: "/logos/claude.svg" },
  "claude-opus-4.6": { name: "Claude Opus 4.6", logo: "/logos/claude.svg" },
  "claude-sonnet-4-6": { name: "Claude Sonnet 4.6", logo: "/logos/claude.svg" },
  "claude-haiku-4-5-20251001": { name: "Claude Haiku 4.5", logo: "/logos/claude.svg" },
  "gpt-5.3-codex": { name: "GPT-5.3 Codex", logo: "/logos/openai.png" },
  "codex": { name: "Codex 5.3", logo: "/logos/openai.png" },
  "opus": { name: "Opus 4.6", logo: "/logos/claude.svg" },
  "gpt-5.4": { name: "GPT-5.4", logo: "/logos/openai.png" },
  "gemini-3-flash": { name: "Gemini 3 Flash", logo: "/logos/google.png" },
  "gemini-3-flash-preview": { name: "Gemini 3 Flash", logo: "/logos/google.png" },
  "qwen3-coder": { name: "Qwen3 Coder", logo: "/logos/qwen.png" },
  "kimi-k2.5": { name: "Kimi K2.5", logo: "/logos/moonshot.png" },
};

const LOGO_PREFIXES: [string, string][] = [
  ["claude", "/logos/claude.svg"],
  ["gpt", "/logos/openai.png"],
  ["gemini", "/logos/google.png"],
  ["qwen", "/logos/qwen.png"],
  ["kimi", "/logos/moonshot.png"],
];

export function getModelMeta(modelId: string): ModelMeta {
  if (MODEL_META[modelId]) return MODEL_META[modelId];
  const name = modelId
    .replace(/[-_.]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
  const logo = LOGO_PREFIXES.find(([p]) => modelId.startsWith(p))?.[1] ?? "";
  return { name, logo };
}

export function getModelDisplayName(modelId: string): string {
  return getModelMeta(modelId).name;
}
