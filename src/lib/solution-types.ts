export interface SolutionFile {
  path: string;
  filename: string;
  language: string;
  content: string;
  sizeBytes: number;
  truncated: boolean;
}

export interface SolutionWriteup {
  filename: string;
  content: string;
  format: "md" | "txt";
}

export interface GraderReviewData {
  content: string;
}

export interface SolutionData {
  workspaceId: string;
  files: SolutionFile[];
  writeup: SolutionWriteup | null;
  graderReview: GraderReviewData | null;
  diff: string | null;
}
