import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { LatexRenderer } from "@/components/LatexRenderer";
import { FileJson, Upload, AlertCircle, CheckCircle2, Trash2 } from "lucide-react";

/**
 * Question shape used by the existing CreateTest editor and stored inside
 * tests.questions JSONB. Do NOT change — the whole app depends on it.
 */
export interface EditorQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  imageUrl?: string;
  explanation?: string;
  explanationImage?: string;
  topic?: string;
}

interface RawImportedQuestion {
  question?: unknown;
  questionImage?: unknown;
  optionA?: unknown;
  optionB?: unknown;
  optionC?: unknown;
  optionD?: unknown;
  optionAImage?: unknown;
  optionBImage?: unknown;
  optionCImage?: unknown;
  optionDImage?: unknown;
  correctOption?: unknown;
  explanation?: unknown;
  explanationImages?: unknown;
  explanationImage?: unknown;
  topic?: unknown;
  [k: string]: unknown;
}

interface ValidationError {
  index: number;
  message: string;
}

interface JsonQuestionImportProps {
  onImport: (questions: EditorQuestion[]) => void;
  maxQuestions: number;
}

const LETTER_TO_INDEX: Record<string, number> = { A: 0, B: 1, C: 2, D: 3 };

const asStr = (v: unknown): string => (typeof v === "string" ? v : "");
const asOptionalStr = (v: unknown): string | undefined =>
  typeof v === "string" && v.trim().length > 0 ? v : undefined;

function normalizeQuestion(
  raw: RawImportedQuestion,
  index: number,
  errors: ValidationError[]
): EditorQuestion | null {
  const push = (message: string) => errors.push({ index: index + 1, message });

  const question = asStr(raw.question).trim();
  if (question.length < 1) push("`question` is required");

  const optionA = asStr(raw.optionA).trim();
  const optionB = asStr(raw.optionB).trim();
  const optionC = asStr(raw.optionC).trim();
  const optionD = asStr(raw.optionD).trim();
  if (!optionA) push("`optionA` is required");
  if (!optionB) push("`optionB` is required");
  if (!optionC) push("`optionC` is required");
  if (!optionD) push("`optionD` is required");

  const correctRaw = asStr(raw.correctOption).trim().toUpperCase();
  if (!(correctRaw in LETTER_TO_INDEX)) {
    push("`correctOption` must be A, B, C, or D");
  }

  if (errors.some((e) => e.index === index + 1)) return null;

  // Explanation image: accept string OR first entry of explanationImages[]
  let explanationImage: string | undefined = asOptionalStr(raw.explanationImage);
  if (!explanationImage && Array.isArray(raw.explanationImages)) {
    const first = raw.explanationImages.find(
      (v): v is string => typeof v === "string" && v.trim().length > 0
    );
    if (first) explanationImage = first;
  }

  return {
    question,
    options: [optionA, optionB, optionC, optionD],
    correctAnswer: LETTER_TO_INDEX[correctRaw],
    imageUrl: asOptionalStr(raw.questionImage),
    explanation: asStr(raw.explanation),
    explanationImage,
    topic: asStr(raw.topic),
  };
}

export const JsonQuestionImport = ({ onImport, maxQuestions }: JsonQuestionImportProps) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [parsed, setParsed] = useState<EditorQuestion[]>([]);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [fatalError, setFatalError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");

  const reset = () => {
    setParsed([]);
    setErrors([]);
    setFatalError(null);
    setFileName("");
  };

  const handleFile = async (file: File) => {
    reset();
    setFileName(file.name);
    let text: string;
    try {
      text = await file.text();
    } catch {
      setFatalError("Could not read file.");
      return;
    }
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch (e: any) {
      setFatalError(`Invalid JSON: ${e?.message || "malformed file"}`);
      return;
    }
    // Accept either an array or { questions: [...] }
    const arr: unknown = Array.isArray(json)
      ? json
      : (json && typeof json === "object" && Array.isArray((json as any).questions))
        ? (json as any).questions
        : null;
    if (!arr) {
      setFatalError("JSON must be an array of questions, or an object with a `questions` array.");
      return;
    }
    if (arr.length === 0) {
      setFatalError("The file contains 0 questions.");
      return;
    }

    const collectedErrors: ValidationError[] = [];
    const normalized: EditorQuestion[] = [];
    for (let i = 0; i < arr.length; i++) {
      const item = arr[i];
      if (!item || typeof item !== "object") {
        collectedErrors.push({ index: i + 1, message: "Not an object" });
        continue;
      }
      const q = normalizeQuestion(item as RawImportedQuestion, i, collectedErrors);
      if (q) normalized.push(q);
    }

    if (collectedErrors.length > 0) {
      setErrors(collectedErrors);
      setParsed([]);
      return;
    }
    setParsed(normalized);
  };

  const stats = {
    total: parsed.length,
    images: parsed.filter((q) => q.imageUrl || q.explanationImage).length,
    latex: parsed.filter(
      (q) =>
        /\$[^$]/.test(q.question) ||
        q.options.some((o) => /\$[^$]/.test(o)) ||
        /\$[^$]/.test(q.explanation || "")
    ).length,
  };

  const handleRemove = (idx: number) => {
    setParsed((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleApply = () => {
    if (parsed.length === 0) return;
    if (parsed.length > maxQuestions) {
      toast({
        title: "Too many questions",
        description: `Test needs exactly ${maxQuestions}. Your file has ${parsed.length}. Only the first ${maxQuestions} will be loaded.`,
      });
    }
    const toApply = parsed.slice(0, maxQuestions);
    onImport(toApply);
    toast({
      title: "Imported",
      description: `${toApply.length} question${toApply.length === 1 ? "" : "s"} loaded into the editor. Review and click Create Test to save.`,
    });
    setOpen(false);
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <FileJson className="w-4 h-4 mr-2" />
          Import JSON
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Import Questions from JSON</DialogTitle>
          <DialogDescription>
            Upload a JSON file to bulk-load questions into the editor. You can edit each question
            before saving the test. Nothing is written to the database until you click{" "}
            <span className="font-medium">Create Test</span>.
          </DialogDescription>
        </DialogHeader>

        {parsed.length === 0 && errors.length === 0 && !fatalError && (
          <div className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-4">
                Select a <code>.json</code> file
              </p>
              <Button
                type="button"
                onClick={() => {
                  const input = document.createElement("input");
                  input.type = "file";
                  input.accept = "application/json,.json";
                  input.onchange = (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (file) handleFile(file);
                  };
                  input.click();
                }}
              >
                <Upload className="w-4 h-4 mr-2" />
                Choose File
              </Button>
            </div>

            <details className="text-xs bg-muted/50 rounded-lg p-3">
              <summary className="cursor-pointer font-medium">Expected JSON format</summary>
              <pre className="mt-2 overflow-auto text-[11px] leading-tight">{`[
  {
    "question": "Current through a resistor is $I$. Find the power.",
    "questionImage": null,
    "optionA": "$I^2R$",
    "optionB": "$IR$",
    "optionC": "$V/R$",
    "optionD": "$V^2R$",
    "correctOption": "A",
    "explanation": "Using $$P = I^2R$$",
    "topic": "Ohm's Law"
  }
]`}</pre>
              <p className="mt-2 text-muted-foreground">
                Optional fields: <code>questionImage</code>, <code>explanation</code>,{" "}
                <code>explanationImage</code>, <code>topic</code>. Extra unknown fields are ignored.
              </p>
            </details>
          </div>
        )}

        {fatalError && (
          <Card className="p-4 border-destructive">
            <div className="flex gap-3 items-start">
              <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-destructive">Cannot import {fileName}</p>
                <p className="text-sm text-muted-foreground">{fatalError}</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={reset}
                >
                  Try Another File
                </Button>
              </div>
            </div>
          </Card>
        )}

        {errors.length > 0 && (
          <Card className="p-4 border-destructive">
            <div className="flex gap-3 items-start mb-3">
              <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-destructive">
                  {errors.length} validation error{errors.length === 1 ? "" : "s"} — nothing was imported
                </p>
                <p className="text-sm text-muted-foreground">
                  Fix the JSON file and upload again.
                </p>
              </div>
            </div>
            <ScrollArea className="max-h-52">
              <ul className="text-sm space-y-1 pr-2">
                {errors.slice(0, 100).map((e, i) => (
                  <li key={i}>
                    <span className="font-medium">Question {e.index}:</span>{" "}
                    <span className="text-muted-foreground">{e.message}</span>
                  </li>
                ))}
                {errors.length > 100 && (
                  <li className="text-muted-foreground italic">
                    …and {errors.length - 100} more
                  </li>
                )}
              </ul>
            </ScrollArea>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={reset}
            >
              Try Another File
            </Button>
          </Card>
        )}

        {parsed.length > 0 && (
          <div className="flex flex-col min-h-0 flex-1 space-y-3">
            <Card className="p-3 flex flex-wrap items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-success" />
              <Badge variant="secondary">{stats.total} Questions</Badge>
              <Badge variant="secondary">{stats.images} With Images</Badge>
              <Badge variant="secondary">{stats.latex} With LaTeX</Badge>
              {stats.total > maxQuestions && (
                <Badge variant="destructive">
                  Test uses {maxQuestions} — extras will be ignored
                </Badge>
              )}
              {stats.total < maxQuestions && (
                <Badge variant="outline">
                  Test needs {maxQuestions} — remaining slots stay empty for you to fill
                </Badge>
              )}
            </Card>

            <ScrollArea className="flex-1 min-h-[280px] border rounded-lg p-3">
              <div className="space-y-3">
                {parsed.map((q, i) => (
                  <div key={i} className="border rounded-lg p-3 bg-card">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="text-xs font-medium text-muted-foreground">
                        Question {i + 1}
                        {q.topic && <span className="ml-2">• {q.topic}</span>}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemove(i)}
                        aria-label={`Remove question ${i + 1}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                    <div className="text-sm mb-2">
                      <LatexRenderer content={q.question} />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs">
                      {q.options.map((opt, oi) => (
                        <div
                          key={oi}
                          className={`px-2 py-1 rounded ${
                            oi === q.correctAnswer
                              ? "bg-success/10 text-success-foreground border border-success/40"
                              : "bg-muted/50"
                          }`}
                        >
                          <span className="font-medium mr-1">
                            {String.fromCharCode(65 + oi)}.
                          </span>
                          <LatexRenderer content={opt} />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button type="button" variant="outline" onClick={reset}>
                Choose Different File
              </Button>
              <Button type="button" onClick={handleApply}>
                Load {Math.min(parsed.length, maxQuestions)} Questions into Editor
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
