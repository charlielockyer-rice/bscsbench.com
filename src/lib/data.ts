import type {
  ArchiveRun,
  ArchiveWorkspace,
  BenchmarkData,
  BenchmarkEntry,
  CourseResult,
  AssignmentResult,
  ModelInfo,
  ResultsFile,
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
  "gpt-5.2-codex": {
    name: "GPT-5.2 Codex",
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

function transformRun(run: ArchiveRun): BenchmarkEntry {
  const modelId = run.run_metadata.model_id;
  const { tags, ...modelInfo } = getModelInfo(modelId);

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
        number: ws.assignment_number,
        displayName: ws.display_name,
        testsPassed: ws.grade?.tests_passed ?? 0,
        testsTotal: ws.grade?.tests_total ?? 0,
        score: assignmentScore?.pct ?? ws.grade?.score_percentage ?? 0,
        cost: ws.cost_usd,
        timeSeconds: ws.duration_ms / 1000,
        tokens: totalTokens,
        steps: ws.num_turns,
        // Workspaces with all-zero metrics indicate the agent never ran (timeout before start)
        isTimeout: ws.duration_ms === 0 && ws.cost_usd === 0 && ws.num_turns === 0,
        durationApiMs: ws.duration_api_ms,
        weight: assignmentScore?.weight ?? 1,
        llmGrade: ws.llm_grade
          ? {
              status: ws.llm_grade.status,
              pointsEarned: ws.llm_grade.points_earned,
              pointsPossible: ws.llm_grade.points_possible,
              feedback: ws.llm_grade.feedback,
            }
          : undefined,
        testResults: ws.test_results?.map((t) => ({
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
        })),
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
    id: `${modelId}-${run.run_metadata.timestamp}`,
    model: modelInfo,
    tags,
    date: run.run_metadata.timestamp,
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
  cached = {
    version: data.version,
    lastUpdated: data.lastUpdated,
    courses: data.courses,
    entries: data.runs.map(transformRun),
  };
  return cached;
}
