import { createHighlighter, type Highlighter, type ShikiTransformer } from "shiki";

const SUPPORTED_LANGS = ["python", "java", "c", "markdown", "makefile", "diff"] as const;

function getNodeText(node: Record<string, unknown>): string {
  if (node.type === "text") return node.value as string;
  if (Array.isArray(node.children)) return node.children.map(getNodeText).join("");
  return "";
}

const diffLineTransformer: ShikiTransformer = {
  line(node) {
    const text = getNodeText(node as unknown as Record<string, unknown>);
    if (text.startsWith("@@")) {
      this.addClassToHast(node, "diff-header");
    } else if (text.startsWith("+")) {
      this.addClassToHast(node, "diff-add");
    } else if (text.startsWith("-")) {
      this.addClassToHast(node, "diff-remove");
    }
  },
};

let highlighter: Highlighter | null = null;

export async function getHighlighter(): Promise<Highlighter> {
  if (!highlighter) {
    highlighter = await createHighlighter({
      themes: ["github-dark", "github-light"],
      langs: [...SUPPORTED_LANGS],
    });
  }
  return highlighter;
}

export async function highlightCode(
  code: string,
  lang: string
): Promise<string> {
  const hl = await getHighlighter();
  const validLang = (SUPPORTED_LANGS as readonly string[]).includes(lang)
    ? lang
    : "text";
  if (validLang === "text") {
    // No highlighting for plain text — return escaped HTML in a pre block
    const escaped = code
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    return `<pre class="shiki" style="background-color:transparent"><code>${escaped}</code></pre>`;
  }
  return hl.codeToHtml(code, {
    lang: validLang,
    themes: { light: "github-light", dark: "github-dark" },
    transformers: validLang === "diff" ? [diffLineTransformer] : [],
  });
}
