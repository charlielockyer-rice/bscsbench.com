#!/usr/bin/env node

import { execSync } from "child_process";
import { readdirSync, readFileSync, mkdirSync, writeFileSync, rmSync } from "fs";
import { join, basename, extname } from "path";
import { tmpdir } from "os";

const DATA_DIR = join(import.meta.dirname, "..", "data");
const OUT_DIR = join(import.meta.dirname, "..", "public", "solutions");

const MAX_FILE_SIZE = 50_000;

const EXTENSION_LANG = {
  ".py": "python",
  ".java": "java",
  ".c": "c",
  ".h": "c",
  ".ts": "typescript",
  ".go": "go",
  ".css": "css",
  ".html": "html",
  ".md": "markdown",
  ".txt": "text",
  ".log": "text",
};

const ALLOWED_EXTENSIONS = new Set(Object.keys(EXTENSION_LANG));
const ALLOWED_BASENAMES = new Set(["Makefile"]);

const EXCLUDED_PATTERNS = [".dSYM/", "__pycache__/", ".plist", ".yml"];

// Files to skip when extracting from bundles (metadata, not solution code)
const BUNDLE_EXCLUDED = new Set([
  "instructions.md",
  "workspace.json",
  "workspace.yaml",
  "README.md",
  "package-lock.json",
  ".env",
  ".gitignore",
  "go.sum",
]);

function getArchives() {
  return readdirSync(DATA_DIR)
    .filter((f) => (f.startsWith("final-") || f.startsWith("archive-")) && f.endsWith(".tar.gz"))
    .map((f) => join(DATA_DIR, f));
}

/**
 * List all files in the archive with a single tar invocation,
 * then categorize them by type using JS filters.
 */
function listArchiveFiles(archivePath) {
  let allFiles;
  try {
    const output = execSync(`tar -tzf "${archivePath}"`, { encoding: "utf-8" });
    allFiles = output.trim().split("\n").filter(Boolean);
  } catch {
    allFiles = [];
  }

  return {
    solutionPaths: allFiles.filter((f) => f.includes("/solution/")),
    gradePaths: allFiles.filter((f) => /llm_grade_result.*\.txt$/.test(f)),
    llmGradeMdPaths: allFiles.filter((f) => /llm_grade_result_.*\.md$/.test(f)),
    codeReviewPaths: allFiles.filter((f) => /code_review_result_.*\.md$/.test(f)),
    diffPaths: allFiles.filter((f) => /solution\.diff$/.test(f)),
    bundlePaths: allFiles.filter((f) => /\.bundle$/.test(f)),
  };
}

/**
 * Extract the model ID from a review filename.
 * e.g. "llm_grade_result_claude-opus-4.6.md" -> "claude-opus-4.6"
 *      "code_review_result_claude-sonnet-4-6.md" -> "claude-sonnet-4-6"
 */
function parseModelIdFromFilename(filename, prefix) {
  if (!filename.startsWith(prefix) || !filename.endsWith(".md")) return null;
  return filename.slice(prefix.length, -".md".length);
}

function makeWorkspaceEntry() {
  return { files: [], gradeFile: null, llmGradeFiles: [], codeReviewFiles: [], diffFile: null, bundleFile: null };
}

/**
 * Extract solution files from a git bundle.
 * Clones the bundle to a temp dir, diffs HEAD against the initial commit
 * to find agent-modified files, reads them, and cleans up.
 */
function extractFromBundle(archivePath, bundlePath, workspaceId) {
  const tmp = join(tmpdir(), `bscs-bundle-${workspaceId}-${Date.now()}`);
  const bundleFile = join(tmp, "repo.bundle");
  const repoDir = join(tmp, "repo");
  const files = [];
  let writeup = null;

  try {
    mkdirSync(tmp, { recursive: true });

    // Extract bundle from archive
    execSync(`tar -xzf "${archivePath}" --to-stdout "${bundlePath}" > "${bundleFile}"`, {
      shell: true,
    });

    // Clone bundle
    execSync(`git clone "${bundleFile}" "${repoDir}"`, {
      encoding: "utf-8",
      stdio: "pipe",
    });

    // Find agent-modified files by diffing initial commit against HEAD
    const firstCommit = execSync("git rev-list --max-parents=0 HEAD", {
      cwd: repoDir,
      encoding: "utf-8",
    }).trim();

    const changedFiles = execSync(`git diff --name-only ${firstCommit} HEAD`, {
      cwd: repoDir,
      encoding: "utf-8",
    })
      .trim()
      .split("\n")
      .filter(Boolean);

    for (const relativePath of changedFiles) {
      const filename = basename(relativePath);

      // Skip metadata/excluded files
      if (BUNDLE_EXCLUDED.has(filename)) continue;
      if (!shouldInclude(relativePath)) continue;

      try {
        let content = readFileSync(join(repoDir, relativePath), "utf-8");
        const sizeBytes = Buffer.byteLength(content, "utf-8");
        let truncated = false;

        content = stripPaths(content);
        if (content.length > MAX_FILE_SIZE) {
          content =
            content.slice(0, MAX_FILE_SIZE) +
            `\n... (truncated ${content.length - MAX_FILE_SIZE} chars)`;
          truncated = true;
        }

        const language = detectLanguage(relativePath);
        const file = { path: relativePath, filename, language, content, sizeBytes, truncated };
        files.push(file);

        if (filename === "writeup.md" || filename === "writeup.txt") {
          writeup = { filename, content, format: filename.endsWith(".md") ? "md" : "txt" };
        }
      } catch {
        // Skip files that can't be read (binary, symlinks, etc.)
      }
    }
  } catch (err) {
    console.error(`  Bundle extraction failed for ${workspaceId}: ${err.message}`);
  } finally {
    try {
      rmSync(tmp, { recursive: true, force: true });
    } catch {
      // Cleanup best-effort
    }
  }

  return { files, writeup };
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
    console.error("No final-*.tar.gz or archive-*.tar.gz archives found in data/");
    process.exit(1);
  }

  mkdirSync(OUT_DIR, { recursive: true });
  let totalFiles = 0;

  for (const archive of archives) {
    const archiveName = basename(archive);
    console.log(`Processing ${archiveName}...`);

    const { solutionPaths, gradePaths, llmGradeMdPaths, codeReviewPaths, diffPaths, bundlePaths } = listArchiveFiles(archive);

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
        workspaces.set(workspaceId, makeWorkspaceEntry());
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
        workspaces.set(workspaceId, { ...makeWorkspaceEntry(), gradeFile: gp });
      }
    }

    // Map LLM grade markdown files to workspaces
    for (const gp of llmGradeMdPaths) {
      const parts = gp.split("/");
      const wsIdx = parts.indexOf("workspaces");
      if (wsIdx === -1) continue;
      const workspaceId = parts[wsIdx + 1];
      const filename = parts[parts.length - 1];
      const modelId = parseModelIdFromFilename(filename, "llm_grade_result_");
      if (!modelId) continue;
      if (!workspaces.has(workspaceId)) {
        workspaces.set(workspaceId, makeWorkspaceEntry());
      }
      workspaces.get(workspaceId).llmGradeFiles.push({ path: gp, modelId });
    }

    // Map code review files to workspaces
    for (const crp of codeReviewPaths) {
      const parts = crp.split("/");
      const wsIdx = parts.indexOf("workspaces");
      if (wsIdx === -1) continue;
      const workspaceId = parts[wsIdx + 1];
      const filename = parts[parts.length - 1];
      const modelId = parseModelIdFromFilename(filename, "code_review_result_");
      if (!modelId) continue;
      if (!workspaces.has(workspaceId)) {
        workspaces.set(workspaceId, makeWorkspaceEntry());
      }
      workspaces.get(workspaceId).codeReviewFiles.push({ path: crp, modelId });
    }

    // Map diff files to workspaces
    for (const dp of diffPaths) {
      const parts = dp.split("/");
      const wsIdx = parts.indexOf("workspaces");
      if (wsIdx === -1) continue;
      const workspaceId = parts[wsIdx + 1];
      if (workspaces.has(workspaceId)) {
        workspaces.get(workspaceId).diffFile = dp;
      } else {
        workspaces.set(workspaceId, { ...makeWorkspaceEntry(), diffFile: dp });
      }
    }

    // Map bundle files to workspaces
    for (const bp of bundlePaths) {
      // Path: archive-xxx/workspaces/{workspaceId}.bundle
      const wsId = basename(bp, ".bundle");
      if (workspaces.has(wsId)) {
        workspaces.get(wsId).bundleFile = bp;
      } else {
        workspaces.set(wsId, { ...makeWorkspaceEntry(), bundleFile: bp });
      }
    }

    console.log(`  Found ${workspaces.size} workspaces with solutions`);

    let bundleCount = 0;
    for (const [workspaceId, ws] of workspaces) {
      try {
        let files = [];
        let writeup = null;

        // Extract from solution/ directory
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

        // If solution/ dir yielded no code files, try extracting from bundle
        const hasCodeFiles = files.some(
          (f) => !["markdown", "text", "plaintext"].includes(f.language)
        );
        if (!hasCodeFiles && ws.bundleFile) {
          const bundle = extractFromBundle(archive, ws.bundleFile, workspaceId);
          // Merge: bundle files + any solution/ dir files (e.g. writeups)
          const existingPaths = new Set(files.map((f) => f.path));
          for (const bf of bundle.files) {
            if (!existingPaths.has(bf.path)) {
              files.push(bf);
            }
          }
          if (!writeup && bundle.writeup) {
            writeup = bundle.writeup;
          }
          bundleCount++;
        }

        // Extract grader review (old .txt format)
        let graderReview = null;
        if (ws.gradeFile) {
          try {
            const content = extractFile(archive, ws.gradeFile);
            graderReview = { content: stripPaths(content) };
          } catch {
            // Skip
          }
        }

        // Extract LLM grade reviews (new .md format with model IDs)
        const llmGradeReviews = [];
        for (const { path: gPath, modelId } of ws.llmGradeFiles) {
          try {
            const content = extractFile(archive, gPath);
            llmGradeReviews.push({ modelId, content: stripPaths(content) });
          } catch {
            // Skip
          }
        }

        // Extract code reviews
        const codeReviews = [];
        for (const { path: crPath, modelId } of ws.codeReviewFiles) {
          try {
            const content = extractFile(archive, crPath);
            codeReviews.push({ modelId, content: stripPaths(content) });
          } catch {
            // Skip
          }
        }

        // Backward compat: if no old .txt graderReview, use first LLM grade review
        if (!graderReview && llmGradeReviews.length > 0) {
          graderReview = { content: llmGradeReviews[0].content };
        }

        // Extract diff
        let diff = null;
        if (ws.diffFile) {
          try {
            let content = extractFile(archive, ws.diffFile);
            content = stripPaths(content);
            if (content.length > MAX_FILE_SIZE) {
              content = content.slice(0, MAX_FILE_SIZE) + `\n... (truncated ${content.length - MAX_FILE_SIZE} chars)`;
            }
            diff = content;
          } catch {
            // Skip
          }
        }

        const data = { workspaceId, files, writeup, graderReview, llmGradeReviews, codeReviews, diff };
        writeFileSync(join(OUT_DIR, `${workspaceId}.json`), JSON.stringify(data));
        totalFiles++;
      } catch (err) {
        console.error(`  Error processing ${workspaceId}: ${err.message}`);
      }
    }
    if (bundleCount > 0) {
      console.log(`  Extracted ${bundleCount} workspaces from git bundles`);
    }
  }

  console.log(`\nDone! Wrote ${totalFiles} solution files to public/solutions/`);
}

main();
