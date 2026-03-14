#!/usr/bin/env node

/**
 * backfill-score-dimensions.mjs
 *
 * Computes code_pct, written_pct, review_pct for each workspace in
 * scores.assignments and recalculates pct as code-first.
 *
 * code_pct:    performance_index if present, else score_percentage from
 *              grade (null if no tests)
 * written_pct: average score_percentage across graded llm_grades (null if none)
 * review_pct:  average score_percentage across graded code_reviews (null if none)
 * pct:         code_pct ?? written_pct ?? 0
 */

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const ROOT = join(import.meta.dirname, "..");
const RESULTS_PATH = join(ROOT, "data", "results.json");

const results = JSON.parse(readFileSync(RESULTS_PATH, "utf-8"));

for (const run of results.runs) {
  const modelId = run.run_metadata.model_id;
  let changed = 0;

  for (const [wsId, ws] of Object.entries(run.workspaces)) {
    const grade = ws.grade || {};
    const llmGrades = ws.llm_grades || {};
    const codeReviews = ws.code_reviews || {};

    // code_pct: performance_index > score_percentage > null
    let codePct = null;
    if (grade.tests_total > 0) {
      codePct = grade.performance_index ?? grade.score_percentage ?? null;
    }

    // written_pct: average of graded llm_grades
    const gradedLlm = Object.values(llmGrades)
      .filter((g) => g.status === "graded" && g.score_percentage != null);
    let writtenPct = null;
    if (gradedLlm.length > 0) {
      writtenPct =
        gradedLlm.reduce((s, g) => s + g.score_percentage, 0) /
        gradedLlm.length;
    }

    // review_pct: average of graded code_reviews
    const gradedReviews = Object.values(codeReviews)
      .filter((r) => r.status === "graded" && r.score_percentage != null);
    let reviewPct = null;
    if (gradedReviews.length > 0) {
      reviewPct =
        gradedReviews.reduce((s, r) => s + r.score_percentage, 0) /
        gradedReviews.length;
    }

    // pct: code-first, fallback to written
    const pct = codePct ?? writtenPct ?? 0;

    // Round to 2 decimal places
    const round = (v) => (v !== null ? Math.round(v * 100) / 100 : null);

    if (!run.scores.assignments[wsId]) {
      run.scores.assignments[wsId] = { pct: 0, weight: 1 };
    }

    const entry = run.scores.assignments[wsId];
    const oldPct = entry.pct;

    // Only recompute pct if we have data to recompute from.
    // If we can't recompute (no code or written data in workspace),
    // preserve the harness-computed pct (which may have been computed
    // at archive time from data not stored in the workspace).
    if (codePct !== null || writtenPct !== null) {
      entry.pct = round(pct);
    }
    // else: keep entry.pct as-is (harness-computed)

    entry.code_pct = round(codePct);
    entry.written_pct = round(writtenPct);
    entry.review_pct = round(reviewPct);
    changed++;
  }

  // Recalculate course-level scores (weighted average, skip weight=0)
  for (const [courseId, courseScore] of Object.entries(run.scores.courses)) {
    const courseWs = Object.entries(run.workspaces)
      .filter(([, ws]) => ws.course === courseId);
    let totalWeight = 0, totalScore = 0;
    for (const [wsId] of courseWs) {
      const entry = run.scores.assignments[wsId];
      if (!entry || entry.weight === 0) continue;
      const w = entry.weight ?? 1;
      totalWeight += w;
      totalScore += (entry.pct ?? 0) * w;
    }
    const avg = totalWeight > 0
      ? Math.round(totalScore / totalWeight * 100) / 100
      : 0;
    courseScore.overall = avg;
    courseScore.grade = avg;
  }

  // Recalculate overall score (average of course overalls)
  const courseOveralls = Object.values(run.scores.courses)
    .map((c) => c.overall)
    .filter((o) => o != null);
  if (courseOveralls.length > 0) {
    run.scores.overall = Math.round(
      courseOveralls.reduce((s, o) => s + o, 0) / courseOveralls.length * 100
    ) / 100;
  }

  console.log(`${modelId}: backfilled ${changed} workspaces, overall=${run.scores.overall}%`);
}

writeFileSync(RESULTS_PATH, JSON.stringify(results, null, 2) + "\n");
console.log("Done.");
