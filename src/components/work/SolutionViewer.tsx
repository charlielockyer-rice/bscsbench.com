"use client";

import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { FileTree } from "./FileTree";

type SolutionFile = {
  path: string;
  filename: string;
  language: string;
  highlightedHtml: string;
  sizeBytes: number;
  truncated: boolean;
};

type SolutionViewerProps = {
  files: SolutionFile[];
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const WRITEUP_LANGUAGES = new Set(["markdown", "text", "plaintext"]);

export function SolutionViewer({ files }: SolutionViewerProps) {
  const defaultPath = useMemo(() => {
    const nonWriteup = files.find(
      (f) => !WRITEUP_LANGUAGES.has(f.language.toLowerCase())
    );
    return (nonWriteup ?? files[0])?.path ?? null;
  }, [files]);

  const [selectedPath, setSelectedPath] = useState<string | null>(defaultPath);

  const selectedFile = files.find((f) => f.path === selectedPath) ?? files[0];
  const isSingleFile = files.length === 1;

  const treeFiles = useMemo(
    () =>
      files.map((f) => ({
        path: f.path,
        filename: f.filename,
        language: f.language,
      })),
    [files]
  );

  return (
    <div className="rounded-lg border overflow-hidden">
      {isSingleFile ? (
        <CodePanel file={selectedFile} />
      ) : (
        <>
          {/* Mobile: dropdown + code */}
          <div className="md:hidden">
            <div className="px-3 py-2 border-b bg-muted/30">
              <select
                value={selectedPath ?? ""}
                onChange={(e) => setSelectedPath(e.target.value)}
                className="w-full text-xs font-mono bg-transparent border rounded px-2 py-1"
              >
                {files.map((f) => (
                  <option key={f.path} value={f.path}>
                    {f.path}
                  </option>
                ))}
              </select>
            </div>
            <CodePanel file={selectedFile} />
          </div>

          {/* Desktop: side-by-side */}
          <div className="hidden md:grid grid-cols-[220px_1fr]">
            <div className="border-r overflow-y-auto">
              <FileTree
                files={treeFiles}
                selectedPath={selectedPath}
                onSelect={setSelectedPath}
              />
            </div>
            <div className="overflow-hidden">
              <CodePanel file={selectedFile} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function CodePanel({ file }: { file: SolutionFile }) {
  return (
    <div>
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-mono text-sm truncate">{file.filename}</span>
          <span className="text-[10px] text-muted-foreground shrink-0">
            {formatSize(file.sizeBytes)}
          </span>
        </div>
        <Badge variant="outline" className="text-[10px]">
          {file.language}
        </Badge>
      </div>
      {file.truncated && (
        <div className="px-4 py-1 text-[10px] text-muted-foreground bg-muted/20 border-b">
          File truncated — showing partial content
        </div>
      )}
      <div
        className={cn(
          "overflow-x-auto text-xs",
          "[&_pre]:p-4 [&_pre]:m-0 [&_code]:text-xs"
        )}
        dangerouslySetInnerHTML={{ __html: file.highlightedHtml }}
      />
    </div>
  );
}
