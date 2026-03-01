#!/usr/bin/env node

import { execSync } from "child_process";
import { readdirSync, readFileSync, mkdirSync, writeFileSync, existsSync } from "fs";
import { join, basename } from "path";

const DATA_DIR = join(import.meta.dirname, "..", "data");
const OUT_DIR = join(import.meta.dirname, "..", "public", "agent-meta");
const TRACES_DIR = join(import.meta.dirname, "..", "public", "traces");

function getArchives() {
  return readdirSync(DATA_DIR)
    .filter((f) => f.startsWith("final-") && f.endsWith(".tar.gz"))
    .map((f) => join(DATA_DIR, f));
}

function listFiles(archivePath, pattern) {
  try {
    const output = execSync(
      `tar -tzf "${archivePath}" | grep '${pattern}'`,
      { encoding: "utf-8" }
    );
    return output.trim().split("\n").filter(Boolean);
  } catch {
    return [];
  }
}

function extractFile(archivePath, filePath) {
  return execSync(`tar -xzf "${archivePath}" --to-stdout "${filePath}"`, {
    encoding: "utf-8",
    maxBuffer: 10 * 1024 * 1024,
  });
}

function getWorkspaceId(archivePath) {
  const parts = archivePath.split("/");
  const wsIdx = parts.indexOf("workspaces");
  if (wsIdx === -1 || wsIdx + 1 >= parts.length) return null;
  return parts[wsIdx + 1];
}

function parseModelUsage(modelUsage) {
  const entries = [];
  for (const [model, usage] of Object.entries(modelUsage)) {
    entries.push({
      model,
      inputTokens: usage.inputTokens || 0,
      outputTokens: usage.outputTokens || 0,
      cacheReadTokens: usage.cacheReadInputTokens || 0,
      costUsd: usage.costUSD || 0,
    });
  }
  return entries;
}

function readTraceMetadata(workspaceId) {
  const tracePath = join(TRACES_DIR, `${workspaceId}.json`);
  if (!existsSync(tracePath)) return { claudeCodeVersion: "", rateLimitEvents: 0 };
  try {
    const trace = JSON.parse(readFileSync(tracePath, "utf-8"));
    return {
      claudeCodeVersion: trace.metadata?.claudeCodeVersion || "",
      rateLimitEvents: trace.summary?.rateLimitEvents || 0,
    };
  } catch {
    return { claudeCodeVersion: "", rateLimitEvents: 0 };
  }
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

    const outputPaths = listFiles(archive, "agent_output\\.json$");

    console.log(`  Found ${outputPaths.length} agent_output.json files`);

    for (const outputPath of outputPaths) {
      const workspaceId = getWorkspaceId(outputPath);
      if (!workspaceId) continue;

      try {
        // Extract and parse agent_output.json
        const raw = extractFile(archive, outputPath);
        const agentOutput = JSON.parse(raw);
        const modelUsage = parseModelUsage(agentOutput.modelUsage || {});

        // Read trace metadata from already-extracted trace files
        const { claudeCodeVersion, rateLimitEvents } = readTraceMetadata(workspaceId);

        const data = {
          workspaceId,
          modelUsage,
          claudeCodeVersion,
          rateLimitEvents,
        };

        writeFileSync(join(OUT_DIR, `${workspaceId}.json`), JSON.stringify(data));
        totalFiles++;
      } catch (err) {
        console.error(`  Error processing ${workspaceId}: ${err.message}`);
      }
    }
  }

  console.log(`\nDone! Wrote ${totalFiles} agent-meta files to public/agent-meta/`);
}

main();
