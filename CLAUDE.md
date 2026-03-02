# BSCS Bench

Next.js 16 app (app router, server components) that displays AI model benchmark results on university CS assignments. Uses Tailwind CSS v4, shadcn/ui, shiki for syntax highlighting.

## Layout Decisions

### Full-width navbar
`src/components/Header.tsx` uses full viewport width with horizontal padding (`px-6 lg:px-12`), no max-width. This was intentional — the site branding sits on the far left and nav links on the far right.

### Work page (`/work/[workspaceId]`) — no max-width
The work page has no `max-width` constraint, only horizontal padding (`px-4 sm:px-6 lg:px-12`). This is because the page is a **tool/viewer** (code, diffs, file trees, tables), not prose. Code viewers and diff panels benefit from horizontal space.

The header (back link + title), tab bar, and all tab content are left-aligned within this padding.

### MarkdownWithToc — centered content with symmetric spacer
`src/components/work/MarkdownWithToc.tsx` renders markdown with a table-of-contents sidebar. The layout uses a 3-column flex:

```
[TOC w-52] | [content flex-1] | [invisible spacer w-52]
```

The invisible right spacer matches the TOC width so the content appears centered on the page. On screens below `lg`, the TOC and spacer are hidden and content goes full-width.

If you replicate this pattern elsewhere, remember:
- The spacer must match the TOC `w-*` value exactly
- Both the TOC and spacer use `hidden lg:block` so they appear/disappear together
- The content uses `min-w-0 flex-1` to prevent overflow from code blocks

### Other pages
Other pages (leaderboard, courses, model detail) still use `max-w-5xl` or `max-w-7xl` centered containers. These are prose-heavier and benefit from line-length constraints (~75-80 chars). The work page is the exception.

## Markdown Rendering

`src/components/traces/markdown-lite.tsx` is a lightweight markdown renderer (no external deps). It handles:
- Code fences, inline code, bold
- Headers h1-h6 (with `id` attributes for anchor linking)
- Lists, tables (pipe-delimited)
- Paragraph breaks

Headers get auto-generated `id` slugs and `scroll-mt-16` for smooth anchor scrolling under the sticky tab bar. The `extractTocEntries()` function parses the same headers to build a TOC. Both use matching slug logic with duplicate handling.

## Diff Viewer

Diffs are split per-file by `diff --git` markers and each file gets its own bordered container with a file path header. Syntax highlighting uses shiki's `diff` language with a custom `diffLineTransformer` that adds CSS classes (`diff-add`, `diff-remove`, `diff-header`) for GitHub-style green/red/blue line backgrounds (defined in `globals.css`).

## Data Pipeline

Extraction scripts in `scripts/` parse tar.gz archives and agent traces:
- `extract-traces.mjs` — agent trace JSONL → processed trace JSON
- `extract-solutions.mjs` — solution files + diffs from archives
- `extract-assignments.mjs` — instructions + provided files from agent traces
- `extract-agent-meta.mjs` — model usage from agent_output.json

All output to `public/{traces,solutions,assignments,agent-meta}/`.
