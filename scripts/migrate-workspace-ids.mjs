#!/usr/bin/env node

/**
 * Migrates workspace IDs in results.json to use module/hw prefixes,
 * matching the Codex archive naming convention.
 * Also adds the Codex run from the archive's summary.json.
 */

import { readFileSync, writeFileSync, renameSync, existsSync } from "fs";
import { join, basename } from "path";
import { execSync } from "child_process";
import { readdirSync } from "fs";

const ROOT = join(import.meta.dirname, "..");
const DATA_DIR = join(ROOT, "data");
const RESULTS_PATH = join(DATA_DIR, "results.json");

// Rename mappings: old suffix → new suffix (within workspace ID)
const COMP140_MAP = {
  comp140_circles: "comp140_module1_circles",
  comp140_spot_it: "comp140_module2_spot_it",
  comp140_stock_prediction: "comp140_module3_stock_prediction",
  comp140_kevin_bacon: "comp140_module4_kevin_bacon",
  comp140_qr_code: "comp140_module5_qr_code",
  comp140_sports_analytics: "comp140_module6_sports_analytics",
  comp140_map_search: "comp140_module7_map_search",
};

const COMP321_MAP = {
  comp321_factors: "comp321_hw1_factors",
  comp321_count: "comp321_hw2_count",
  comp321_linking: "comp321_hw3_linking",
  comp321_shell: "comp321_hw4_shell",
  comp321_malloc: "comp321_hw5_malloc",
  comp321_proxy: "comp321_hw6_proxy",
};

const ALL_MAPS = { ...COMP140_MAP, ...COMP321_MAP };

function renameWorkspaceId(wsId) {
  for (const [oldPrefix, newPrefix] of Object.entries(ALL_MAPS)) {
    if (wsId.startsWith(oldPrefix + "_") || wsId === oldPrefix) {
      return newPrefix + wsId.slice(oldPrefix.length);
    }
  }
  return wsId;
}

function migrateRun(run) {
  // Rename workspaces
  const newWorkspaces = {};
  for (const [oldId, ws] of Object.entries(run.workspaces)) {
    const newId = renameWorkspaceId(oldId);
    ws.id = newId;
    newWorkspaces[newId] = ws;
  }
  run.workspaces = newWorkspaces;

  // Rename scores.assignments
  if (run.scores?.assignments) {
    const newAssignments = {};
    for (const [oldId, score] of Object.entries(run.scores.assignments)) {
      const newId = renameWorkspaceId(oldId);
      newAssignments[newId] = score;
    }
    run.scores.assignments = newAssignments;
  }

  return run;
}

function renamePublicFiles() {
  const dirs = ["traces", "solutions", "agent-meta"];

  for (const dir of dirs) {
    const dirPath = join(ROOT, "public", dir);
    if (!existsSync(dirPath)) continue;

    const files = readdirSync(dirPath).filter((f) => f.endsWith(".json"));
    for (const file of files) {
      const wsId = file.replace(".json", "");
      const newId = renameWorkspaceId(wsId);
      if (newId !== wsId) {
        const oldPath = join(dirPath, file);
        const newPath = join(dirPath, `${newId}.json`);
        renameSync(oldPath, newPath);
        console.log(`  ${dir}: ${wsId} → ${newId}`);
      }
    }
  }

  // Rename assignment base files (no model suffix)
  const assignmentsDir = join(ROOT, "public", "assignments");
  if (existsSync(assignmentsDir)) {
    const files = readdirSync(assignmentsDir).filter((f) => f.endsWith(".json"));
    for (const file of files) {
      const base = file.replace(".json", "");
      const newBase = renameWorkspaceId(base);
      if (newBase !== base) {
        renameSync(
          join(assignmentsDir, file),
          join(assignmentsDir, `${newBase}.json`)
        );
        console.log(`  assignments: ${base} → ${newBase}`);
      }
    }
  }
}

function loadCodexRun() {
  const archivePath = join(DATA_DIR, "final-codex.tar.gz");
  if (!existsSync(archivePath)) {
    console.error("No final-codex.tar.gz found");
    return null;
  }

  // Find the summary.json path
  const listing = execSync(`tar -tzf "${archivePath}" | grep 'summary\\.json$'`, {
    encoding: "utf-8",
  }).trim();

  const raw = execSync(
    `tar -xzf "${archivePath}" --to-stdout "${listing}"`,
    { encoding: "utf-8", maxBuffer: 50 * 1024 * 1024 }
  );

  const summary = JSON.parse(raw);

  // Inject model_id
  // Must match the key in src/lib/data.ts:MODEL_REGISTRY
  summary.run_metadata.model_id = "gpt-5.3-codex";

  return summary;
}

function main() {
  console.log("Loading results.json...");
  const results = JSON.parse(readFileSync(RESULTS_PATH, "utf-8"));

  console.log("Migrating workspace IDs in existing runs...");
  for (const run of results.runs) {
    const modelId = run.run_metadata.model_id;
    console.log(`  Migrating ${modelId}...`);
    migrateRun(run);
  }

  console.log("Renaming public/ files...");
  renamePublicFiles();

  console.log("Loading Codex run from archive...");
  const codexRun = loadCodexRun();
  if (codexRun) {
    results.runs.push(codexRun);
    console.log(
      `  Added Codex run: ${Object.keys(codexRun.workspaces).length} workspaces`
    );
  }

  console.log("Writing results.json...");
  writeFileSync(RESULTS_PATH, JSON.stringify(results, null, 2));
  console.log("Done!");
}

main();
