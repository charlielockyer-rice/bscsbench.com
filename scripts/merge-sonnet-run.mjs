#!/usr/bin/env node

/**
 * merge-sonnet-run.mjs
 *
 * Replaces the existing Sonnet run in data/results.json with data from the
 * new archive data/archive-20260306-sonnet-run.tar.gz.
 *
 * The new archive's summary.json uses a slightly different schema than the
 * old results.json workspaces. This script adapts:
 *
 *   - llm_grades (dict)  -> also sets llm_grade (singular) for backward compat
 *   - grade.test_results -> also copies to workspace-level test_results with
 *                           old field names (test_name, status, points_earned, etc.)
 *   - run_metadata       -> fills in missing model/agent fields
 *   - courses dict       -> adds comp310 if not already present
 */

import { execSync } from "child_process";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const ROOT = join(import.meta.dirname, "..");
const RESULTS_PATH = join(ROOT, "data", "results.json");
const ARCHIVE_PATH = join(ROOT, "data", "archive-20260306-sonnet-run.tar.gz");
const ARCHIVE_INNER_DIR = "archive-20260306-150742";

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
// 3. Find the existing Sonnet run index
// ---------------------------------------------------------------------------

const sonnetIndex = results.runs.findIndex((r) => {
  const meta = r.run_metadata;
  return meta.model_id === "claude-sonnet-4-6" || meta.model === "sonnet";
});

if (sonnetIndex === -1) {
  console.error("ERROR: Could not find existing Sonnet run in results.json");
  process.exit(1);
}

console.log(`Found existing Sonnet run at index ${sonnetIndex}`);

// ---------------------------------------------------------------------------
// 4. Build the replacement run object
// ---------------------------------------------------------------------------

/**
 * Convert a single new-format test result to the old format used at the
 * workspace level in results.json.
 *
 * New: { name, passed, points, max_points, error, expected, actual }
 * Old: { test_name, status, points_earned, points_possible,
 *         input_description, expected, actual, error_message,
 *         traceback, execution_time_ms }
 */
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

/**
 * Pick the first entry from an llm_grades dict to use as the singular
 * llm_grade for backward compatibility.
 */
function pickFirstLlmGrade(llmGrades) {
  if (!llmGrades) return null;
  const keys = Object.keys(llmGrades);
  if (keys.length === 0) return null;
  return llmGrades[keys[0]];
}

/**
 * Adapt a single workspace from the new summary format to include both
 * old and new fields for full compatibility.
 */
function adaptWorkspace(ws) {
  const adapted = { ...ws };

  // --- llm_grade (singular) for backward compat ---
  if (!adapted.llm_grade) {
    adapted.llm_grade = pickFirstLlmGrade(adapted.llm_grades) || null;
  }

  // Keep llm_grades and code_reviews as-is (new code uses them).
  // Ensure they exist even if empty.
  if (!adapted.llm_grades) adapted.llm_grades = {};
  if (!adapted.code_reviews) adapted.code_reviews = {};

  // --- test_results at workspace level (old format) ---
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

// Use rebuilt_at as fallback for null timestamp
if (!newMeta.timestamp && newMeta.rebuilt_at) {
  newMeta.timestamp = newMeta.rebuilt_at;
}

// Ensure model and agent fields exist
if (!newMeta.model) {
  newMeta.model = "sonnet";
}
if (!newMeta.agent) {
  newMeta.agent = "claude";
}
// total_workspaces
if (newMeta.total_workspaces === undefined) {
  newMeta.total_workspaces = Object.keys(newSummary.workspaces).length;
}

// Build the adapted workspaces dict
const adaptedWorkspaces = {};
for (const [key, ws] of Object.entries(newSummary.workspaces)) {
  adaptedWorkspaces[key] = adaptWorkspace(ws);
}

// Assemble the full replacement run
const newRun = {
  run_metadata: newMeta,
  workspaces: adaptedWorkspaces,
  totals: newSummary.totals,
  by_course: newSummary.by_course,
  scores: newSummary.scores,
};

// ---------------------------------------------------------------------------
// 5. Replace the Sonnet run and update metadata
// ---------------------------------------------------------------------------

results.runs[sonnetIndex] = newRun;
results.lastUpdated = "2026-03-06";

// Add comp310 to courses if not already present (new run includes it)
if (!results.courses.comp310 && newSummary.by_course.comp310) {
  // Derive totalTests from the workspaces
  let totalTests = 0;
  let totalAssignments = 0;
  for (const ws of Object.values(newSummary.workspaces)) {
    if (ws.course === "comp310") {
      totalAssignments++;
      if (ws.grade) totalTests += ws.grade.tests_total;
    }
  }

  results.courses.comp310 = {
    id: "comp310",
    displayName: "COMP 310",
    title: "Advanced Object-Oriented Programming",
    language: "java",
    totalAssignments,
    totalTests,
  };
  console.log(
    `Added comp310 to courses (${totalAssignments} assignments, ${totalTests} tests)`,
  );
}

// ---------------------------------------------------------------------------
// 6. Write results.json back
// ---------------------------------------------------------------------------

writeFileSync(RESULTS_PATH, JSON.stringify(results, null, 2) + "\n");

// Verify
const verify = JSON.parse(readFileSync(RESULTS_PATH, "utf-8"));
const verifyRun = verify.runs[sonnetIndex];
const wsCount = Object.keys(verifyRun.workspaces).length;
const sampleWs = Object.values(verifyRun.workspaces)[0];

console.log(`\nDone. Updated results.json:`);
console.log(`  lastUpdated: ${verify.lastUpdated}`);
console.log(`  runs: ${verify.runs.length}`);
console.log(`  sonnet run workspaces: ${wsCount}`);
console.log(`  sonnet model_id: ${verifyRun.run_metadata.model_id}`);
console.log(`  sonnet timestamp: ${verifyRun.run_metadata.timestamp}`);
console.log(`  sample workspace has llm_grade: ${!!sampleWs.llm_grade}`);
console.log(`  sample workspace has llm_grades: ${!!sampleWs.llm_grades}`);
console.log(
  `  sample workspace test_results count: ${sampleWs.test_results?.length}`,
);
console.log(`  courses: ${Object.keys(verify.courses).join(", ")}`);
console.log(
  `  scores.overall: ${verifyRun.scores.overall}, gpa: ${verifyRun.scores.gpa}`,
);

// Sanity: all other runs are still intact
for (let i = 0; i < verify.runs.length; i++) {
  if (i === sonnetIndex) continue;
  const r = verify.runs[i];
  console.log(
    `  run[${i}] (${r.run_metadata.model}/${r.run_metadata.model_id}): ${Object.keys(r.workspaces).length} workspaces — OK`,
  );
}
