#!/usr/bin/env node

/**
 * merge-haiku-run.mjs
 *
 * Replaces the existing Haiku run in data/results.json with data from the
 * new archive data/archive-20260309-claude-haiku-4-5.tar.gz.
 *
 * Adapts the new summary.json schema to match the old results.json format
 * (same approach as merge-sonnet-run.mjs).
 */

import { execSync } from "child_process";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const ROOT = join(import.meta.dirname, "..");
const RESULTS_PATH = join(ROOT, "data", "results.json");
const ARCHIVE_PATH = join(ROOT, "data", "archive-20260309-claude-haiku-4-5.tar.gz");
const ARCHIVE_INNER_DIR = "archive-20260309-claude-haiku-4-5";

// ---------------------------------------------------------------------------
// 1. Read existing results.json
// ---------------------------------------------------------------------------

const results = JSON.parse(readFileSync(RESULTS_PATH, "utf-8"));
console.log(`Loaded results.json — ${results.runs.length} runs`);

// ---------------------------------------------------------------------------
// 2. Extract summary.json from the archive
// ---------------------------------------------------------------------------

const summaryRaw = execSync(
  `tar -xzf "${ARCHIVE_PATH}" -O "${ARCHIVE_INNER_DIR}/summary.json"`,
  { maxBuffer: 200 * 1024 * 1024 },
).toString();

const newSummary = JSON.parse(summaryRaw);
console.log(
  `Extracted summary.json — ${Object.keys(newSummary.workspaces).length} workspaces`,
);

// ---------------------------------------------------------------------------
// 3. Find the existing Haiku run index
// ---------------------------------------------------------------------------

const haikuIndex = results.runs.findIndex((r) => {
  const meta = r.run_metadata;
  return meta.model_id === "claude-haiku-4-5-20251001" || meta.model === "haiku";
});

if (haikuIndex === -1) {
  console.error("ERROR: Could not find existing Haiku run in results.json");
  process.exit(1);
}

console.log(`Found existing Haiku run at index ${haikuIndex}`);

// ---------------------------------------------------------------------------
// 4. Build the replacement run object
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

  // llm_grade (singular) for backward compat
  if (!adapted.llm_grade) {
    adapted.llm_grade = pickFirstLlmGrade(adapted.llm_grades) || null;
  }

  if (!adapted.llm_grades) adapted.llm_grades = {};
  if (!adapted.code_reviews) adapted.code_reviews = {};

  // test_results at workspace level (old format)
  const gradeTestResults = adapted.grade?.test_results;
  if (Array.isArray(gradeTestResults) && gradeTestResults.length > 0) {
    adapted.test_results = gradeTestResults.map(convertTestResult);
  } else {
    adapted.test_results = [];
  }

  return adapted;
}

// Build run_metadata with all required fields
const newMeta = { ...newSummary.run_metadata };

if (!newMeta.timestamp && newMeta.rebuilt_at) {
  newMeta.timestamp = newMeta.rebuilt_at;
}

// Normalize model_id to dashes (archive uses "claude-haiku-4.5-20251001")
newMeta.model_id = "claude-haiku-4-5-20251001";

if (!newMeta.model) {
  newMeta.model = "haiku";
}
if (!newMeta.agent) {
  newMeta.agent = "claude";
}
if (newMeta.total_workspaces === undefined) {
  newMeta.total_workspaces = Object.keys(newSummary.workspaces).length;
}

// Build adapted workspaces
const adaptedWorkspaces = {};
for (const [key, ws] of Object.entries(newSummary.workspaces)) {
  adaptedWorkspaces[key] = adaptWorkspace(ws);
}

const newRun = {
  run_metadata: newMeta,
  workspaces: adaptedWorkspaces,
  totals: newSummary.totals,
  by_course: newSummary.by_course,
  scores: newSummary.scores,
};

// ---------------------------------------------------------------------------
// 5. Replace the Haiku run and update metadata
// ---------------------------------------------------------------------------

results.runs[haikuIndex] = newRun;
results.lastUpdated = "2026-03-09";

// ---------------------------------------------------------------------------
// 6. Write results.json back
// ---------------------------------------------------------------------------

writeFileSync(RESULTS_PATH, JSON.stringify(results, null, 2) + "\n");

// Verify
const verify = JSON.parse(readFileSync(RESULTS_PATH, "utf-8"));
const verifyRun = verify.runs[haikuIndex];
const wsCount = Object.keys(verifyRun.workspaces).length;
const sampleWs = Object.values(verifyRun.workspaces)[0];

console.log(`\nDone. Updated results.json:`);
console.log(`  lastUpdated: ${verify.lastUpdated}`);
console.log(`  runs: ${verify.runs.length}`);
console.log(`  haiku run workspaces: ${wsCount}`);
console.log(`  haiku model_id: ${verifyRun.run_metadata.model_id}`);
console.log(`  haiku timestamp: ${verifyRun.run_metadata.timestamp}`);
console.log(`  sample workspace has llm_grade: ${Boolean(sampleWs.llm_grade)}`);
console.log(`  sample workspace has llm_grades: ${Boolean(sampleWs.llm_grades)}`);
console.log(
  `  sample workspace test_results count: ${sampleWs.test_results?.length}`,
);
console.log(`  courses: ${Object.keys(verify.courses).join(", ")}`);
console.log(
  `  scores.overall: ${verifyRun.scores.overall}, gpa: ${verifyRun.scores.gpa}`,
);

// Sanity: all other runs are still intact
for (let i = 0; i < verify.runs.length; i++) {
  if (i === haikuIndex) continue;
  const r = verify.runs[i];
  console.log(
    `  run[${i}] (${r.run_metadata.model}/${r.run_metadata.model_id}): ${Object.keys(r.workspaces).length} workspaces — OK`,
  );
}
