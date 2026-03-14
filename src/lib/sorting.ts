import type {
  BenchmarkEntry,
  RankingMetric,
  ScoreDimension,
  SortDirection,
} from "./types";
import { getOverallDimensionScore } from "./scoring";

function getMetricValue(
  entry: BenchmarkEntry,
  metric: RankingMetric,
  dimension: ScoreDimension = "overall"
): number | null {
  switch (metric) {
    case "overall":
      return getOverallDimensionScore(entry, dimension);
    case "gpa":
      return entry.scores.gpa;
    case "passRate":
      return entry.totals.testsTotal > 0
        ? (entry.totals.testsPassed / entry.totals.testsTotal) * 100
        : 0;
    case "totalTime":
      return entry.totals.durationMs;
    case "costEfficiency":
      return entry.totals.costUsd > 0
        ? entry.scores.overall / entry.totals.costUsd
        : 0;
    case "speed":
      return entry.totals.durationMs > 0
        ? entry.scores.overall / (entry.totals.durationMs / 1000)
        : 0;
  }
}

export function sortEntries(
  entries: BenchmarkEntry[],
  metric: RankingMetric,
  direction: SortDirection = "desc",
  dimension: ScoreDimension = "overall"
): BenchmarkEntry[] {
  return [...entries].sort((a, b) => {
    const aVal = getMetricValue(a, metric, dimension);
    const bVal = getMetricValue(b, metric, dimension);
    // Null values sort to the bottom regardless of direction
    if (aVal === null && bVal === null) return 0;
    if (aVal === null) return 1;
    if (bVal === null) return -1;
    return direction === "desc" ? bVal - aVal : aVal - bVal;
  });
}

export function filterByTags(
  entries: BenchmarkEntry[],
  tags: string[]
): BenchmarkEntry[] {
  if (tags.length === 0) return entries;
  return entries.filter((entry) =>
    tags.some((tag) => entry.tags.includes(tag))
  );
}

export function filterBySearch(
  entries: BenchmarkEntry[],
  query: string
): BenchmarkEntry[] {
  if (!query.trim()) return entries;
  const lower = query.toLowerCase();
  return entries.filter(
    (entry) =>
      entry.model.name.toLowerCase().includes(lower) ||
      entry.model.provider.toLowerCase().includes(lower) ||
      entry.model.id.toLowerCase().includes(lower)
  );
}

export function filterByCourses(
  entries: BenchmarkEntry[],
  courseIds: string[]
): BenchmarkEntry[] {
  if (courseIds.length === 0) return entries;
  return entries.map((entry) => {
    const filteredCourses = Object.fromEntries(
      Object.entries(entry.courses).filter(([id]) => courseIds.includes(id))
    );
    const courseValues = Object.values(filteredCourses);
    const testsPassed = courseValues.reduce((s, c) => s + c.testsPassed, 0);
    const testsTotal = courseValues.reduce((s, c) => s + c.testsTotal, 0);
    const totalCost = courseValues.reduce((s, c) => s + c.totalCost, 0);
    const durationMs = courseValues.reduce(
      (s, c) => s + c.totalTimeSeconds * 1000,
      0
    );
    const assignmentsSolved = courseValues.reduce(
      (s, c) => c.assignments.filter((a) => a.score >= 100).length + s,
      0
    );
    const assignmentsTotal = courseValues.reduce(
      (s, c) => c.assignments.length + s,
      0
    );
    // Recalculate overall as average of filtered course grades
    const overall =
      courseValues.length > 0
        ? courseValues.reduce((s, c) => s + c.grade, 0) / courseValues.length
        : 0;

    return {
      ...entry,
      scores: { ...entry.scores, overall },
      totals: {
        ...entry.totals,
        testsPassed,
        testsTotal,
        costUsd: totalCost,
        durationMs,
      },
      assignmentsSolved,
      assignmentsTotal,
      courses: filteredCourses,
    };
  });
}

export function getAllTags(entries: BenchmarkEntry[]): string[] {
  const tags = new Set<string>();
  for (const entry of entries) {
    for (const tag of entry.tags) {
      tags.add(tag);
    }
  }
  return Array.from(tags).sort();
}
