import { useState } from "react";
import { Progress } from "@/components/ui/progress";
import { preGenerateTestImages, PreGenProgress } from "@/lib/preGenerateImages";
import { CheckCircle2, Loader2, ImageIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ImagePreGenModalProps {
  open: boolean;
  testId: string | null;
  questions: any[];
  onComplete: () => void;
}

/**
 * Modal that shows progress while pre-generating question/option images
 * after a test is created. Blocks the admin until generation is done.
 */
export const ImagePreGenModal = ({
  open,
  testId,
  questions,
  onComplete,
}: ImagePreGenModalProps) => {
  const [progress, setProgress] = useState<PreGenProgress>({
    current: 0,
    total: 1,
    phase: "questions",
  });
  const [isDone, setIsDone] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Start generation when modal opens
  const startGeneration = async () => {
    if (!testId || isRunning) return;
    setIsRunning(true);
    setIsDone(false);
    setError(null);

    try {
      await preGenerateTestImages(testId, questions, (p) => setProgress(p));
      setIsDone(true);
      // Auto-close after a short delay
      setTimeout(() => onComplete(), 1500);
    } catch (err: any) {
      console.error("Pre-generation failed:", err);
      setError(err.message || "Image generation failed");
      // Still complete - students will get fallback rendering
      setTimeout(() => onComplete(), 3000);
    }
  };

  // Trigger generation when component mounts with valid data
  if (open && testId && !isRunning && !isDone) {
    startGeneration();
  }

  const percent = Math.round((progress.current / Math.max(progress.total, 1)) * 100);

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isDone ? (
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            ) : (
              <ImageIcon className="w-5 h-5 text-primary" />
            )}
            {isDone ? "Images Generated!" : "Generating Question Images"}
          </DialogTitle>
          <DialogDescription>
            {isDone
              ? "All question images have been pre-generated. Students will see instant image loading."
              : error
              ? `Error: ${error}. Students will use fallback rendering.`
              : `Converting ${progress.phase === "questions" ? "questions" : "options"} to anti-copy images...`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Progress value={percent} className="h-3" />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>
              {isDone ? (
                <span className="text-green-600 font-medium">Complete</span>
              ) : (
                <>
                  <Loader2 className="w-3 h-3 inline animate-spin mr-1" />
                  Processing {progress.current} / {progress.total}
                </>
              )}
            </span>
            <span>{percent}%</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
