"use client";

import { useState } from "react";
import { Folder, FolderOpen, FileCode2, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

type FileEntry = {
  path: string;
  filename: string;
  language: string;
};

type TreeNode = {
  name: string;
  fullPath: string;
  isDir: boolean;
  language: string;
  children: TreeNode[];
};

type FileTreeProps = {
  files: FileEntry[];
  selectedPath: string | null;
  onSelect: (path: string) => void;
};

function buildTree(files: FileEntry[]): TreeNode[] {
  const root: TreeNode = {
    name: "",
    fullPath: "",
    isDir: true,
    language: "",
    children: [],
  };

  for (const file of files) {
    const parts = file.path.split("/");
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;

      if (isLast) {
        current.children.push({
          name: part,
          fullPath: file.path,
          isDir: false,
          language: file.language,
          children: [],
        });
      } else {
        let child = current.children.find((c) => c.isDir && c.name === part);
        if (!child) {
          child = {
            name: part,
            fullPath: parts.slice(0, i + 1).join("/"),
            isDir: true,
            language: "",
            children: [],
          };
          current.children.push(child);
        }
        current = child;
      }
    }
  }

  collapseChains(root);
  sortTree(root);
  return root.children;
}

function collapseChains(node: TreeNode) {
  for (const child of node.children) {
    collapseChains(child);
  }

  for (let i = 0; i < node.children.length; i++) {
    const child = node.children[i];
    if (child.isDir && child.children.length === 1 && child.children[0].isDir) {
      const grandchild = child.children[0];
      node.children[i] = {
        ...grandchild,
        name: child.name + "/" + grandchild.name,
      };
      // Re-check this index since we replaced the node
      i--;
    }
  }
}

function sortTree(node: TreeNode) {
  node.children.sort((a, b) => {
    if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  for (const child of node.children) {
    sortTree(child);
  }
}

const CODE_LANGUAGES = new Set([
  "java", "python", "javascript", "typescript", "c", "cpp", "csharp",
  "go", "rust", "ruby", "php", "swift", "kotlin", "scala", "shell",
  "bash", "sql", "html", "css", "json", "yaml", "xml", "toml",
]);

function fileIcon(language: string, className: string) {
  if (CODE_LANGUAGES.has(language.toLowerCase())) {
    return <FileCode2 className={className} />;
  }
  return <FileText className={className} />;
}

function TreeItem({
  node,
  depth,
  selectedPath,
  onSelect,
  expandedDirs,
  toggleDir,
}: {
  node: TreeNode;
  depth: number;
  selectedPath: string | null;
  onSelect: (path: string) => void;
  expandedDirs: Set<string>;
  toggleDir: (path: string) => void;
}) {
  const isExpanded = expandedDirs.has(node.fullPath);
  const isSelected = !node.isDir && node.fullPath === selectedPath;
  const iconSize = "size-3.5 shrink-0";

  if (node.isDir) {
    return (
      <>
        <button
          onClick={() => toggleDir(node.fullPath)}
          className={cn(
            "flex items-center gap-1.5 px-2 py-1 rounded cursor-pointer hover:bg-muted/50 w-full text-left",
            "text-xs font-mono"
          )}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
        >
          {isExpanded ? (
            <FolderOpen className={iconSize} />
          ) : (
            <Folder className={iconSize} />
          )}
          <span className="truncate">{node.name}</span>
        </button>
        {isExpanded &&
          node.children.map((child) => (
            <TreeItem
              key={child.fullPath}
              node={child}
              depth={depth + 1}
              selectedPath={selectedPath}
              onSelect={onSelect}
              expandedDirs={expandedDirs}
              toggleDir={toggleDir}
            />
          ))}
      </>
    );
  }

  return (
    <button
      onClick={() => onSelect(node.fullPath)}
      className={cn(
        "flex items-center gap-1.5 px-2 py-1 rounded cursor-pointer hover:bg-muted/50 w-full text-left",
        "text-xs font-mono",
        isSelected && "bg-accent text-accent-foreground"
      )}
      style={{ paddingLeft: `${depth * 12 + 8}px` }}
    >
      {fileIcon(node.language, iconSize)}
      <span className="truncate">{node.name}</span>
    </button>
  );
}

export function FileTree({ files, selectedPath, onSelect }: FileTreeProps) {
  const tree = buildTree(files);

  const allDirPaths = new Set<string>();
  function collectDirs(nodes: TreeNode[]) {
    for (const node of nodes) {
      if (node.isDir) {
        allDirPaths.add(node.fullPath);
        collectDirs(node.children);
      }
    }
  }
  collectDirs(tree);

  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(
    () => new Set(allDirPaths)
  );

  const toggleDir = (path: string) => {
    setExpandedDirs((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  return (
    <div className="py-1">
      {tree.map((node) => (
        <TreeItem
          key={node.fullPath}
          node={node}
          depth={0}
          selectedPath={selectedPath}
          onSelect={onSelect}
          expandedDirs={expandedDirs}
          toggleDir={toggleDir}
        />
      ))}
    </div>
  );
}
