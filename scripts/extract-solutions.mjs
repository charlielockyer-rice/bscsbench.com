#!/usr/bin/env node

import { execSync } from "child_process";
import { readdirSync, mkdirSync, writeFileSync } from "fs";
import { join, basename, extname } from "path";

const DATA_DIR = join(import.meta.dirname, "..", "data");
const OUT_DIR = join(import.meta.dirname, "..", "public", "solutions");

const MAX_FILE_SIZE = 50_000;

const EXTENSION_LANG = {
  ".py": "python",
  ".java": "java",
  ".c": "c",
  ".h": "c",
  ".md": "markdown",
  ".txt": "text",
  ".log": "text",
};

const ALLOWED_EXTENSIONS = new Set(Object.keys(EXTENSION_LANG));
const ALLOWED_BASENAMES = new Set(["Makefile"]);

const EXCLUDED_PATTERNS = [".dSYM/", "__pycache__/", ".plist", ".yml"];

function getArchives() {
  return readdirSync(DATA_DIR)
    .filter((f) => f.startsWith("final-") && f.endsWith(".tar.gz"))
    .map((f) => join(DATA_DIR, f));
}

function listSolutionFiles(archivePath) {
  try {
    const output = execSync(
      `tar -tzf "${archivePath}" | grep '/solution/'`,
      { encoding: "utf-8" }
    );
    return output.trim().split("\n").filter(Boolean);
  } catch {
    return [];
  }
}

function listGradeFiles(archivePath) {
  try {
    const output = execSync(
      `tar -tzf "${archivePath}" | grep 'llm_grade_result\\.txt$'`,
      { encoding: "utf-8" }
    );
    return output.trim().split("\n").filter(Boolean);
  } catch {
    return [];
  }
}

function extractFile(archivePath, filePath) {
  return execSync(`tar -xzf "${archivePath}" --to-stdout "${filePath}"`, {
    encoding: "utf-8",
    maxBuffer: 10 * 1024 * 1024,
  });
}

function shouldInclude(filePath) {
  for (const pat of EXCLUDED_PATTERNS) {
    if (filePath.includes(pat)) return false;
  }
  const base = basename(filePath);
  if (ALLOWED_BASENAMES.has(base)) return true;
  const ext = extname(filePath);
  if (!ext) return false;
  return ALLOWED_EXTENSIONS.has(ext);
}

function detectLanguage(filePath) {
  const base = basename(filePath);
  if (base === "Makefile") return "makefile";
  const ext = extname(filePath);
  return EXTENSION_LANG[ext] || "text";
}

function stripPaths(text) {
  if (typeof text !== "string") return text;
  return text.replace(
    /\/Users\/[^/]+\/Code\/bscs-bench\/workspaces\/[^/]+\//g,
    "./"
  );
}

function main() {
  const archives = getArchives();
  if (archives.length === 0) {
    console.error("No final-*.tar.gz archives found in data/");
    process.exit(1);
  }

  mkdirSync(OUT_DIR, { recursive: true });
  let totalFiles = 0;

  for (const archive of archives) {
    const archiveName = basename(archive);
    console.log(`Processing ${archiveName}...`);

    const solutionPaths = listSolutionFiles(archive);
    const gradePaths = listGradeFiles(archive);

    // Group by workspaceId
    const workspaces = new Map();

    for (const p of solutionPaths) {
      if (!shouldInclude(p)) continue;
      // Path: archive-xxx/workspaces/{workspaceId}/solution/{rest}
      const parts = p.split("/");
      const wsIdx = parts.indexOf("workspaces");
      if (wsIdx === -1 || wsIdx + 1 >= parts.length) continue;
      const workspaceId = parts[wsIdx + 1];
      const solIdx = parts.indexOf("solution");
      if (solIdx === -1) continue;
      const relativePath = parts.slice(solIdx + 1).join("/");
      if (!relativePath) continue;

      if (!workspaces.has(workspaceId)) {
        workspaces.set(workspaceId, { files: [], gradeFile: null });
      }
      workspaces.get(workspaceId).files.push({ archivePath: p, relativePath });
    }

    // Map grade files to workspaces
    for (const gp of gradePaths) {
      const parts = gp.split("/");
      const wsIdx = parts.indexOf("workspaces");
      if (wsIdx === -1) continue;
      const workspaceId = parts[wsIdx + 1];
      if (workspaces.has(workspaceId)) {
        workspaces.get(workspaceId).gradeFile = gp;
      } else {
        workspaces.set(workspaceId, { files: [], gradeFile: gp });
      }
    }

    console.log(`  Found ${workspaces.size} workspaces with solutions`);

    for (const [workspaceId, ws] of workspaces) {
      try {
        const files = [];
        let writeup = null;

        for (const { archivePath, relativePath } of ws.files) {
          try {
            let content = extractFile(archive, archivePath);
            const sizeBytes = Buffer.byteLength(content, "utf-8");
            let truncated = false;

            content = stripPaths(content);
            if (content.length > MAX_FILE_SIZE) {
              content =
                content.slice(0, MAX_FILE_SIZE) +
                `\n... (truncated ${content.length - MAX_FILE_SIZE} chars)`;
              truncated = true;
            }

            const filename = basename(relativePath);
            const language = detectLanguage(relativePath);

            const file = {
              path: relativePath,
              filename,
              language,
              content,
              sizeBytes,
              truncated,
            };

            files.push(file);

            // Detect writeup
            if (
              filename === "writeup.md" ||
              filename === "writeup.txt"
            ) {
              writeup = {
                filename,
                content,
                format: filename.endsWith(".md") ? "md" : "txt",
              };
            }
          } catch {
            // Skip files that can't be extracted (binary, etc.)
          }
        }

        // Extract grader review
        let graderReview = null;
        if (ws.gradeFile) {
          try {
            const content = extractFile(archive, ws.gradeFile);
            graderReview = { content: stripPaths(content) };
          } catch {
            // Skip
          }
        }

        const data = { workspaceId, files, writeup, graderReview };
        writeFileSync(join(OUT_DIR, `${workspaceId}.json`), JSON.stringify(data));
        totalFiles++;
      } catch (err) {
        console.error(`  Error processing ${workspaceId}: ${err.message}`);
      }
    }
  }

  console.log(`\nDone! Wrote ${totalFiles} solution files to public/solutions/`);
}

main();
