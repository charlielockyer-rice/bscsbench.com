// === Raw archive types (match summary.json from bench-cli) ===

export interface ArchiveRunMetadata {
  timestamp: string;
  agent: string;
  model: string;
  model_id: string;
  skip_permissions?: boolean;
  total_workspaces: number;
  course_filter?: string;
}

export interface ArchiveWorkspaceGrade {
  tests_passed: number;
  tests_total: number;
  points_earned: number;
  points_possible: number;
  score_percentage: number;
}

export interface ArchiveLlmGrade {
  status: "graded" | "error";
  feedback: string;
  points_earned?: number;
  points_possible?: number;
  score_percentage?: number;
}

export interface ArchiveTestResult {
  test_name: string;
  status: "pass" | "fail";
  points_earned: number;
  points_possible: number;
  input_description: string | null;
  expected: string | null;
  actual: string | null;
  error_message: string | null;
  traceback: string | null;
  execution_time_ms: number;
}

export interface ArchiveWorkspace {
  id: string;
  course: string;
  language: string;
  assignment_number: number;
  display_name: string;
  cost_usd: number;
  input_tokens: number;
  output_tokens: number;
  cache_creation_tokens: number;
  cache_read_tokens: number;
  duration_ms: number;
  duration_api_ms: number;
  num_turns: number;
  session_id: string;
  model_id: string;
  grade: ArchiveWorkspaceGrade | null;
  grade_summary: string;
  llm_grade?: ArchiveLlmGrade;
  test_results?: ArchiveTestResult[];
}

export interface ArchiveCourseTotals {
  workspaces: number;
  cost_usd: number;
  duration_ms: number;
  tests_passed: number;
  tests_total: number;
  points_earned: number;
  points_possible: number;
}

export interface ArchiveScores {
  assignments: Record<string, { pct: number; weight: number }>;
  courses: Record<string, { grade: number; letter: string; credit_hours: number }>;
  overall: number;
  overall_letter: string;
  gpa: number;
}

export interface ArchiveRun {
  run_metadata: ArchiveRunMetadata;
  workspaces: Record<string, ArchiveWorkspace>;
  totals: {
    cost_usd: number;
    input_tokens: number;
    output_tokens: number;
    duration_ms: number;
    duration_api_ms: number;
    tests_passed: number;
    tests_total: number;
    points_earned: number;
    points_possible: number;
  };
  by_course: Record<string, ArchiveCourseTotals>;
  scores: ArchiveScores;
}

// === Site data file format ===

export interface ResultsFile {
  version: number;
  lastUpdated: string;
  courses: Record<string, CourseInfo>;
  runs: ArchiveRun[];
}

// === Display types (what components use) ===

export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  logo?: string;
}

export interface CourseInfo {
  id: string;
  displayName: string;
  title: string;
  language: string;
  totalAssignments: number;
  totalTests: number;
}

export interface TestResult {
  name: string;
  status: "pass" | "fail";
  pointsEarned: number;
  pointsPossible: number;
  inputDescription: string | null;
  expected: string | null;
  actual: string | null;
  errorMessage: string | null;
  traceback: string | null;
  executionTimeMs: number;
}

export interface AssignmentResult {
  id: string;
  number: number;
  displayName: string;
  testsPassed: number;
  testsTotal: number;
  score: number; // 0-100, composite from scores.assignments
  cost: number;
  timeSeconds: number;
  tokens: number;
  steps: number;
  llmGrade?: {
    status: string;
    pointsEarned?: number;
    pointsPossible?: number;
    feedback?: string;
  };
  testResults?: TestResult[];
}

export interface CourseResult {
  courseId: string;
  grade: number; // 0-100
  letter: string;
  testsPassed: number;
  testsTotal: number;
  passRate: number; // 0-100
  totalCost: number;
  totalTimeSeconds: number;
  assignments: AssignmentResult[];
}

export interface BenchmarkEntry {
  id: string;
  model: ModelInfo;
  tags: string[];
  date: string;
  scores: {
    overall: number; // 0-100
    overallLetter: string;
    gpa: number;
  };
  totals: {
    costUsd: number;
    durationMs: number;
    durationApiMs: number;
    testsPassed: number;
    testsTotal: number;
    inputTokens: number;
    outputTokens: number;
    cacheCreationTokens: number;
    cacheReadTokens: number;
  };
  assignmentsSolved: number;
  assignmentsTotal: number;
  courses: Record<string, CourseResult>;
}

export interface BenchmarkData {
  version: number;
  lastUpdated: string;
  courses: Record<string, CourseInfo>;
  entries: BenchmarkEntry[];
}

export type RankingMetric =
  | "overall"
  | "gpa"
  | "passRate"
  | "solved"
  | "costEfficiency"
  | "speed";

export type SortDirection = "asc" | "desc";
