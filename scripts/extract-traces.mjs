#!/usr/bin/env node

import { execSync } from "child_process";
import { readdirSync, mkdirSync, writeFileSync } from "fs";
import { join, basename } from "path";

const DATA_DIR = join(import.meta.dirname, "..", "data");
const OUT_DIR = join(import.meta.dirname, "..", "public", "traces");

const MAX_OUTPUT_CHARS = 10_000;

function getArchives() {
  return readdirSync(DATA_DIR)
    .filter((f) => f.startsWith("final-") && f.endsWith(".tar.gz"))
    .map((f) => join(DATA_DIR, f));
}

function listTraceFiles(archivePath) {
  const output = execSync(
    `tar -tzf "${archivePath}" | grep 'agent_trace\\.jsonl$'`,
    { encoding: "utf-8" }
  );
  return output.trim().split("\n").filter(Boolean);
}

function extractTrace(archivePath, tracePath) {
  return execSync(`tar -xzf "${archivePath}" --to-stdout "${tracePath}"`, {
    encoding: "utf-8",
    maxBuffer: 10 * 1024 * 1024,
  });
}

function stripPaths(text) {
  if (typeof text !== "string") return text;
  return text.replace(
    /\/Users\/[^/]+\/Code\/bscs-bench\/workspaces\/[^/]+\//g,
    "./"
  );
}

function stripPathsDeep(obj) {
  if (typeof obj === "string") return stripPaths(obj);
  if (Array.isArray(obj)) return obj.map(stripPathsDeep);
  if (obj && typeof obj === "object") {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      out[k] = stripPathsDeep(v);
    }
    return out;
  }
  return obj;
}

function truncate(text, max = MAX_OUTPUT_CHARS) {
  if (typeof text !== "string") return text;
  if (text.length <= max) return text;
  return text.slice(0, max) + `\n... (truncated ${text.length - max} chars)`;
}

function processTrace(raw) {
  const lines = raw
    .trim()
    .split("\n")
    .map((l) => JSON.parse(l));

  let metadata = { workspaceId: "", model: "", sessionId: "", claudeCodeVersion: "", tools: [] };
  let summary = {
    durationMs: 0,
    numTurns: 0,
    totalCostUsd: 0,
    isError: false,
    resultText: "",
    rateLimitEvents: 0,
  };

  // Collect assistant content blocks grouped by message.id
  const messageBlocks = new Map(); // msgId -> content[]
  const messageOrder = []; // ordered unique msgIds

  // Collect tool results by tool_use_id
  const toolResults = new Map();

  let rateLimitEvents = 0;

  for (const event of lines) {
    if (event.type === "system" && event.subtype === "init") {
      metadata.model = event.model || "";
      metadata.sessionId = event.session_id || "";
      metadata.claudeCodeVersion = event.claude_code_version || "";
      metadata.tools = event.tools || [];
      continue;
    }

    if (event.type === "system" && event.subtype === "rate_limit_event") {
      rateLimitEvents++;
      continue;
    }

    if (event.type === "result") {
      summary.durationMs = event.duration_ms || 0;
      summary.numTurns = event.num_turns || 0;
      summary.totalCostUsd = event.total_cost_usd || 0;
      summary.isError = event.is_error || false;
      summary.resultText = event.result || "";
      continue;
    }

    if (event.type === "assistant") {
      const msg = event.message || {};
      const msgId = msg.id;
      if (!msgId) continue;

      if (!messageBlocks.has(msgId)) {
        messageBlocks.set(msgId, []);
        messageOrder.push(msgId);
      }
      const blocks = messageBlocks.get(msgId);
      for (const content of msg.content || []) {
        blocks.push(content);
      }
      continue;
    }

    if (event.type === "user") {
      const content = event.message?.content;
      if (!Array.isArray(content)) continue;
      for (const block of content) {
        if (block.type === "tool_result") {
          const outputText =
            typeof block.content === "string"
              ? block.content
              : Array.isArray(block.content)
                ? block.content
                    .map((c) =>
                      c.type === "text" ? c.text : JSON.stringify(c)
                    )
                    .join("\n")
                : JSON.stringify(block.content);
          toolResults.set(block.tool_use_id, outputText);
        }
      }
      continue;
    }
  }

  // Build turns from coalesced messages
  const turns = [];
  let turnIndex = 0;
  for (const msgId of messageOrder) {
    const contentBlocks = messageBlocks.get(msgId);
    const traceBlocks = [];

    for (const block of contentBlocks) {
      if (block.type === "text" && block.text) {
        traceBlocks.push({
          type: "text",
          text: stripPaths(block.text.trim()),
        });
      } else if (block.type === "thinking" && block.thinking) {
        traceBlocks.push({
          type: "thinking",
          text: stripPaths(block.thinking.trim()),
        });
      } else if (block.type === "tool_use") {
        const output = toolResults.get(block.id) || "";
        traceBlocks.push({
          type: "tool_call",
          call: {
            id: block.id,
            name: block.name,
            input: stripPathsDeep(block.input),
            output: truncate(stripPaths(output)),
          },
        });
      }
    }

    if (traceBlocks.length > 0) {
      turns.push({ index: turnIndex, blocks: traceBlocks });
      turnIndex++;
    }
  }

  summary.rateLimitEvents = rateLimitEvents;

  return { metadata, turns, summary };
}

function main() {
  const archives = getArchives();
  if (archives.length === 0) {
    console.error("No final-*.tar.gz archives found in data/");
    process.exit(1);
  }

  mkdirSync(OUT_DIR, { recursive: true });

  let totalFiles = 0;

  for (const archive of archives) {
    const archiveName = basename(archive);
    console.log(`Processing ${archiveName}...`);

    const traceFiles = listTraceFiles(archive);
    console.log(`  Found ${traceFiles.length} traces`);

    for (const tracePath of traceFiles) {
      // Extract workspace ID from path like archive-xxx/workspaces/comp140_circles_opus/agent_trace.jsonl
      const parts = tracePath.split("/");
      const workspaceId = parts[parts.length - 2];

      try {
        const raw = extractTrace(archive, tracePath);
        const processed = processTrace(raw);
        processed.metadata.workspaceId = workspaceId;

        const outPath = join(OUT_DIR, `${workspaceId}.json`);
        writeFileSync(outPath, JSON.stringify(processed));
        totalFiles++;
      } catch (err) {
        console.error(`  Error processing ${workspaceId}: ${err.message}`);
      }
    }
  }

  console.log(`\nDone! Wrote ${totalFiles} trace files to public/traces/`);
}

main();
