import type { BenchmarkData } from "./types";
import sampleData from "../../data/sample-results.json";

export function getBenchmarkData(): BenchmarkData {
  return sampleData as BenchmarkData;
}
