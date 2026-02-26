export interface CourseInfo {
  id: string;
  displayName: string;
  title: string;
  language: string;
  totalTests: number;
  totalAssignments: number;
  assignments: {
    number: number;
    name: string;
    displayName: string;
    totalTests: number;
  }[];
}

export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  logo?: string;
}

export interface BenchmarkEntry {
  id: string;
  model: ModelInfo;
  tags: string[];
  metadata: {
    date: string;
    submittedBy?: string;
    logsUrl?: string;
    notes?: string;
  };
  overall: {
    testsPassed: number;
    testsTotal: number;
    passRate: number;
    assignmentsSolved: number;
    assignmentsTotal: number;
    totalCost: number;
    totalTimeSeconds: number;
    totalTokens: number;
    inputTokens: number;
    outputTokens: number;
    totalSteps: number;
  };
  courses: Record<
    string,
    {
      courseId: string;
      testsPassed: number;
      testsTotal: number;
      passRate: number;
      totalCost: number;
      totalTimeSeconds: number;
      totalTokens: number;
      assignments: AssignmentResult[];
    }
  >;
}

export interface AssignmentResult {
  number: number;
  name: string;
  testsPassed: number;
  testsTotal: number;
  passRate: number;
  solved: boolean;
  cost: number;
  timeSeconds: number;
  tokens: number;
  steps: number;
  performanceIndex?: number;
  llmGraded?: boolean;
}

export interface BenchmarkData {
  version: 1;
  lastUpdated: string;
  courses: Record<string, CourseInfo>;
  entries: BenchmarkEntry[];
}

export type RankingMetric =
  | "overall"
  | "passRate"
  | "solved"
  | "costEfficiency"
  | "speed";

export type SortDirection = "asc" | "desc";
