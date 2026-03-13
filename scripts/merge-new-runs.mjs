#!/usr/bin/env node

/**
 * merge-new-runs.mjs
 *
 * Adds two new model runs to data/results.json:
 *   - GPT 5.4 from archive-20260312-gpt-5-4.tar.gz
 *   - Gemini 3 Flash Preview from archive-20260312-gemini-3-flash-preview.tar.gz
 *
 * These are additions (not replacements) — existing runs are untouched.
 */

import { execSync } from "child_process";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const ROOT = join(import.meta.dirname, "..");
const RESULTS_PATH = join(ROOT, "data", "results.json");

const NEW_RUNS = [
  {
    archivePath: join(ROOT, "data", "archive-20260312-gpt-5-4.tar.gz"),
    innerDir: "archive-20260312-gpt-5-4",
    modelId: "gpt-5.4",
    model: "gpt-5.4",
    agent: "codex",
  },
  {
    archivePath: join(ROOT, "data", "archive-20260312-gemini-3-flash-preview.tar.gz"),
    innerDir: "archive-20260312-gemini-3-flash-preview",
    modelId: "gemini-3-flash-preview",
    model: "gemini-3-flash-preview",
    agent: "gemini",
  },
];

// ---------------------------------------------------------------------------
// Helpers (same as merge-haiku-run.mjs)
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

for (const run of NEW_RUNS) {
  // Check this model isn't already in results.json
  const exists = results.runs.some(
    (r) => r.run_metadata.model_id === run.modelId
  );
  if (exists) {
    console.log(`Skipping ${run.modelId} — already in results.json`);
    continue;
  }

  // Extract summary.json
  const summaryRaw = execSync(
    `tar -xzf "${run.archivePath}" -O "${run.innerDir}/summary.json"`,
    { maxBuffer: 200 * 1024 * 1024 }
  ).toString();

  const summary = JSON.parse(summaryRaw);
  console.log(
    `Extracted ${run.modelId} summary.json — ${Object.keys(summary.workspaces).length} workspaces`
  );

  // Build run_metadata
  const meta = { ...summary.run_metadata };
  if (!meta.timestamp && meta.rebuilt_at) {
    meta.timestamp = meta.rebuilt_at;
  }
  meta.model_id = run.modelId;
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

  results.runs.push(newRun);
  console.log(`Added ${run.modelId} run (${Object.keys(adaptedWorkspaces).length} workspaces)`);
}

results.lastUpdated = "2026-03-12";

// ---------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------

writeFileSync(RESULTS_PATH, JSON.stringify(results, null, 2) + "\n");

// Verify
const verify = JSON.parse(readFileSync(RESULTS_PATH, "utf-8"));
console.log(`\nDone. Updated results.json:`);
console.log(`  lastUpdated: ${verify.lastUpdated}`);
console.log(`  runs: ${verify.runs.length}`);

for (let i = 0; i < verify.runs.length; i++) {
  const r = verify.runs[i];
  const wsCount = Object.keys(r.workspaces).length;
  console.log(
    `  run[${i}] ${r.run_metadata.model_id}: ${wsCount} workspaces, overall=${r.scores.overall}, gpa=${r.scores.gpa}`
  );
}
