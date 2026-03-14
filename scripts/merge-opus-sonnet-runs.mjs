#!/usr/bin/env node

/**
 * merge-opus-sonnet-runs.mjs
 *
 * Replaces the existing Opus and Sonnet runs in data/results.json with
 * new runs from the 2026-03-13 archives.
 */

import { execSync } from "child_process";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const ROOT = join(import.meta.dirname, "..");
const RESULTS_PATH = join(ROOT, "data", "results.json");

const RUNS = [
  {
    archivePath: join(ROOT, "data", "archive-20260313-claude-opus-4-6.tar.gz"),
    innerDir: "archive-20260313-claude-opus-4-6",
    modelId: "claude-opus-4-6",       // normalize dots to hyphens
    model: "opus",
    agent: "claude",
    matchModelId: "claude-opus-4-6",  // existing run to replace
  },
  {
    archivePath: join(ROOT, "data", "archive-20260313-claude-sonnet-4-6.tar.gz"),
    innerDir: "archive-20260313-claude-sonnet-4-6",
    modelId: "claude-sonnet-4-6",
    model: "sonnet",
    agent: "claude",
    matchModelId: "claude-sonnet-4-6",
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function convertTestResult(tr) {
  return {
    test_name: tr.name,
    status: tr.passed ? "pass" : "fail",
    points_earned: tr.points,
    points_possible: tr.max_points,
    input_description: null,
    expected: tr.expected || null,
    actual: tr.actual || null,
    error_message: tr.error || null,
    traceback: null,
    execution_time_ms: null,
  };
}

function pickFirstLlmGrade(llmGrades) {
  if (!llmGrades) return null;
  const keys = Object.keys(llmGrades);
  if (keys.length === 0) return null;
  return llmGrades[keys[0]];
}

function adaptWorkspace(ws) {
  const adapted = { ...ws };

  if (!adapted.llm_grade) {
    adapted.llm_grade = pickFirstLlmGrade(adapted.llm_grades) || null;
  }

  if (!adapted.llm_grades) adapted.llm_grades = {};
  if (!adapted.code_reviews) adapted.code_reviews = {};

  const gradeTestResults = adapted.grade?.test_results;
  if (Array.isArray(gradeTestResults) && gradeTestResults.length > 0) {
    adapted.test_results = gradeTestResults.map(convertTestResult);
  } else {
    adapted.test_results = [];
  }

  return adapted;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const results = JSON.parse(readFileSync(RESULTS_PATH, "utf-8"));
console.log(`Loaded results.json — ${results.runs.length} runs`);

for (const run of RUNS) {
  // Extract summary.json
  const summaryRaw = execSync(
    `tar -xzf "${run.archivePath}" -O "${run.innerDir}/summary.json"`,
    { maxBuffer: 200 * 1024 * 1024 }
  ).toString();

  const summary = JSON.parse(summaryRaw);
  console.log(
    `\nExtracted ${run.modelId} summary.json — ${Object.keys(summary.workspaces).length} workspaces`
  );

  // Build run_metadata
  const meta = { ...summary.run_metadata };
  if (!meta.timestamp && meta.rebuilt_at) {
    meta.timestamp = meta.rebuilt_at;
  }
  meta.model_id = run.modelId; // normalize to hyphen format
  if (!meta.model) meta.model = run.model;
  if (!meta.agent) meta.agent = run.agent;
  if (meta.total_workspaces === undefined) {
    meta.total_workspaces = Object.keys(summary.workspaces).length;
  }

  // Build adapted workspaces
  const adaptedWorkspaces = {};
  for (const [key, ws] of Object.entries(summary.workspaces)) {
    adaptedWorkspaces[key] = adaptWorkspace(ws);
  }

  const newRun = {
    run_metadata: meta,
    workspaces: adaptedWorkspaces,
    totals: summary.totals,
    by_course: summary.by_course,
    scores: summary.scores,
  };

  // Find and replace existing run
  const existingIdx = results.runs.findIndex(
    (r) => r.run_metadata.model_id === run.matchModelId
  );

  if (existingIdx !== -1) {
    const old = results.runs[existingIdx];
    console.log(`Replacing run[${existingIdx}] (${old.scores.overall}% / ${old.scores.gpa} GPA, ${Object.keys(old.workspaces).length} ws)`);
    console.log(`     with new (${newRun.scores.overall}% / ${newRun.scores.gpa} GPA, ${Object.keys(newRun.workspaces).length} ws)`);
    results.runs[existingIdx] = newRun;
  } else {
    console.log(`No existing run found for ${run.matchModelId} — appending`);
    results.runs.push(newRun);
  }
}

results.lastUpdated = "2026-03-13";

// ---------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------

writeFileSync(RESULTS_PATH, JSON.stringify(results, null, 2) + "\n");

const verify = JSON.parse(readFileSync(RESULTS_PATH, "utf-8"));
console.log(`\nDone. Updated results.json:`);
console.log(`  lastUpdated: ${verify.lastUpdated}`);
console.log(`  runs: ${verify.runs.length}`);

for (let i = 0; i < verify.runs.length; i++) {
  const r = verify.runs[i];
  const wsCount = Object.keys(r.workspaces).length;
  console.log(
    `  run[${i}] ${r.run_metadata.model_id}: ${wsCount} ws, ${r.scores.overall}%, ${r.scores.gpa} GPA, $${r.totals.cost_usd}`
  );
}
