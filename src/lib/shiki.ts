import { createHighlighter, type Highlighter } from "shiki";

let highlighter: Highlighter | null = null;

export async function getHighlighter(): Promise<Highlighter> {
  if (!highlighter) {
    highlighter = await createHighlighter({
      themes: ["github-dark", "github-light"],
      langs: ["python", "java", "c", "markdown", "makefile"],
    });
  }
  return highlighter;
}

export async function highlightCode(
  code: string,
  lang: string
): Promise<string> {
  const hl = await getHighlighter();
  const validLang = ["python", "java", "c", "markdown", "makefile"].includes(lang)
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
  });
}
