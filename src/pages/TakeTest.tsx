import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Timer, CheckCircle2, AlertCircle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Question {
  question: string;
  options: string[];
  imageUrl?: string;
}

interface Test {
  id: string;
  title: string;
  subject: string;
  chapter: string;
  duration_minutes: number;
  questions: Question[];
}

export default function TakeTest() {
  const { testId } = useParams();
  const navigate = useNavigate();
  
  const [test, setTest] = useState<Test | null>(null);
  const [selectedQuestions, setSelectedQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [timeLeft, setTimeLeft] = useState(1800); // 30 minutes in seconds
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchTest();
  }, [testId]);

  useEffect(() => {
    if (selectedQuestions.length > 0 && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleAutoSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [selectedQuestions, timeLeft]);

  const fetchTest = async () => {
    const { data, error } = await supabase
      .from("tests")
      .select("*")
      .eq("id", testId)
      .single();

    if (error) {
      toast.error("Failed to load test");
      navigate("/dashboard");
      return;
    }

    setTest(data as unknown as Test);
    
    // Select 25 random questions from the 40 available
    const allQuestions = data.questions as unknown as Question[];
    const shuffled = [...allQuestions].sort(() => Math.random() - 0.5);
    setSelectedQuestions(shuffled.slice(0, 25));
  };

  const handleAutoSubmit = async () => {
    toast.info("Time's up! Submitting test automatically...");
    await submitTest();
  };

  const submitTest = async () => {
    if (!test || !selectedQuestions) return;

    setIsSubmitting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const timeInSeconds = test.duration_minutes * 60 - timeLeft;

      // Submit to secure edge function
      const { data, error } = await supabase.functions.invoke('submit-test', {
        body: {
          testId,
          answers,
          timeInSeconds,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || "Submission failed");

      toast.success("Test submitted successfully!");
      navigate(`/test-result/${testId}`);
    } catch (error) {
      toast.error("Failed to submit test. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAnswerSelect = (questionIndex: number, optionIndex: number) => {
    setAnswers((prev) => ({
      ...prev,
      [questionIndex]: optionIndex,
    }));
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const allQuestionsAttempted = Object.keys(answers).length === 25;

  if (!test || selectedQuestions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const currentQuestion = selectedQuestions[currentQuestionIndex];

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header with Timer */}
      <header className="bg-card border-b border-border sticky top-0 z-50 shadow-elegant">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl font-bold">{test.title}</h1>
              <p className="text-sm text-muted-foreground">
                {test.subject} - {test.chapter}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                timeLeft < 300 ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
              }`}>
                <Timer className="w-5 h-5" />
                <span className="text-lg font-mono font-bold">{formatTime(timeLeft)}</span>
              </div>
              <Button
                onClick={() => setShowSubmitDialog(true)}
                disabled={isSubmitting}
                variant={allQuestionsAttempted ? "default" : "outline"}
              >
                Submit Test
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Question Navigation Panel */}
          <Card className="p-6 lg:col-span-1 h-fit">
            <h3 className="font-semibold mb-4">Questions</h3>
            <div className="grid grid-cols-5 gap-2">
              {selectedQuestions.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentQuestionIndex(index)}
                  className={`w-10 h-10 rounded-lg font-medium transition-all ${
                    currentQuestionIndex === index
                      ? "bg-primary text-primary-foreground"
                      : answers[index] !== undefined
                      ? "bg-green-500 text-white"
                      : "bg-muted hover:bg-muted/80"
                  }`}
                >
                  {index + 1}
                </button>
              ))}
            </div>
            <div className="mt-6 space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span>Answered: {Object.keys(answers).length}</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-muted-foreground" />
                <span>Not Answered: {25 - Object.keys(answers).length}</span>
              </div>
            </div>
          </Card>

          {/* Question Display */}
          <div className="lg:col-span-3">
            <Card className="p-8">
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
                    Question {currentQuestionIndex + 1} of 25
                  </span>
                  <span className="text-sm text-muted-foreground">
                    (1 mark)
                  </span>
                </div>
                <h2 className="text-xl font-semibold leading-relaxed">
                  {currentQuestion.question}
                </h2>
              </div>

              {/* Question Image */}
              {currentQuestion.imageUrl && (
                <div className="mb-6 p-4 bg-muted/50 rounded-lg">
                  <img 
                    src={currentQuestion.imageUrl} 
                    alt="Question diagram"
                    className="max-h-96 mx-auto rounded-lg"
                  />
                </div>
              )}

              <RadioGroup
                value={answers[currentQuestionIndex]?.toString()}
                onValueChange={(value) =>
                  handleAnswerSelect(currentQuestionIndex, parseInt(value))
                }
                className="space-y-4"
              >
                {currentQuestion.options.map((option, index) => (
                  <div
                    key={index}
                    className={`flex items-center space-x-3 p-4 rounded-lg border-2 transition-all cursor-pointer ${
                      answers[currentQuestionIndex] === index
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <RadioGroupItem value={index.toString()} id={`option-${index}`} />
                    <Label
                      htmlFor={`option-${index}`}
                      className="flex-1 cursor-pointer text-base"
                    >
                      <span className="font-medium mr-2">
                        {String.fromCharCode(97 + index)})
                      </span>
                      {option}
                    </Label>
                  </div>
                ))}
              </RadioGroup>

              <div className="flex justify-between mt-8">
                <Button
                  onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
                  disabled={currentQuestionIndex === 0}
                  variant="outline"
                >
                  Previous
                </Button>
                <Button
                  onClick={() =>
                    setCurrentQuestionIndex((prev) => Math.min(24, prev + 1))
                  }
                  disabled={currentQuestionIndex === 24}
                >
                  Next
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Submit Confirmation Dialog */}
      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit Test?</AlertDialogTitle>
            <AlertDialogDescription>
              {allQuestionsAttempted ? (
                "You have answered all questions. Are you sure you want to submit?"
              ) : (
                <>
                  You have answered {Object.keys(answers).length} out of 25 questions.{" "}
                  <span className="text-destructive font-medium">
                    {25 - Object.keys(answers).length} questions are unanswered.
                  </span>{" "}
                  Are you sure you want to submit?
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={submitTest} disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
