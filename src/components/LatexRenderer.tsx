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

    try {
      // Split by $$...$$ (display) and $...$ (inline) patterns
      const parts = content.split(/(\$\$[\s\S]*?\$\$|\$[^$]*?\$)/g);

      return parts
        .map((part) => {
          // Display math: $$...$$
          if (part.startsWith("$$") && part.endsWith("$$")) {
            const latex = part.slice(2, -2).trim();
            try {
              return katex.renderToString(latex, {
                displayMode: true,
                throwOnError: false,
                trust: true,
              });
            } catch {
              return `<span class="text-destructive">${part}</span>`;
            }
          }
          // Inline math: $...$
          if (part.startsWith("$") && part.endsWith("$") && part.length > 1) {
            const latex = part.slice(1, -1).trim();
            try {
              return katex.renderToString(latex, {
                displayMode: false,
                throwOnError: false,
                trust: true,
              });
            } catch {
              return `<span class="text-destructive">${part}</span>`;
            }
          }
          // Plain text - escape HTML
          return part
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
        })
        .join("");
    } catch {
      return content;
    }
  }, [content]);

  return (
    <span
      className={className}
      dangerouslySetInnerHTML={{ __html: rendered }}
    />
  );
};
