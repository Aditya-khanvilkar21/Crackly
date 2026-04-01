import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Timer, CheckCircle2, AlertCircle, Eye } from "lucide-react";
import { LatexRenderer } from "@/components/LatexRenderer";
import { QuestionImageRenderer, OptionImageRenderer } from "@/components/QuestionImageRenderer";
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
  questionImageUrl?: string;
  optionImageUrls?: string[];
  subject?: 'physics' | 'chemistry' | 'mathematics' | 'biology';
  marksPerQuestion?: number;
}

interface Test {
  id: string;
  title: string;
  subject: string | null;
  chapter: string | null;
  duration_minutes: number;
  questions: Question[];
  test_type?: 'chapter_test' | 'mock_test';
  exam_type?: 'JEE' | 'NEET' | 'CET';
  negative_marking?: number;
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
  const [showMarkingScheme, setShowMarkingScheme] = useState(true);
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

  // Anti-cheating: disable copy, paste, cut, right-click, and keyboard shortcuts
  useEffect(() => {
    const prevent = (e: Event) => e.preventDefault();
    const events: string[] = ["copy", "paste", "cut", "contextmenu"];
    events.forEach((evt) => document.addEventListener(evt, prevent));

    // Block keyboard shortcuts: Ctrl+C, Ctrl+V, Ctrl+U, Ctrl+Shift+I, F12, PrintScreen
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey && (e.key === "c" || e.key === "v" || e.key === "u" || e.key === "a" || e.key === "s" || e.key === "p")) ||
        (e.ctrlKey && e.shiftKey && (e.key === "I" || e.key === "i" || e.key === "J" || e.key === "j" || e.key === "C" || e.key === "c")) ||
        e.key === "F12" ||
        e.key === "PrintScreen"
      ) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    document.addEventListener("keydown", handleKeyDown, true);

    return () => {
      events.forEach((evt) => document.removeEventListener(evt, prevent));
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, []);

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
      
      // Fix options: ensure each question's options is a proper string array
      const fixedQuestions = testData.questions.map(q => ({
        ...q,
        options: Array.isArray(q.options) 
          ? q.options.map(o => typeof o === 'string' ? o : String(o))
          : typeof q.options === 'string'
            ? JSON.parse(q.options as unknown as string)
            : ['', '', '', '']
      }));
      testData.questions = fixedQuestions;
      
      setTest(testData);
      
      const isMockTest = testData.test_type === 'mock_test';
      
      if (isMockTest) {
        setSelectedQuestions(fixedQuestions);
      } else {
        // Shuffle all questions for chapter tests (no random selection, show all)
        const shuffled = [...fixedQuestions].sort(() => Math.random() - 0.5);
        setSelectedQuestions(shuffled);
      }
      setTimeLeft(testData.duration_minutes * 60);
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
  const totalQuestions = selectedQuestions.length;
  const allQuestionsAttempted = Object.keys(answers).length === totalQuestions;

  // Calculate marking scheme details
  const getMarkingScheme = () => {
    if (!test) return null;
    
    const negativeMarking = test.negative_marking || 0;
    const examType = test.exam_type || 'JEE';
    const isCET = test.title?.includes('[CET-');
    const isPCM = test.title?.includes('[CET-PCM]');
    const isPCB = test.title?.includes('[CET-PCB]');
    
    if (test.test_type === 'chapter_test') {
      const totalQ = selectedQuestions.length || test.questions?.length || 45;
      return {
        title: 'Chapter Test Marking Scheme',
        totalQuestions: totalQ,
        totalMarks: totalQ,
        marksPerQuestion: 1,
        negativeMarking: 0,
        subjects: [{ name: test.subject || 'Subject', questions: totalQ, marksPerQ: 1 }]
      };
    }
    
    if (examType === 'NEET' || test.chapter === 'NEET') {
      return {
        title: 'NEET Mock Test Marking Scheme',
        totalQuestions: 180,
        totalMarks: 720,
        marksPerQuestion: 4,
        negativeMarking: negativeMarking,
        subjects: [
          { name: 'Physics', questions: 45, marksPerQ: 4 },
          { name: 'Chemistry', questions: 45, marksPerQ: 4 },
          { name: 'Biology', questions: 90, marksPerQ: 4 }
        ]
      };
    }
    
    if (isCET && isPCM) {
      return {
        title: 'CET PCM Mock Test Marking Scheme',
        totalQuestions: 150,
        totalMarks: 200,
        negativeMarking: negativeMarking,
        subjects: [
          { name: 'Physics', questions: 50, marksPerQ: 1 },
          { name: 'Chemistry', questions: 50, marksPerQ: 1 },
          { name: 'Mathematics', questions: 50, marksPerQ: 2 }
        ]
      };
    }
    
    if (isCET && isPCB) {
      return {
        title: 'CET PCB Mock Test Marking Scheme',
        totalQuestions: 200,
        totalMarks: 200,
        negativeMarking: negativeMarking,
        subjects: [
          { name: 'Physics', questions: 50, marksPerQ: 1 },
          { name: 'Chemistry', questions: 50, marksPerQ: 1 },
          { name: 'Biology', questions: 100, marksPerQ: 1 }
        ]
      };
    }
    
    // JEE default
    return {
      title: 'JEE Mock Test Marking Scheme',
      totalQuestions: 75,
      totalMarks: 300,
      marksPerQuestion: 4,
      negativeMarking: negativeMarking,
      subjects: [
        { name: 'Physics', questions: 25, marksPerQ: 4 },
        { name: 'Chemistry', questions: 25, marksPerQ: 4 },
        { name: 'Mathematics', questions: 25, marksPerQ: 4 }
      ]
    };
  };

  const markingScheme = getMarkingScheme();

  // Show marking scheme before test starts
  if (showMarkingScheme && test && markingScheme) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full p-8">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold mb-2">{test.title}</h1>
            <p className="text-muted-foreground">Please review the marking scheme before starting</p>
          </div>
          
          <div className="bg-primary/5 rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">{markingScheme.title}</h2>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-background rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-primary">{markingScheme.totalQuestions}</div>
                <div className="text-sm text-muted-foreground">Total Questions</div>
              </div>
              <div className="bg-background rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-primary">{markingScheme.totalMarks}</div>
                <div className="text-sm text-muted-foreground">Total Marks</div>
              </div>
              <div className="bg-background rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-primary">{test.duration_minutes} min</div>
                <div className="text-sm text-muted-foreground">Duration</div>
              </div>
              <div className="bg-background rounded-lg p-3 text-center">
                <div className={`text-2xl font-bold ${markingScheme.negativeMarking > 0 ? 'text-destructive' : 'text-green-600'}`}>
                  {markingScheme.negativeMarking > 0 ? `-${markingScheme.negativeMarking}` : 'None'}
                </div>
                <div className="text-sm text-muted-foreground">Negative Marking</div>
              </div>
            </div>
            
            <div className="space-y-2">
              <h3 className="font-medium">Subject-wise Distribution:</h3>
              {markingScheme.subjects.map((subject, idx) => (
                <div key={idx} className="flex justify-between items-center bg-background rounded px-3 py-2">
                  <span className="font-medium">{subject.name}</span>
                  <span className="text-sm text-muted-foreground">
                    {subject.questions} Q × {subject.marksPerQ} mark{subject.marksPerQ > 1 ? 's' : ''} = {subject.questions * subject.marksPerQ} marks
                  </span>
                </div>
              ))}
            </div>
            
            {markingScheme.negativeMarking > 0 && (
              <div className="mt-4 p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                <p className="text-sm text-destructive font-medium">
                  ⚠️ Negative Marking: -{markingScheme.negativeMarking} marks will be deducted for each wrong answer
                </p>
              </div>
            )}
          </div>
          
          <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-amber-800 dark:text-amber-200 mb-2">Important Instructions:</h3>
            <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
              <li>• Do not switch tabs during the test (max {MAX_TAB_SWITCHES} warnings)</li>
              <li>• Test will auto-submit when time runs out</li>
              <li>• All questions must be answered for chapter tests</li>
              <li>• Your answers are automatically saved</li>
            </ul>
          </div>
          
          <Button onClick={() => setShowMarkingScheme(false)} className="w-full" size="lg">
            Start Test
          </Button>
        </Card>
      </div>
    );
  }

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
    const q = currentQuestion as Question;
    if (q.subject) {
      return q.subject.charAt(0).toUpperCase() + q.subject.slice(1);
    }
    // Fallback for legacy tests
    if (currentQuestionIndex < 25) return 'Physics';
    if (currentQuestionIndex < 50) return 'Chemistry';
    return 'Mathematics';
  };

  // Get marks for current question
  const getCurrentQuestionMarks = () => {
    const q = currentQuestion as Question;
    return q.marksPerQuestion || markingScheme?.marksPerQuestion || 1;
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
              {/* For chapter tests, only show submit button if all questions are attempted */}
              {(isMockTest || allQuestionsAttempted) ? (
                <Button
                  onClick={() => setShowSubmitDialog(true)}
                  disabled={isSubmitting}
                  variant={allQuestionsAttempted ? "default" : "outline"}
                >
                  Submit Test
                </Button>
              ) : (
                <div className="text-sm text-muted-foreground px-4 py-2 bg-muted rounded-lg">
                  Answer all {totalQuestions} questions to submit
                </div>
              )}
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
                    ({getCurrentQuestionMarks()} mark{getCurrentQuestionMarks() > 1 ? 's' : ''})
                  </span>
                  {markingScheme?.negativeMarking && markingScheme.negativeMarking > 0 && (
                    <span className="text-xs text-destructive">
                      (-{markingScheme.negativeMarking} for wrong)
                    </span>
                  )}
                </div>
                <h2 className="text-xl font-semibold leading-relaxed">
                  {currentQuestion.questionImageUrl ? (
                    <img
                      src={currentQuestion.questionImageUrl}
                      alt=""
                      draggable={false}
                      onContextMenu={(e) => e.preventDefault()}
                      onDragStart={(e) => e.preventDefault()}
                      className="max-w-full h-auto rounded"
                      style={{ userSelect: "none", WebkitUserSelect: "none", pointerEvents: "none" }}
                    />
                  ) : (
                    <QuestionImageRenderer
                      questionId={`${testId}-q${currentQuestionIndex}`}
                      content={currentQuestion.question}
                    />
                  )}
                </h2>
              </div>

              {/* Question Image */}
              {currentQuestion.imageUrl && (
                <div className="mb-6 p-4 bg-muted/50 rounded-lg">
                  <img 
                    src={currentQuestion.imageUrl} 
                    alt=""
                    draggable={false}
                    onContextMenu={(e) => e.preventDefault()}
                    className="max-h-96 mx-auto rounded-lg"
                    style={{ userSelect: "none", pointerEvents: "none" }}
                  />
                </div>
              )}

              <div className="space-y-4">
                {currentQuestion.options.map((option, index) => (
                  <div
                    key={index}
                    onClick={() => handleAnswerSelect(currentQuestionIndex, index)}
                    className={`flex items-center p-4 rounded-lg border-2 transition-all cursor-pointer ${
                      answers[currentQuestionIndex] === index
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50 hover:bg-muted/50"
                    }`}
                  >
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 font-semibold text-sm ${
                      answers[currentQuestionIndex] === index
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}>
                      {String.fromCharCode(65 + index)}
                    </span>
                    <span className="flex-1 text-base">
                      {currentQuestion.optionImageUrls?.[index] ? (
                        <img
                          src={currentQuestion.optionImageUrls[index]}
                          alt=""
                          draggable={false}
                          onContextMenu={(e) => e.preventDefault()}
                          onDragStart={(e) => e.preventDefault()}
                          className="inline-block h-auto max-h-10"
                          style={{ userSelect: "none", WebkitUserSelect: "none", pointerEvents: "none" }}
                        />
                      ) : (
                        <OptionImageRenderer
                          questionId={`${testId}-q${currentQuestionIndex}-opt${index}`}
                          content={option}
                        />
                      )}
                    </span>
                    {answers[currentQuestionIndex] === index && (
                      <CheckCircle2 className="w-5 h-5 text-primary ml-2" />
                    )}
                  </div>
                ))}
              </div>

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
