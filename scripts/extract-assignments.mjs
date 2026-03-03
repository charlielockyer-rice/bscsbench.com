#!/usr/bin/env node

/**
 * Extracts assignment instructions and provided files from agent traces.
 * Instructions are the same across models, so we extract from one trace per assignment.
 * Provided files are the files the agent reads before making any edits (turn 0).
 */

import { readFileSync, readdirSync, mkdirSync, writeFileSync, existsSync } from "fs";
import { join, basename } from "path";

const TRACES_DIR = join(import.meta.dirname, "..", "public", "traces");
const OUT_DIR = join(import.meta.dirname, "..", "public", "assignments");

function stripPaths(text) {
  if (typeof text !== "string") return text;
  return text.replace(
    /\/Users\/[^/]+\/Code\/bscs-bench\/workspaces\/[^/]+\//g,
    "./"
  );
}

function stripLineNumbers(text) {
  // Trace tool output has line-number prefixes like "     1→content"
  return text.replace(/^ *\d+→/gm, "");
}

function stripPersistedOutput(text) {
  // Claude Code wraps large outputs in <persisted-output>...\nPreview (first 2KB):\n...actual content...</persisted-output>
  const match = text.match(/<persisted-output>\s*Output too large[^\n]*\n\nPreview \(first \d+KB\):\n([\s\S]*?)<\/persisted-output>/);
  if (match) return match[1].trim();
  // Also handle simpler wrapper without preview header
  const simple = text.match(/<persisted-output>\s*([\s\S]*?)<\/persisted-output>/);
  if (simple) return simple[1].trim();
  return text;
}

function getAssignmentBase(workspaceId) {
  // Strip model suffixes: comp140_circles_opus -> comp140_circles
  return workspaceId
    .replace(/_opus$/, "")
    .replace(/_haiku$/, "")
    .replace(/_sonnet$/, "");
}

function extractFromTrace(tracePath) {
  const trace = JSON.parse(readFileSync(tracePath, "utf-8"));
  let instructions = null;
  const providedFiles = [];
  const seenPaths = new Set();

  // Scan early turns for file reads before any edits
  let sawEdit = false;
  for (const turn of trace.turns) {
    for (const block of turn.blocks) {
      if (block.type !== "tool_call") continue;
      const call = block.call;

      // Stop collecting provided files after first edit
      if (["Edit", "Write"].includes(call.name)) {
        sawEdit = true;
      }

      if (call.name === "Read") {
        const filePath = call.input?.file_path || "";
        const rawOutput = call.output || "";
        if (!rawOutput || rawOutput.length < 20) continue;

        const cleanPath = stripPaths(filePath).replace(/^\.\//, "");
        const content = stripLineNumbers(stripPaths(stripPersistedOutput(rawOutput)));

        // Instructions file — concatenate chunked reads, skip errors
        if (cleanPath.includes("instructions")) {
          if (content.includes("exceeds maximum") || content.includes("tool_use_error")) continue;
          if (!instructions) {
            instructions = content;
          } else {
            instructions += "\n" + content;
          }
          continue;
        }

        // Provided files: only before first edit, only workspace-local files
        if (
          !sawEdit &&
          !seenPaths.has(cleanPath) &&
          !cleanPath.startsWith("/") &&
          !cleanPath.includes("instructions") &&
          !cleanPath.includes("agent_") &&
          !cleanPath.includes("grade_") &&
          !cleanPath.includes("workspace.json") &&
          !cleanPath.includes("workspace.yaml") &&
          !cleanPath.includes(".gitignore")
        ) {
          seenPaths.add(cleanPath);
          const filename = basename(cleanPath);
          providedFiles.push({ path: cleanPath, filename, content });
        }
      }
    }
    // Don't scan too many turns - instructions and templates are read early
    if (turn.index > 5 && instructions) break;
  }

  return { instructions, providedFiles };
}

function main() {
  if (!existsSync(TRACES_DIR)) {
    console.error("No traces directory found. Run extract-traces first.");
    process.exit(1);
  }

  mkdirSync(OUT_DIR, { recursive: true });

  const traceFiles = readdirSync(TRACES_DIR).filter((f) => f.endsWith(".json"));
  console.log(`Found ${traceFiles.length} trace files`);

  // Group by assignment base, prefer opus traces
  const byAssignment = new Map();
  for (const f of traceFiles) {
    const wsId = f.replace(".json", "");
    const base = getAssignmentBase(wsId);
    // Prefer opus, then sonnet (no suffix), then haiku
    const priority = wsId.includes("_opus") ? 0 : wsId.includes("_haiku") ? 2 : 1;
    const existing = byAssignment.get(base);
    if (!existing || priority < existing.priority) {
      byAssignment.set(base, { file: f, priority });
    }
  }

  let totalFiles = 0;
  for (const [base, { file }] of byAssignment) {
    try {
      const { instructions, providedFiles } = extractFromTrace(
        join(TRACES_DIR, file)
      );
      if (!instructions) {
        console.warn(`  No instructions found for ${base}`);
        continue;
      }

      const data = { assignmentBase: base, instructions, providedFiles };
      writeFileSync(join(OUT_DIR, `${base}.json`), JSON.stringify(data));
      totalFiles++;
    } catch (err) {
      console.error(`  Error processing ${base}: ${err.message}`);
    }
  }

  console.log(
    `\nDone! Wrote ${totalFiles} assignment files to public/assignments/`
  );
}

main();
