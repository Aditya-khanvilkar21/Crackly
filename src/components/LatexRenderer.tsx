import { useMemo } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

interface LatexRendererProps {
  content: string;
  className?: string;
  displayMode?: boolean;
}

/**
 * Renders text with inline LaTeX expressions.
 * LaTeX wrapped in $...$ renders inline, $$...$$ renders as block.
 * Plain text without LaTeX passes through unchanged.
 */
export const LatexRenderer = ({ content, className = "", displayMode = false }: LatexRendererProps) => {
  const rendered = useMemo(() => {
    if (!content) return "";

    const escapeHtml = (s: string) =>
      s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    const trustFn = (ctx: { command: string; url?: string }) =>
      ctx.command !== "\\href" || !(ctx.url || "").toLowerCase().startsWith("javascript:");

    try {
      const parts = content.split(/(\$\$[\s\S]*?\$\$|\$[^$]*?\$)/g);

      return parts
        .map((part) => {
          if (part.startsWith("$$") && part.endsWith("$$")) {
            const latex = part.slice(2, -2).trim();
            try {
              return katex.renderToString(latex, {
                displayMode: true,
                throwOnError: false,
                trust: trustFn,
              });
            } catch {
              return `<span class="text-destructive">${escapeHtml(part)}</span>`;
            }
          }
          if (part.startsWith("$") && part.endsWith("$") && part.length > 1) {
            const latex = part.slice(1, -1).trim();
            try {
              return katex.renderToString(latex, {
                displayMode: false,
                throwOnError: false,
                trust: trustFn,
              });
            } catch {
              return `<span class="text-destructive">${escapeHtml(part)}</span>`;
            }
          }
          return escapeHtml(part);
        })
        .join("");
    } catch {
      return escapeHtml(content);
    }
  }, [content]);

  return (
    <span
      className={className}
      dangerouslySetInnerHTML={{ __html: rendered }}
    />
  );
};
