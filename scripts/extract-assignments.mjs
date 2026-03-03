#!/usr/bin/env node

/**
 * Extracts assignment instructions and provided files.
 *
 * Instructions: prefer the `instructions.md` bundled in tar.gz archives (full file).
 * Fall back to parsing agent traces when the archive doesn't include the file.
 *
 * Provided files: extracted from agent traces (files read before any edits).
 */

import { readFileSync, readdirSync, mkdirSync, writeFileSync, existsSync } from "fs";
import { join, basename } from "path";
import { execSync } from "child_process";

const DATA_DIR = join(import.meta.dirname, "..", "data");
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
  const simple = text.match(/<persisted-output>\s*([\s\S]*?)<\/persisted-output>/);
  if (simple) return simple[1].trim();
  return text;
}

/**
 * Strip model suffixes: comp140_circles_opus -> comp140_circles
 * Must stay in sync with src/lib/data.ts:getAssignmentBase().
 */
function getAssignmentBase(workspaceId) {
  return workspaceId
    .replace(/_opus$/, "")
    .replace(/_haiku$/, "")
    .replace(/_sonnet$/, "");
}

// ---------------------------------------------------------------------------
// Archive-based extraction: pull instructions.md directly from tar.gz
// ---------------------------------------------------------------------------

function buildArchiveInstructionsMap() {
  const map = new Map(); // assignmentBase -> instructions string
  const archives = readdirSync(DATA_DIR).filter((f) => f.startsWith("final-") && f.endsWith(".tar.gz"));

  for (const archive of archives) {
    const archivePath = join(DATA_DIR, archive);
    // List files matching instructions.md
    let listing;
    try {
      listing = execSync(`tar -tzf "${archivePath}" | grep '/instructions.md$'`, { encoding: "utf-8" }).trim();
    } catch {
      continue; // no instructions in this archive
    }
    if (!listing) continue;

    for (const entry of listing.split("\n")) {
      // entry: archive-TIMESTAMP/workspaces/WORKSPACE_ID/instructions.md
      const parts = entry.split("/");
      const wsId = parts[parts.length - 2]; // e.g. comp318_m3ssag1n8_opus
      const base = getAssignmentBase(wsId);

      if (map.has(base)) continue; // already extracted from a previous archive

      try {
        const content = execSync(`tar -xzf "${archivePath}" --to-stdout "${entry}"`, { encoding: "utf-8" });
        if (content && content.length > 20) {
          map.set(base, content);
        }
      } catch {
        // skip on extraction error
      }
    }
  }

  return map;
}

// ---------------------------------------------------------------------------
// Trace-based extraction (fallback)
// ---------------------------------------------------------------------------

function extractFromTrace(tracePath) {
  const trace = JSON.parse(readFileSync(tracePath, "utf-8"));
  let instructions = null;
  const providedFiles = [];
  const seenPaths = new Set();

  let sawEdit = false;
  for (const turn of trace.turns) {
    for (const block of turn.blocks) {
      if (block.type !== "tool_call") continue;
      const call = block.call;

      if (["Edit", "Write"].includes(call.name)) {
        sawEdit = true;
      }

      if (call.name === "Read") {
        const filePath = call.input?.file_path || "";
        const rawOutput = call.output || "";
        if (!rawOutput || rawOutput.length < 20) continue;

        const cleanPath = stripPaths(filePath).replace(/^\.\//, "");
        const content = stripLineNumbers(stripPaths(stripPersistedOutput(rawOutput)));

        if (cleanPath.includes("instructions")) {
          if (content.includes("exceeds maximum") || content.includes("tool_use_error")) continue;
          if (!instructions) {
            instructions = content;
          } else {
            instructions += "\n" + content;
          }
          continue;
        }

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
    if (turn.index > 5 && instructions) break;
  }

  return { instructions, providedFiles };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  if (!existsSync(TRACES_DIR)) {
    console.error("No traces directory found. Run extract-traces first.");
    process.exit(1);
  }

  mkdirSync(OUT_DIR, { recursive: true });

  // 1. Build map of instructions from archives (preferred — full files)
  console.log("Scanning archives for instructions.md files...");
  const archiveInstructions = buildArchiveInstructionsMap();
  console.log(`  Found ${archiveInstructions.size} instructions from archives`);

  // 2. Group traces by assignment base, prefer opus
  const traceFiles = readdirSync(TRACES_DIR).filter((f) => f.endsWith(".json"));
  console.log(`Found ${traceFiles.length} trace files`);

  const byAssignment = new Map();
  for (const f of traceFiles) {
    const wsId = f.replace(".json", "");
    const base = getAssignmentBase(wsId);
    const priority = wsId.includes("_opus") ? 0 : wsId.includes("_haiku") ? 2 : 1;
    const existing = byAssignment.get(base);
    if (!existing || priority < existing.priority) {
      byAssignment.set(base, { file: f, priority });
    }
  }

  // 3. Extract each assignment
  let totalFiles = 0;
  let fromArchive = 0;
  let fromTrace = 0;

  for (const [base, { file }] of byAssignment) {
    try {
      const { instructions: traceInstructions, providedFiles } = extractFromTrace(
        join(TRACES_DIR, file)
      );

      // Prefer archive instructions over trace-extracted ones
      const instructions = archiveInstructions.get(base) ?? traceInstructions;

      if (!instructions) {
        console.warn(`  No instructions found for ${base}`);
        continue;
      }

      if (archiveInstructions.has(base)) {
        fromArchive++;
      } else {
        fromTrace++;
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
  console.log(`  ${fromArchive} with archive instructions, ${fromTrace} with trace-extracted instructions`);
}

main();
