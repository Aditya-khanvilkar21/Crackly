import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { LatexRenderer } from "@/components/LatexRenderer";
import { Badge } from "@/components/ui/badge";
import { Eye } from "lucide-react";

interface LatexInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  multiline?: boolean;
  className?: string;
}

const LATEX_HINTS = [
  { label: "Fraction", code: "\\frac{a}{b}" },
  { label: "Square root", code: "\\sqrt{x}" },
  { label: "Power", code: "x^{2}" },
  { label: "Subscript", code: "H_{2}O" },
  { label: "Integral", code: "\\int_{a}^{b}" },
  { label: "Pi", code: "\\pi" },
  { label: "Sum", code: "\\sum_{i=1}^{n}" },
  { label: "Infinity", code: "\\infty" },
  { label: "Alpha", code: "\\alpha" },
  { label: "Delta", code: "\\Delta" },
];

export const LatexInput = ({
  value,
  onChange,
  placeholder = "Type here... Use $...$ for inline math",
  label,
  multiline = false,
  className = "",
}: LatexInputProps) => {
  const hasLatex = value && (value.includes("$"));

  const insertSnippet = (code: string) => {
    onChange(value + ` $${code}$ `);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {multiline ? (
        <Textarea
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-[80px] font-mono text-sm"
        />
      ) : (
        <Input
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="font-mono text-sm"
        />
      )}

      {/* Quick insert buttons */}
      <div className="flex flex-wrap gap-1">
        {LATEX_HINTS.map((hint) => (
          <button
            key={hint.label}
            type="button"
            onClick={() => insertSnippet(hint.code)}
            className="px-2 py-0.5 text-xs rounded bg-muted hover:bg-muted/80 text-muted-foreground transition-colors border"
            title={`Insert ${hint.label}: ${hint.code}`}
          >
            {hint.label}
          </button>
        ))}
      </div>

      {/* Live Preview */}
      {value && hasLatex && (
        <div className="p-3 rounded-lg border bg-muted/30 min-h-[40px]">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Eye className="w-3 h-3 text-muted-foreground" />
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Preview</span>
          </div>
          <div className="text-sm leading-relaxed">
            <LatexRenderer content={value} />
          </div>
        </div>
      )}
    </div>
  );
};
