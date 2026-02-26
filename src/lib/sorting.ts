import type { BenchmarkEntry, RankingMetric, SortDirection } from "./types";

function getMetricValue(entry: BenchmarkEntry, metric: RankingMetric): number {
  switch (metric) {
    case "overall":
      return entry.overall.passRate;
    case "passRate":
      return entry.overall.testsPassed / entry.overall.testsTotal;
    case "solved":
      return entry.overall.assignmentsSolved;
    case "costEfficiency":
      return entry.overall.totalCost > 0
        ? entry.overall.passRate / entry.overall.totalCost
        : 0;
    case "speed":
      return entry.overall.totalTimeSeconds > 0
        ? entry.overall.passRate / entry.overall.totalTimeSeconds
        : 0;
  }
}

export function sortEntries(
  entries: BenchmarkEntry[],
  metric: RankingMetric,
  direction: SortDirection = "desc"
): BenchmarkEntry[] {
  return [...entries].sort((a, b) => {
    const aVal = getMetricValue(a, metric);
    const bVal = getMetricValue(b, metric);
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
    const passRate =
      courseValues.length > 0
        ? courseValues.reduce((sum, c) => sum + c.passRate, 0) /
          courseValues.length
        : 0;
    const testsPassed = courseValues.reduce((s, c) => s + c.testsPassed, 0);
    const testsTotal = courseValues.reduce((s, c) => s + c.testsTotal, 0);
    const totalCost = courseValues.reduce((s, c) => s + c.totalCost, 0);
    const totalTimeSeconds = courseValues.reduce(
      (s, c) => s + c.totalTimeSeconds,
      0
    );
    const totalTokens = courseValues.reduce((s, c) => s + c.totalTokens, 0);
    const assignmentsSolved = courseValues.reduce(
      (s, c) => c.assignments.filter((a) => a.solved).length + s,
      0
    );
    const assignmentsTotal = courseValues.reduce(
      (s, c) => c.assignments.length + s,
      0
    );

    return {
      ...entry,
      overall: {
        ...entry.overall,
        passRate,
        testsPassed,
        testsTotal,
        totalCost,
        totalTimeSeconds,
        totalTokens,
        assignmentsSolved,
        assignmentsTotal,
      },
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
