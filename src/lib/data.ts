import type {
  ArchiveRun,
  ArchiveWorkspace,
  ArchiveLlmGrade,
  ArchiveTestResultOld,
  ArchiveTestResultNew,
  BenchmarkData,
  BenchmarkEntry,
  CourseResult,
  AssignmentResult,
  ModelInfo,
  ResultsFile,
  TestResult,
  LlmGradeEntry,
} from "./types";
import rawData from "../../data/results.json";

const MODEL_REGISTRY: Record<
  string,
  Omit<ModelInfo, "id"> & { tags: string[] }
> = {
  "claude-opus-4-6": {
    name: "Claude Opus 4.6",
    provider: "Anthropic",
    logo: "/logos/claude.svg",
    tags: ["closed-source"],
  },
  "claude-sonnet-4-6": {
    name: "Claude Sonnet 4.6",
    provider: "Anthropic",
    logo: "/logos/claude.svg",
    tags: ["closed-source"],
  },
  "claude-haiku-4-5-20251001": {
    name: "Claude Haiku 4.5",
    provider: "Anthropic",
    logo: "/logos/claude.svg",
    tags: ["closed-source"],
  },
  "gpt-5.3-codex": {
    name: "GPT-5.3 Codex",
    provider: "OpenAI",
    logo: "/logos/openai.png",
    tags: ["closed-source"],
  },
  "gpt-5.4": {
    name: "GPT-5.4",
    provider: "OpenAI",
    logo: "/logos/openai.png",
    tags: ["closed-source"],
  },
  "gemini-3-flash": {
    name: "Gemini 3 Flash",
    provider: "Google",
    logo: "/logos/google.png",
    tags: ["closed-source"],
  },
  "gemini-3-flash-preview": {
    name: "Gemini 3 Flash",
    provider: "Google",
    logo: "/logos/google.png",
    tags: ["closed-source"],
  },
  "qwen3-coder": {
    name: "Qwen3 Coder",
    provider: "Qwen",
    logo: "/logos/qwen.png",
    tags: ["open-source"],
  },
  "kimi-k2.5": {
    name: "Kimi K2.5",
    provider: "Moonshot",
    logo: "/logos/moonshot.png",
    tags: ["closed-source"],
  },
};

function getModelInfo(modelId: string): ModelInfo & { tags: string[] } {
  const info = MODEL_REGISTRY[modelId];
  if (info) return { id: modelId, ...info };
  return { id: modelId, name: modelId, provider: "Unknown", tags: [] };
}

function groupWorkspacesByCourse(
  workspaces: Record<string, ArchiveWorkspace>
): Record<string, ArchiveWorkspace[]> {
  const groups: Record<string, ArchiveWorkspace[]> = {};
  for (const ws of Object.values(workspaces)) {
    if (!groups[ws.course]) groups[ws.course] = [];
    groups[ws.course].push(ws);
  }
  for (const list of Object.values(groups)) {
    list.sort((a, b) => a.assignment_number - b.assignment_number);
  }
  return groups;
}

/**
 * Convert old-format test results (at workspace level) to the display TestResult type.
 */
function transformOldTestResults(results: ArchiveTestResultOld[]): TestResult[] {
  return results.map((t) => ({
    name: t.test_name,
    status: t.status,
    pointsEarned: t.points_earned,
    pointsPossible: t.points_possible,
    inputDescription: t.input_description,
    expected: t.expected,
    actual: t.actual,
    errorMessage: t.error_message,
    traceback: t.traceback,
    executionTimeMs: t.execution_time_ms,
  }));
}

/**
 * Convert new-format test results (nested inside grade) to the display TestResult type.
 * The new format uses different field names: name/passed/points/max_points vs
 * test_name/status/points_earned/points_possible.
 */
function transformNewTestResults(results: ArchiveTestResultNew[]): TestResult[] {
  return results.map((t) => ({
    name: t.name,
    status: t.passed ? "pass" : "fail",
    pointsEarned: t.points,
    pointsPossible: t.max_points,
    inputDescription: null,
    expected: t.expected || null,
    actual: t.actual || null,
    errorMessage: t.error,
    traceback: null,
    executionTimeMs: 0,
  }));
}

/**
 * Extract test results from a workspace, handling both old and new formats.
 * Old format: ws.test_results (array at workspace level)
 * New format: ws.grade.test_results (array nested inside grade object)
 */
function extractTestResults(ws: ArchiveWorkspace): TestResult[] | undefined {
  // Old format: test_results at workspace level
  if (ws.test_results && ws.test_results.length > 0) {
    return transformOldTestResults(ws.test_results);
  }
  // New format: test_results nested inside grade
  if (ws.grade?.test_results && ws.grade.test_results.length > 0) {
    return transformNewTestResults(ws.grade.test_results);
  }
  return undefined;
}

/**
 * Convert a dict of model_id -> ArchiveLlmGrade into an LlmGradeEntry array.
 */
function gradeDictToEntries(
  dict: Record<string, ArchiveLlmGrade>
): LlmGradeEntry[] | undefined {
  const entries: LlmGradeEntry[] = [];
  for (const [modelId, grade] of Object.entries(dict)) {
    entries.push({
      modelId,
      status: grade.status,
      pointsEarned: grade.points_earned,
      pointsPossible: grade.points_possible,
      feedback: grade.feedback,
    });
  }
  return entries.length > 0 ? entries : undefined;
}

/**
 * Build the llmGrades array from either old singular llm_grade or new plural llm_grades.
 */
function extractLlmGrades(ws: ArchiveWorkspace): LlmGradeEntry[] | undefined {
  if (ws.llm_grades) return gradeDictToEntries(ws.llm_grades);
  if (ws.llm_grade) {
    return [
      {
        modelId: "grader",
        status: ws.llm_grade.status,
        pointsEarned: ws.llm_grade.points_earned,
        pointsPossible: ws.llm_grade.points_possible,
        feedback: ws.llm_grade.feedback,
      },
    ];
  }
  return undefined;
}

/**
 * Build the codeReviews array from the new code_reviews dict.
 */
function extractCodeReviews(ws: ArchiveWorkspace): LlmGradeEntry[] | undefined {
  if (!ws.code_reviews) return undefined;
  return gradeDictToEntries(ws.code_reviews);
}

/**
 * Build the backward-compatible singular llmGrade from either old or new format.
 * Delegates to extractLlmGrades and picks the first graded (or first overall) entry.
 */
function extractLlmGradeSingular(
  ws: ArchiveWorkspace
): AssignmentResult["llmGrade"] | undefined {
  const grades = extractLlmGrades(ws);
  if (!grades) return undefined;
  const pick = grades.find((g) => g.status === "graded") ?? grades[0];
  if (!pick) return undefined;
  return {
    status: pick.status,
    pointsEarned: pick.pointsEarned,
    pointsPossible: pick.pointsPossible,
    feedback: pick.feedback,
  };
}

/**
 * Check if a workspace has any graded LLM grade (either old or new format).
 */
function hasGradedLlmGrade(ws: ArchiveWorkspace): boolean {
  if (ws.llm_grade?.status === "graded") return true;
  if (ws.llm_grades) {
    for (const grade of Object.values(ws.llm_grades)) {
      if (grade.status === "graded") return true;
    }
  }
  return false;
}

function transformRun(run: ArchiveRun): BenchmarkEntry {
  const modelId = run.run_metadata.model_id;
  const { tags, ...modelInfo } = getModelInfo(modelId);

  // Handle timestamp being null: fall back to rebuilt_at
  const date =
    run.run_metadata.timestamp ?? run.run_metadata.rebuilt_at ?? "";

  const grouped = groupWorkspacesByCourse(run.workspaces);

  const courses: Record<string, CourseResult> = {};
  for (const [courseId, workspaces] of Object.entries(grouped)) {
    const courseTotals = run.by_course[courseId];
    const courseScore = run.scores.courses[courseId];

    const assignments: AssignmentResult[] = workspaces.map((ws) => {
      const assignmentScore = run.scores.assignments[ws.id];
      const totalTokens =
        ws.input_tokens +
        ws.output_tokens +
        ws.cache_creation_tokens +
        ws.cache_read_tokens;
      return {
        id: ws.id,
        assignmentId: ws.assignment_id,
        number: ws.assignment_number,
        displayName: ws.display_name,
        testsPassed: ws.grade?.tests_passed ?? 0,
        testsTotal: ws.grade?.tests_total ?? 0,
        score: assignmentScore?.pct ?? ws.grade?.score_percentage ?? 0,
        codePct: assignmentScore?.code_pct ?? null,
        writtenPct: assignmentScore?.written_pct ?? null,
        reviewPct: assignmentScore?.review_pct ?? null,
        cost: ws.cost_usd,
        timeSeconds: ws.duration_ms / 1000,
        tokens: totalTokens,
        steps: ws.num_turns,
        // Workspaces with all-zero metrics indicate the agent never ran (timeout before start)
        isTimeout: ws.duration_ms === 0 && ws.cost_usd === 0 && ws.num_turns === 0,
        durationApiMs: ws.duration_api_ms,
        weight: assignmentScore?.weight ?? 1,
        llmGrade: extractLlmGradeSingular(ws),
        llmGrades: extractLlmGrades(ws),
        codeReviews: extractCodeReviews(ws),
        testResults: extractTestResults(ws),
      };
    });

    const testsPassed =
      courseTotals?.tests_passed ??
      assignments.reduce((s, a) => s + a.testsPassed, 0);
    const testsTotal =
      courseTotals?.tests_total ??
      assignments.reduce((s, a) => s + a.testsTotal, 0);

    courses[courseId] = {
      courseId,
      grade: courseScore?.grade ?? (testsTotal > 0 ? (testsPassed / testsTotal) * 100 : 0),
      letter: courseScore?.letter ?? "",
      creditHours: courseScore?.credit_hours ?? 3,
      testsPassed,
      testsTotal,
      passRate: testsTotal > 0 ? (testsPassed / testsTotal) * 100 : 0,
      totalCost:
        courseTotals?.cost_usd ??
        assignments.reduce((s, a) => s + a.cost, 0),
      totalTimeSeconds: courseTotals
        ? courseTotals.duration_ms / 1000
        : assignments.reduce((s, a) => s + a.timeSeconds, 0),
      assignments,
    };
  }

  const allAssignments = Object.values(courses).flatMap((c) => c.assignments);
  const assignmentsSolved = allAssignments.filter((a) => a.score >= 100).length;

  const cacheCreationTokens = Object.values(run.workspaces).reduce(
    (s, w) => s + w.cache_creation_tokens,
    0
  );
  const cacheReadTokens = Object.values(run.workspaces).reduce(
    (s, w) => s + w.cache_read_tokens,
    0
  );

  return {
    id: `${modelId}-${date}`,
    model: modelInfo,
    tags,
    date,
    scores: {
      overall: run.scores.overall,
      overallLetter: run.scores.overall_letter,
      gpa: run.scores.gpa,
    },
    totals: {
      costUsd: run.totals.cost_usd,
      durationMs: run.totals.duration_ms,
      durationApiMs: run.totals.duration_api_ms,
      testsPassed: run.totals.tests_passed,
      testsTotal: run.totals.tests_total,
      inputTokens: run.totals.input_tokens,
      outputTokens: run.totals.output_tokens,
      cacheCreationTokens,
      cacheReadTokens,
    },
    assignmentsSolved,
    assignmentsTotal: allAssignments.length,
    courses,
  };
}

/**
 * Strip the model suffix from a workspace id to get the assignment base name.
 * Must stay in sync with scripts/extract-assignments.mjs:getAssignmentBase().
 * Update both when adding new model runs with different workspace-id suffixes.
 */
export function getAssignmentBase(workspaceId: string): string {
  return workspaceId
    .replace(/_opus$/, "")
    .replace(/_haiku$/, "")
    .replace(/_sonnet$/, "")
    .replace(/_codex$/, "")
    .replace(/_gpt54$/, "")
    .replace(/_gemini3flash$/, "");
}

/** Get the list of assignments for a given course, derived from any entry's course data. */
export function getAssignmentBasesForCourse(
  courseId: string
): { base: string; number: number; displayName: string }[] {
  const data = getBenchmarkData();
  // Find the first entry that has this course
  for (const entry of data.entries) {
    const course = entry.courses[courseId];
    if (!course) continue;
    return course.assignments.map((a) => ({
      base: getAssignmentBase(a.id),
      number: a.number,
      displayName: a.displayName,
    }));
  }
  return [];
}

let cached: BenchmarkData | null = null;

export function getEntryByModelId(modelId: string): BenchmarkEntry | null {
  const data = getBenchmarkData();
  return data.entries.find((e) => e.model.id === modelId) ?? null;
}

export function getEntryByWorkspaceId(
  workspaceId: string
): { modelId: string; modelName: string; assignmentName: string; assignment: AssignmentResult } | null {
  const data = getBenchmarkData();
  for (const entry of data.entries) {
    for (const course of Object.values(entry.courses)) {
      for (const assignment of course.assignments) {
        if (assignment.id === workspaceId) {
          return {
            modelId: entry.model.id,
            modelName: entry.model.name,
            assignmentName: assignment.displayName,
            assignment,
          };
        }
      }
    }
  }
  return null;
}

export function getBenchmarkData(): BenchmarkData {
  if (cached) return cached;
  const data = rawData as unknown as ResultsFile;

  // Derive which courses have written (LLM-graded) components
  const coursesWithWritten = new Set<string>();
  for (const run of data.runs) {
    for (const ws of Object.values(run.workspaces)) {
      if (hasGradedLlmGrade(ws)) {
        coursesWithWritten.add(ws.course);
      }
    }
  }

  const courses: Record<string, import("./types").CourseInfo> = {};
  for (const [id, c] of Object.entries(data.courses)) {
    courses[id] = { ...c, hasWritten: coursesWithWritten.has(id) };
  }

  cached = {
    version: data.version,
    lastUpdated: data.lastUpdated,
    courses,
    entries: data.runs.map(transformRun),
  };
  return cached;
}
