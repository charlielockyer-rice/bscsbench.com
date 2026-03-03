export interface ProvidedFile {
  path: string;
  filename: string;
  content: string;
}

export interface AssignmentData {
  assignmentBase: string;
  instructions: string;
  providedFiles: ProvidedFile[];
}
