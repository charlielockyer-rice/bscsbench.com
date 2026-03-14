import type {
  AssignmentResult,
  CourseResult,
  BenchmarkEntry,
  ScoreDimension,
} from "./types";

export function getAssignmentDimensionScore(
  a: AssignmentResult,
  dim: ScoreDimension
): number | null {
  switch (dim) {
    case "overall":
      return a.score;
    case "code":
      return a.codePct;
    case "written":
      return a.writtenPct;
    case "review":
      return a.reviewPct;
  }
}

export function getCourseDimensionGrade(
  course: CourseResult,
  dim: ScoreDimension
): number | null {
  if (dim === "overall") return course.grade;
  const assignments = course.assignments.filter(
    (a) => a.weight > 0 && getAssignmentDimensionScore(a, dim) !== null
  );
  if (assignments.length === 0) return null;
  let totalWeight = 0;
  let totalScore = 0;
  for (const a of assignments) {
    const s = getAssignmentDimensionScore(a, dim)!;
    totalWeight += a.weight;
    totalScore += s * a.weight;
  }
  return totalWeight > 0 ? totalScore / totalWeight : null;
}

export function getOverallDimensionScore(
  entry: BenchmarkEntry,
  dim: ScoreDimension
): number | null {
  if (dim === "overall") return entry.scores.overall;
  const grades = Object.values(entry.courses)
    .map((c) => getCourseDimensionGrade(c, dim))
    .filter((g): g is number => g !== null);
  if (grades.length === 0) return null;
  return grades.reduce((s, g) => s + g, 0) / grades.length;
}
