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
      `tar -tzf "${archivePath}" | grep 'llm_grade_result.*\\.txt$'`,
      { encoding: "utf-8" }
    );
    return output.trim().split("\n").filter(Boolean);
  } catch {
    return [];
  }
}

function listDiffFiles(archivePath) {
  try {
    const output = execSync(
      `tar -tzf "${archivePath}" | grep 'solution\\.diff$'`,
      { encoding: "utf-8" }
    );
    return output.trim().split("\n").filter(Boolean);
  } catch {
    return [];
  }
}

function listBundleFiles(archivePath) {
  try {
    const output = execSync(
      `tar -tzf "${archivePath}" | grep '\\.bundle$'`,
      { encoding: "utf-8" }
    );
    return output.trim().split("\n").filter(Boolean);
  } catch {
    return [];
  }
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
    const diffPaths = listDiffFiles(archive);
    const bundlePaths = listBundleFiles(archive);

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
        workspaces.set(workspaceId, { files: [], gradeFile: null, diffFile: null, bundleFile: null });
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
        workspaces.set(workspaceId, { files: [], gradeFile: gp, diffFile: null, bundleFile: null });
      }
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
        workspaces.set(workspaceId, { files: [], gradeFile: null, diffFile: dp, bundleFile: null });
      }
    }

    // Map bundle files to workspaces
    for (const bp of bundlePaths) {
      // Path: archive-xxx/workspaces/{workspaceId}.bundle
      const wsId = basename(bp, ".bundle");
      if (workspaces.has(wsId)) {
        workspaces.get(wsId).bundleFile = bp;
      } else {
        workspaces.set(wsId, { files: [], gradeFile: null, diffFile: null, bundleFile: bp });
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

        const data = { workspaceId, files, writeup, graderReview, diff };
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
