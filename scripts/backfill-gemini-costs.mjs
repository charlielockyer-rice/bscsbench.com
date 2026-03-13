#!/usr/bin/env node

/**
 * backfill-costs.mjs
 *
 * Backfills cost_usd for runs that have token counts but zero costs.
 * Uses standard API pricing (per 1M tokens):
 *
 *   gemini-3-flash-preview:  $0.50 input,  $3.00 output
 *   gpt-5.3-codex:           $1.75 input, $14.00 output
 *   gpt-5.4:                 $2.50 input, $15.00 output
 */

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const ROOT = join(import.meta.dirname, "..");
const RESULTS_PATH = join(ROOT, "data", "results.json");

const PRICING = {
  "gemini-3-flash-preview": { input: 0.50, output: 3.00 },
  "gpt-5.3-codex":          { input: 1.75, output: 14.00 },
  "gpt-5.4":                { input: 2.50, output: 15.00 },
};

const results = JSON.parse(readFileSync(RESULTS_PATH, "utf-8"));

for (const [modelId, rates] of Object.entries(PRICING)) {
  const runIdx = results.runs.findIndex(
    (r) => r.run_metadata.model_id === modelId
  );
  if (runIdx === -1) {
    console.log(`Skipping ${modelId} — not found`);
    continue;
  }

  const run = results.runs[runIdx];
  const inputRate = rates.input / 1_000_000;
  const outputRate = rates.output / 1_000_000;
  let totalCost = 0;

  for (const ws of Object.values(run.workspaces)) {
    const cost = Math.round((ws.input_tokens * inputRate + ws.output_tokens * outputRate) * 1e6) / 1e6;
    ws.cost_usd = cost;
    totalCost += cost;
  }

  run.totals.cost_usd = Math.round(totalCost * 1e6) / 1e6;

  for (const [courseId, courseTotals] of Object.entries(run.by_course)) {
    let courseCost = 0;
    for (const ws of Object.values(run.workspaces)) {
      if (ws.course === courseId) courseCost += ws.cost_usd;
    }
    courseTotals.cost_usd = Math.round(courseCost * 1e6) / 1e6;
  }

  console.log(`${modelId}: $${totalCost.toFixed(2)} (${Object.keys(run.workspaces).length} workspaces)`);
}

writeFileSync(RESULTS_PATH, JSON.stringify(results, null, 2) + "\n");
console.log("Done.")
