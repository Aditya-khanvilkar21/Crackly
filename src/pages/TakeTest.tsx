import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Timer, CheckCircle2, AlertCircle, Eye } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  subject?: 'physics' | 'chemistry' | 'mathematics';
}

interface Test {
  id: string;
  title: string;
  subject: string | null;
  chapter: string | null;
  duration_minutes: number;
  questions: Question[];
  test_type?: 'chapter_test' | 'mock_test';
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
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [showTabWarning, setShowTabWarning] = useState(false);
  const MAX_TAB_SWITCHES = 3;

  useEffect(() => {
    fetchTest();
  }, [testId]);

  // Tab switching detection for anti-cheating
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && selectedQuestions.length > 0) {
        setTabSwitchCount((prev) => {
          const newCount = prev + 1;
          
          if (newCount >= MAX_TAB_SWITCHES) {
            toast.error("Maximum tab switches exceeded! Test will be auto-submitted.");
            setTimeout(() => {
              handleAutoSubmit();
            }, 2000);
          } else {
            setShowTabWarning(true);
            toast.warning(`Warning ${newCount}/${MAX_TAB_SWITCHES}: Do not switch tabs during the test!`, {
              duration: 5000,
            });
            setTimeout(() => setShowTabWarning(false), 5000);
          }
          
          return newCount;
        });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [selectedQuestions]);

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
    try {
      // Use secure database function that strips correct answers
      const { data, error } = await supabase.rpc('get_test_for_taking', {
        test_id_param: testId
      });

      if (error) throw error;
      if (!data) {
        toast.error("Test not found or not available");
        navigate("/");
        return;
      }

      const testData = data as unknown as Test;
      setTest(testData);
      
      const isMockTest = testData.test_type === 'mock_test';
      
      if (isMockTest) {
        // For mock tests, use all 75 questions in order
        const allQuestions = testData.questions as Question[];
        setSelectedQuestions(allQuestions);
        setTimeLeft(testData.duration_minutes * 60);
      } else {
        // Select 25 random questions from the 40 available for chapter tests
        const allQuestions = testData.questions as Question[];
        const shuffled = [...allQuestions].sort(() => Math.random() - 0.5);
        setSelectedQuestions(shuffled.slice(0, 25));
        setTimeLeft(testData.duration_minutes * 60);
      }
    } catch (error) {
      console.error("Error fetching test:", error);
      toast.error("Failed to load test");
      navigate("/");
    }
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

  const isMockTest = test?.test_type === 'mock_test';
  const totalQuestions = isMockTest ? 75 : 25;
  const allQuestionsAttempted = Object.keys(answers).length === totalQuestions;

  if (!test || selectedQuestions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const currentQuestion = selectedQuestions[currentQuestionIndex];
  
  // Get subject for the current question in mock test
  const getCurrentSubject = () => {
    if (!isMockTest) return null;
    if (currentQuestionIndex < 25) return 'Physics';
    if (currentQuestionIndex < 50) return 'Chemistry';
    return 'Mathematics';
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header with Timer */}
      <header className="bg-card border-b border-border sticky top-0 z-50 shadow-elegant">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl font-bold">{test.title}</h1>
              <p className="text-sm text-muted-foreground">
                {isMockTest ? 'Full Syllabus Mock Test' : `${test.subject} - ${test.chapter}`}
              </p>
            </div>
            <div className="flex items-center gap-4">
              {tabSwitchCount > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive text-sm">
                  <Eye className="w-4 h-4" />
                  <span className="font-medium">Tab Switches: {tabSwitchCount}/{MAX_TAB_SWITCHES}</span>
                </div>
              )}
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

      {/* Tab Switch Warning */}
      {showTabWarning && (
        <div className="container mx-auto px-4 py-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Warning!</strong> Switching tabs is not allowed during the test. 
              {tabSwitchCount < MAX_TAB_SWITCHES && (
                <> You have {MAX_TAB_SWITCHES - tabSwitchCount} warning(s) remaining before auto-submission.</>
              )}
            </AlertDescription>
          </Alert>
        </div>
      )}

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Question Navigation Panel */}
          <Card className="p-6 lg:col-span-1 h-fit">
            <h3 className="font-semibold mb-4">Questions</h3>
            {isMockTest ? (
              <div className="space-y-4">
                {/* Physics Section */}
                <div>
                  <h4 className="text-xs font-semibold text-blue-600 mb-2">Physics (1-25)</h4>
                  <div className="grid grid-cols-5 gap-1">
                    {Array.from({ length: 25 }).map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentQuestionIndex(index)}
                        className={`w-8 h-8 text-xs rounded-lg font-medium transition-all ${
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
                </div>
                {/* Chemistry Section */}
                <div>
                  <h4 className="text-xs font-semibold text-green-600 mb-2">Chemistry (26-50)</h4>
                  <div className="grid grid-cols-5 gap-1">
                    {Array.from({ length: 25 }).map((_, i) => {
                      const index = i + 25;
                      return (
                        <button
                          key={index}
                          onClick={() => setCurrentQuestionIndex(index)}
                          className={`w-8 h-8 text-xs rounded-lg font-medium transition-all ${
                            currentQuestionIndex === index
                              ? "bg-primary text-primary-foreground"
                              : answers[index] !== undefined
                              ? "bg-green-500 text-white"
                              : "bg-muted hover:bg-muted/80"
                          }`}
                        >
                          {index + 1}
                        </button>
                      );
                    })}
                  </div>
                </div>
                {/* Mathematics Section */}
                <div>
                  <h4 className="text-xs font-semibold text-purple-600 mb-2">Mathematics (51-75)</h4>
                  <div className="grid grid-cols-5 gap-1">
                    {Array.from({ length: 25 }).map((_, i) => {
                      const index = i + 50;
                      return (
                        <button
                          key={index}
                          onClick={() => setCurrentQuestionIndex(index)}
                          className={`w-8 h-8 text-xs rounded-lg font-medium transition-all ${
                            currentQuestionIndex === index
                              ? "bg-primary text-primary-foreground"
                              : answers[index] !== undefined
                              ? "bg-green-500 text-white"
                              : "bg-muted hover:bg-muted/80"
                          }`}
                        >
                          {index + 1}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
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
            )}
            <div className="mt-6 space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span>Answered: {Object.keys(answers).length}</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-muted-foreground" />
                <span>Not Answered: {totalQuestions - Object.keys(answers).length}</span>
              </div>
            </div>
          </Card>

          {/* Question Display */}
          <div className="lg:col-span-3">
            <Card className="p-8">
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-4">
                  {isMockTest && (
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      getCurrentSubject() === 'Physics' 
                        ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400'
                        : getCurrentSubject() === 'Chemistry'
                        ? 'bg-green-500/10 text-green-700 dark:text-green-400'
                        : 'bg-purple-500/10 text-purple-700 dark:text-purple-400'
                    }`}>
                      {getCurrentSubject()}
                    </span>
                  )}
                  <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
                    Question {currentQuestionIndex + 1} of {totalQuestions}
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
                    setCurrentQuestionIndex((prev) => Math.min(totalQuestions - 1, prev + 1))
                  }
                  disabled={currentQuestionIndex === totalQuestions - 1}
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
                  You have answered {Object.keys(answers).length} out of {totalQuestions} questions.{" "}
                  <span className="text-destructive font-medium">
                    {totalQuestions - Object.keys(answers).length} questions are unanswered.
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
