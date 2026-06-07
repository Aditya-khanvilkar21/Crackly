import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Timer, Eye, ChevronLeft, ChevronRight, PanelRightClose, PanelRightOpen, CheckCircle2, Loader2, CloudOff } from "lucide-react";
import { LatexRenderer } from "@/components/LatexRenderer";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
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

type QuestionStatus = 'not-visited' | 'not-answered' | 'answered' | 'marked' | 'answered-marked';

export default function TakeTest() {
  const { testId } = useParams();
  const navigate = useNavigate();
  
  const [test, setTest] = useState<Test | null>(null);
  const [selectedQuestions, setSelectedQuestions] = useState<Question[]>([]);
  const [originalIndexMap, setOriginalIndexMap] = useState<number[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [markedForReview, setMarkedForReview] = useState<Set<number>>(new Set());
  const [visitedQuestions, setVisitedQuestions] = useState<Set<number>>(new Set([0]));
  const [timeLeft, setTimeLeft] = useState(1800);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showMarkingScheme, setShowMarkingScheme] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [showTabWarning, setShowTabWarning] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(true);
  const [activeSubjectTab, setActiveSubjectTab] = useState<string>('all');
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initializedRef = useRef(false);
  const attemptIdRef = useRef<string | null>(null);
  const submittedRef = useRef(false);
  const MAX_TAB_SWITCHES = 3;

  // Detect exam type
  const examType = useMemo(() => {
    if (!test) return 'JEE';
    if (test.exam_type === 'CET' || test.title?.includes('[CET-')) return 'CET';
    if (test.exam_type === 'NEET') return 'NEET';
    return test.exam_type || 'JEE';
  }, [test]);

  const isMockTest = test?.test_type === 'mock_test';
  const isCET = examType === 'CET';
  const isNEET = examType === 'NEET';
  const isJEE = examType === 'JEE';
  const isPCB = test?.title?.includes('[CET-PCB]');

  // Build subject sections from actual questions
  const subjectSections = useMemo(() => {
    if (!isMockTest || selectedQuestions.length === 0) return [];
    
    const sections: { name: string; startIndex: number; count: number; color: string }[] = [];
    let currentSubject = '';
    let startIndex = 0;
    
    const subjectColors: Record<string, string> = {
      physics: '#3B82F6',
      chemistry: '#10B981',
      mathematics: '#8B5CF6',
      biology: '#F59E0B',
      botany: '#22C55E',
      zoology: '#EF4444',
    };

    selectedQuestions.forEach((q, i) => {
      let subject = q.subject || 'unknown';
      // For NEET, split biology into botany/zoology
      if (isNEET && subject === 'biology') {
        // First 45 biology = botany, next 45 = zoology (convention)
        const bioQuestions = selectedQuestions.filter(qq => qq.subject === 'biology');
        const bioIndex = bioQuestions.indexOf(q);
        subject = bioIndex < 45 ? 'botany' : 'zoology';
      }
      
      if (subject !== currentSubject) {
        if (currentSubject) {
          sections[sections.length - 1].count = i - startIndex;
        }
        currentSubject = subject;
        startIndex = i;
        sections.push({
          name: subject.charAt(0).toUpperCase() + subject.slice(1),
          startIndex: i,
          count: 0,
          color: subjectColors[subject] || '#6B7280',
        });
      }
    });
    if (sections.length > 0) {
      sections[sections.length - 1].count = selectedQuestions.length - sections[sections.length - 1].startIndex;
    }
    
    return sections;
  }, [selectedQuestions, isMockTest, isNEET]);

  // CET tabs
  const cetTabs = useMemo(() => {
    if (!isCET || !isMockTest) return [];
    if (isPCB) {
      return [
        { label: 'Physics + Chemistry', subjects: ['Physics', 'Chemistry'] },
        { label: 'Biology', subjects: ['Biology'] },
      ];
    }
    return [
      { label: 'Physics + Chemistry', subjects: ['Physics', 'Chemistry'] },
      { label: 'Mathematics', subjects: ['Mathematics'] },
    ];
  }, [isCET, isMockTest, isPCB]);

  // JEE tabs
  const jeeTabs = useMemo(() => {
    if (!isJEE || !isMockTest) return [];
    return [
      { label: 'Physics', subjects: ['Physics'] },
      { label: 'Chemistry', subjects: ['Chemistry'] },
      { label: 'Mathematics', subjects: ['Mathematics'] },
    ];
  }, [isJEE, isMockTest]);

  // NEET filter buttons
  const neetFilters = useMemo(() => {
    if (!isNEET || !isMockTest) return [];
    return ['All', 'Physics', 'Chemistry', 'Botany', 'Zoology'];
  }, [isNEET, isMockTest]);

  // Get question status
  const getQuestionStatus = useCallback((index: number): QuestionStatus => {
    const isAnswered = answers[index] !== undefined;
    const isMarked = markedForReview.has(index);
    const isVisited = visitedQuestions.has(index);
    
    if (isAnswered && isMarked) return 'answered-marked';
    if (isMarked) return 'marked';
    if (isAnswered) return 'answered';
    if (isVisited) return 'not-answered';
    return 'not-visited';
  }, [answers, markedForReview, visitedQuestions]);

  // Status colors matching official CBT
  const getStatusStyle = (status: QuestionStatus, isCurrent: boolean) => {
    if (isCurrent) return 'ring-2 ring-offset-1 ring-blue-500';
    switch (status) {
      case 'not-visited': return 'bg-gray-300 text-gray-700 dark:bg-gray-600 dark:text-gray-200';
      case 'not-answered': return 'bg-red-500 text-white';
      case 'answered': return 'bg-green-500 text-white';
      case 'marked': return 'bg-purple-500 text-white';
      case 'answered-marked': return 'bg-purple-500 text-white';
    }
  };

  // Get filtered question indices for the palette based on active tab/filter
  const filteredPaletteIndices = useMemo(() => {
    if (!isMockTest) {
      return selectedQuestions.map((_, i) => i);
    }

    if (isNEET) {
      if (activeSubjectTab === 'all' || activeSubjectTab === 'All') {
        return selectedQuestions.map((_, i) => i);
      }
      return selectedQuestions.map((q, i) => {
        let subject = q.subject || '';
        if (subject === 'biology') {
          const bioQuestions = selectedQuestions.filter(qq => qq.subject === 'biology');
          const bioIndex = bioQuestions.indexOf(q);
          subject = bioIndex < 45 ? 'botany' : 'zoology';
        }
        return subject.toLowerCase() === activeSubjectTab.toLowerCase() ? i : -1;
      }).filter(i => i !== -1);
    }

    // For CET and JEE, use tab-based filtering
    const tabs = isCET ? cetTabs : jeeTabs;
    const tabIndex = parseInt(activeSubjectTab) || 0;
    const activeTab = tabs[tabIndex];
    if (!activeTab) return selectedQuestions.map((_, i) => i);

    return selectedQuestions.map((q, i) => {
      const qSubject = (q.subject || '').charAt(0).toUpperCase() + (q.subject || '').slice(1);
      return activeTab.subjects.includes(qSubject) ? i : -1;
    }).filter(i => i !== -1);
  }, [selectedQuestions, isMockTest, isNEET, isCET, activeSubjectTab, cetTabs, jeeTabs]);

  // Navigate to question and mark as visited
  const navigateToQuestion = (index: number) => {
    setCurrentQuestionIndex(index);
    setVisitedQuestions(prev => new Set(prev).add(index));
  };

  // Save & Next
  const handleSaveAndNext = () => {
    // Answer is already saved via handleAnswerSelect
    if (currentQuestionIndex < selectedQuestions.length - 1) {
      navigateToQuestion(currentQuestionIndex + 1);
    }
  };

  // Mark for Review & Next
  const handleMarkForReview = () => {
    setMarkedForReview(prev => {
      const next = new Set(prev);
      next.add(currentQuestionIndex);
      return next;
    });
    if (currentQuestionIndex < selectedQuestions.length - 1) {
      navigateToQuestion(currentQuestionIndex + 1);
    }
  };

  // Clear Response
  const handleClearResponse = () => {
    setAnswers(prev => {
      const next = { ...prev };
      delete next[currentQuestionIndex];
      return next;
    });
    // Also remove mark if set
    setMarkedForReview(prev => {
      const next = new Set(prev);
      next.delete(currentQuestionIndex);
      return next;
    });
  };

  useEffect(() => {
    fetchTest();
  }, [testId]);

  // Tab switching detection
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && selectedQuestions.length > 0) {
        setTabSwitchCount((prev) => {
          const newCount = prev + 1;
          if (newCount >= MAX_TAB_SWITCHES) {
            toast.error("Maximum tab switches exceeded! Test will be auto-submitted.");
            setTimeout(() => handleAutoSubmit(), 2000);
          } else {
            setShowTabWarning(true);
            toast.warning(`Warning ${newCount}/${MAX_TAB_SWITCHES}: Do not switch tabs!`, { duration: 5000 });
            setTimeout(() => setShowTabWarning(false), 5000);
          }
          return newCount;
        });
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [selectedQuestions]);

  // Anti-cheating
  useEffect(() => {
    const prevent = (e: Event) => e.preventDefault();
    const events = ["copy", "paste", "cut", "contextmenu"];
    events.forEach((evt) => document.addEventListener(evt, prevent));
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey && ["c","v","u","a","s","p"].includes(e.key.toLowerCase())) ||
        (e.ctrlKey && e.shiftKey && ["i","j","c"].includes(e.key.toLowerCase())) ||
        e.key === "F12" || e.key === "PrintScreen"
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

  // Timer
  useEffect(() => {
    if (selectedQuestions.length > 0 && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) { handleAutoSubmit(); return 0; }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [selectedQuestions, timeLeft]);

  const fetchTest = async () => {
    try {
      const { data, error } = await supabase.rpc('get_test_for_taking', { test_id_param: testId });
      if (error) throw error;
      if (!data) { toast.error("Test not found"); navigate("/"); return; }

      const testData = data as unknown as Test;
      const fixedQuestions = testData.questions.map(q => ({
        ...q,
        options: Array.isArray(q.options) 
          ? q.options.map(o => typeof o === 'string' ? o : String(o))
          : typeof q.options === 'string' ? JSON.parse(q.options as unknown as string) : ['', '', '', '']
      }));
      testData.questions = fixedQuestions;
      setTest(testData);
      
      if (testData.test_type === 'mock_test') {
        setSelectedQuestions(fixedQuestions);
        setOriginalIndexMap(fixedQuestions.map((_, i) => i));
      } else {
        // Shuffle but track original indices
        const indexed = fixedQuestions.map((q, i) => ({ q, origIdx: i }));
        indexed.sort(() => Math.random() - 0.5);
        setSelectedQuestions(indexed.map(item => item.q));
        setOriginalIndexMap(indexed.map(item => item.origIdx));
      }
      setTimeLeft(testData.duration_minutes * 60);
      setVisitedQuestions(new Set([0]));
      
      // Set default active tab
      if (testData.exam_type === 'NEET') {
        setActiveSubjectTab('All');
      } else {
        setActiveSubjectTab('0');
      }
    } catch (error) {
      console.error("Error fetching test:", error);
      toast.error("Failed to load test");
      navigate("/");
    }
  };

  const handleAutoSubmit = async () => {
    toast.info("Time's up! Submitting...");
    await submitTest();
  };

  const submitTest = async () => {
    if (!test || !selectedQuestions) return;
    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");
      const timeInSeconds = test.duration_minutes * 60 - timeLeft;
      
      // Map shuffled indices back to original question indices
      const mappedAnswers: Record<number, number> = {};
      for (const [shuffledIdx, optionIdx] of Object.entries(answers)) {
        const originalIdx = originalIndexMap[parseInt(shuffledIdx)];
        mappedAnswers[originalIdx] = optionIdx as number;
      }
      
      const { data, error } = await supabase.functions.invoke('submit-test', {
        body: { testId, answers: mappedAnswers, timeInSeconds },
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

  const handleAnswerSelect = (optionIndex: number) => {
    setAnswers((prev) => ({ ...prev, [currentQuestionIndex]: optionIndex }));
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const totalQuestions = selectedQuestions.length;
  const allQuestionsAttempted = Object.keys(answers).length === totalQuestions;

  const getMarkingScheme = () => {
    if (!test) return null;
    const negativeMarking = test.negative_marking || 0;
    const isCETTest = test.title?.includes('[CET-');
    const isPCMTest = test.title?.includes('[CET-PCM]');
    const isPCBTest = test.title?.includes('[CET-PCB]');
    
    if (test.test_type === 'chapter_test') {
      const totalQ = selectedQuestions.length || test.questions?.length || 45;
      return { title: 'Chapter Test', totalQuestions: totalQ, totalMarks: totalQ, negativeMarking: 0,
        subjects: [{ name: test.subject || 'Subject', questions: totalQ, marksPerQ: 1 }] };
    }
    if (examType === 'NEET') {
      return { title: 'NEET Mock Test', totalQuestions: 180, totalMarks: 720, marksPerQuestion: 4, negativeMarking,
        subjects: [
          { name: 'Physics', questions: 45, marksPerQ: 4 },
          { name: 'Chemistry', questions: 45, marksPerQ: 4 },
          { name: 'Biology', questions: 90, marksPerQ: 4 }
        ] };
    }
    if (isCETTest && isPCMTest) {
      return { title: 'CET PCM Mock Test', totalQuestions: 150, totalMarks: 200, negativeMarking,
        subjects: [
          { name: 'Physics', questions: 50, marksPerQ: 1 },
          { name: 'Chemistry', questions: 50, marksPerQ: 1 },
          { name: 'Mathematics', questions: 50, marksPerQ: 2 }
        ] };
    }
    if (isCETTest && isPCBTest) {
      return { title: 'CET PCB Mock Test', totalQuestions: 200, totalMarks: 200, negativeMarking,
        subjects: [
          { name: 'Physics', questions: 50, marksPerQ: 1 },
          { name: 'Chemistry', questions: 50, marksPerQ: 1 },
          { name: 'Biology', questions: 100, marksPerQ: 1 }
        ] };
    }
    return { title: 'JEE Mock Test', totalQuestions: 75, totalMarks: 300, marksPerQuestion: 4, negativeMarking,
      subjects: [
        { name: 'Physics', questions: 25, marksPerQ: 4 },
        { name: 'Chemistry', questions: 25, marksPerQ: 4 },
        { name: 'Mathematics', questions: 25, marksPerQ: 4 }
      ] };
  };

  const markingScheme = getMarkingScheme();

  // Get current question marks
  const getCurrentQuestionMarks = () => {
    const q = selectedQuestions[currentQuestionIndex];
    return q?.marksPerQuestion || markingScheme?.marksPerQuestion || 1;
  };

  // Get subject label for current question
  const getCurrentSubject = () => {
    if (!isMockTest) return test?.subject || '';
    const q = selectedQuestions[currentQuestionIndex];
    if (!q?.subject) return '';
    let s = q.subject.charAt(0).toUpperCase() + q.subject.slice(1);
    if (isNEET && q.subject === 'biology') {
      const bioQuestions = selectedQuestions.filter(qq => qq.subject === 'biology');
      const bioIdx = bioQuestions.indexOf(q);
      s = bioIdx < 45 ? 'Botany' : 'Zoology';
    }
    return s;
  };

  // Status counts
  const statusCounts = useMemo(() => {
    const counts = { 'not-visited': 0, 'not-answered': 0, 'answered': 0, 'marked': 0, 'answered-marked': 0 };
    for (let i = 0; i < totalQuestions; i++) {
      counts[getQuestionStatus(i)]++;
    }
    return counts;
  }, [totalQuestions, getQuestionStatus]);

  // ======= MARKING SCHEME SCREEN =======
  if (showMarkingScheme && test && markingScheme) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-card rounded-lg border shadow-lg p-8">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold mb-2">{test.title}</h1>
            <p className="text-muted-foreground">Review marking scheme before starting</p>
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
              {markingScheme.subjects.map((s, idx) => (
                <div key={idx} className="flex justify-between items-center bg-background rounded px-3 py-2">
                  <span className="font-medium">{s.name}</span>
                  <span className="text-sm text-muted-foreground">
                    {s.questions} Q × {s.marksPerQ} mark{s.marksPerQ > 1 ? 's' : ''} = {s.questions * s.marksPerQ} marks
                  </span>
                </div>
              ))}
            </div>
            {markingScheme.negativeMarking > 0 && (
              <div className="mt-4 p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                <p className="text-sm text-destructive font-medium">
                  ⚠️ Negative Marking: -{markingScheme.negativeMarking} marks for each wrong answer
                </p>
              </div>
            )}
          </div>
          <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-amber-800 dark:text-amber-200 mb-2">Important Instructions:</h3>
            <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
              <li>• Do not switch tabs during the test (max {MAX_TAB_SWITCHES} warnings)</li>
              <li>• Test will auto-submit when time runs out</li>
              <li>• Copy, paste, right-click are disabled</li>
              <li>• Use "Save & Next" to save answer and proceed</li>
              <li>• Use "Mark for Review & Next" to flag a question</li>
            </ul>
          </div>
          <Button onClick={() => setShowMarkingScheme(false)} className="w-full" size="lg">
            Start Test
          </Button>
        </div>
      </div>
    );
  }

  // ======= LOADING =======
  if (!test || selectedQuestions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const currentQuestion = selectedQuestions[currentQuestionIndex];

  // ======= CHAPTER TEST: Simple Mobile-Friendly UI =======
  if (!isMockTest) {
    return (
      <div className="min-h-screen flex flex-col bg-background select-none" style={{ userSelect: 'none' }}>
        {/* Simple Header */}
        <header className="bg-blue-900 text-white px-3 py-2 flex items-center justify-between shrink-0 sticky top-0 z-20">
          <h1 className="text-sm font-bold truncate flex-1 mr-2">{test.title}</h1>
          <div className="flex items-center gap-2 shrink-0">
            {tabSwitchCount > 0 && (
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-600 text-[10px] font-medium">
                <Eye className="w-3 h-3" />
                <span>{tabSwitchCount}/{MAX_TAB_SWITCHES}</span>
              </div>
            )}
            <div className={`flex items-center gap-1 px-2 py-1 rounded font-mono text-sm font-bold ${
              timeLeft < 300 ? 'bg-red-600 animate-pulse' : 'bg-blue-700'
            }`}>
              <Timer className="w-3.5 h-3.5" />
              {formatTime(timeLeft)}
            </div>
          </div>
        </header>

        {/* Tab Warning */}
        {showTabWarning && (
          <div className="px-3 py-1.5 shrink-0">
            <Alert variant="destructive">
              <AlertDescription className="text-xs">
                <strong>Warning!</strong> Switching tabs is not allowed. {MAX_TAB_SWITCHES - tabSwitchCount} warning(s) remaining.
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Question Status Bar */}
        <div className="px-3 py-2 bg-muted/50 border-b border-border flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-400 inline-block" /> {statusCounts['not-visited']}</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500 inline-block" /> {statusCounts['not-answered']}</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500 inline-block" /> {statusCounts.answered}</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-purple-500 inline-block" /> {statusCounts.marked + statusCounts['answered-marked']}</span>
          </div>
        </div>

        {/* Question Number Strip (scrollable) */}
        <div className="px-3 py-2 border-b border-border shrink-0 overflow-x-auto">
          <div className="flex gap-1.5 w-max">
            {selectedQuestions.map((_, i) => {
              const status = getQuestionStatus(i);
              const isCurrent = i === currentQuestionIndex;
              return (
                <button
                  key={i}
                  onClick={() => navigateToQuestion(i)}
                  className={`w-8 h-8 text-xs rounded font-bold transition-all shrink-0 relative ${
                    isCurrent
                      ? 'ring-2 ring-blue-500 ring-offset-1 bg-blue-500 text-white'
                      : getStatusStyle(status, false)
                  }`}
                >
                  {i + 1}
                  {status === 'answered-marked' && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-green-400 rounded-full border border-white" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Question Content */}
        <div className="flex-1 overflow-auto px-4 py-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="px-2.5 py-1 bg-primary/10 text-primary rounded-full text-sm font-semibold">
              Q.{currentQuestionIndex + 1} / {totalQuestions}
            </span>
            <span className="text-xs text-muted-foreground">(1 mark)</span>
          </div>

          {/* Question */}
          <div className="mb-5 space-y-3">
            {currentQuestion.questionImageUrl ? (
              <img src={currentQuestion.questionImageUrl} alt="" draggable={false}
                onContextMenu={(e) => e.preventDefault()} onDragStart={(e) => e.preventDefault()}
                className="max-w-full h-auto rounded"
                style={{ userSelect: "none", pointerEvents: "none" }} />
            ) : currentQuestion.question?.trim() ? (
              <h2 className="text-base font-semibold leading-relaxed">
                <div onCopy={(e) => e.preventDefault()} onCut={(e) => e.preventDefault()}>
                  <LatexRenderer content={currentQuestion.question} />
                </div>
              </h2>
            ) : null}
          </div>

          {/* Question Diagram */}
          {currentQuestion.imageUrl && (
            <div className="mb-5 p-3 bg-muted/50 rounded-lg">
              <img src={currentQuestion.imageUrl} alt="" draggable={false}
                onContextMenu={(e) => e.preventDefault()}
                className="max-h-64 mx-auto rounded-lg"
                style={{ userSelect: "none", pointerEvents: "none" }} />
            </div>
          )}

          {/* Options */}
          <div className="space-y-2.5 mb-6">
            {currentQuestion.options.map((option, idx) => (
              <div
                key={idx}
                onClick={() => handleAnswerSelect(idx)}
                className={`flex items-center p-3 rounded-lg border-2 cursor-pointer transition-all active:scale-[0.98] ${
                  answers[currentQuestionIndex] === idx
                    ? "border-green-500 bg-green-50 dark:bg-green-950/30"
                    : "border-border hover:border-primary/40"
                }`}
              >
                <span className={`w-7 h-7 rounded-full flex items-center justify-center mr-3 font-bold text-sm shrink-0 ${
                  answers[currentQuestionIndex] === idx
                    ? "bg-green-500 text-white"
                    : "bg-muted text-muted-foreground"
                }`}>
                  {String.fromCharCode(65 + idx)}
                </span>
                <span className="flex-1 text-sm">
                  {currentQuestion.optionImageUrls?.[idx] ? (
                    <img src={currentQuestion.optionImageUrls[idx]} alt="" draggable={false}
                      onContextMenu={(e) => e.preventDefault()} onDragStart={(e) => e.preventDefault()}
                      className="block h-auto max-h-16"
                      style={{ userSelect: "none", pointerEvents: "none" }} />
                  ) : option?.trim() ? (
                    <span onCopy={(e) => e.preventDefault()} onCut={(e) => e.preventDefault()}>
                      <LatexRenderer content={option} />
                    </span>
                  ) : null}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Action Bar */}
        <div className="border-t border-border bg-card px-3 py-2.5 shrink-0 sticky bottom-0 z-20">
          <div className="flex items-center gap-2 mb-2">
            <Button variant="outline" size="sm" onClick={handleClearResponse} className="text-xs flex-1">
              Clear
            </Button>
            <Button
              variant="outline" size="sm"
              onClick={() => {
                setMarkedForReview(prev => {
                  const next = new Set(prev);
                  if (next.has(currentQuestionIndex)) next.delete(currentQuestionIndex);
                  else next.add(currentQuestionIndex);
                  return next;
                });
              }}
              className={`text-xs flex-1 ${markedForReview.has(currentQuestionIndex) ? 'bg-purple-100 border-purple-400 text-purple-700 dark:bg-purple-950 dark:text-purple-300' : ''}`}
            >
              {markedForReview.has(currentQuestionIndex) ? '★ Marked' : '☆ Mark Review'}
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline" size="sm"
              onClick={() => navigateToQuestion(Math.max(0, currentQuestionIndex - 1))}
              disabled={currentQuestionIndex === 0}
              className="flex-1"
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Previous
            </Button>
            {currentQuestionIndex === totalQuestions - 1 ? (
              <Button
                size="sm"
                onClick={() => setShowSubmitDialog(true)}
                disabled={isSubmitting}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold"
              >
                Submit Test
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleSaveAndNext}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                Save & Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            )}
          </div>
        </div>

        {/* Submit Dialog */}
        <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Submit Test?</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="p-2 bg-green-50 dark:bg-green-950/30 rounded">
                      <span className="text-green-700 dark:text-green-400 font-medium">✅ Answered: {statusCounts.answered + statusCounts['answered-marked']}</span>
                    </div>
                    <div className="p-2 bg-red-50 dark:bg-red-950/30 rounded">
                      <span className="text-red-700 dark:text-red-400 font-medium">❌ Not Answered: {statusCounts['not-answered'] + statusCounts['not-visited']}</span>
                    </div>
                    <div className="p-2 bg-purple-50 dark:bg-purple-950/30 rounded">
                      <span className="text-purple-700 dark:text-purple-400 font-medium">🔖 Marked: {statusCounts.marked + statusCounts['answered-marked']}</span>
                    </div>
                    <div className="p-2 bg-gray-50 dark:bg-gray-900 rounded">
                      <span className="font-medium">📝 Total: {totalQuestions}</span>
                    </div>
                  </div>
                  {!allQuestionsAttempted && (
                    <p className="text-destructive font-medium text-sm">⚠️ {totalQuestions - Object.keys(answers).length} questions are unanswered!</p>
                  )}
                  <p className="text-sm">Are you sure you want to submit?</p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Go Back</AlertDialogCancel>
              <AlertDialogAction onClick={submitTest} disabled={isSubmitting} className="bg-green-600 hover:bg-green-700">
                {isSubmitting ? "Submitting..." : "Confirm Submit"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // ======= MOCK TEST: Advanced CBT INTERFACE (UNCHANGED) =======
  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden select-none" style={{ userSelect: 'none' }}>
      {/* ===== TOP HEADER ===== */}
      <header className="bg-blue-900 text-white px-4 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold tracking-wide">
            {isCET ? 'MHT-CET' : isNEET ? 'NEET' : 'JEE'} - {test.title}
          </h1>
          {tabSwitchCount > 0 && (
            <div className="flex items-center gap-1 px-2 py-1 rounded bg-red-600 text-xs font-medium">
              <Eye className="w-3 h-3" />
              <span>{tabSwitchCount}/{MAX_TAB_SWITCHES}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded font-mono text-lg font-bold ${
            timeLeft < 300 ? 'bg-red-600 animate-pulse' : 'bg-blue-700'
          }`}>
            <Timer className="w-4 h-4" />
            {formatTime(timeLeft)}
          </div>
          <Button
            onClick={() => setShowSubmitDialog(true)}
            disabled={isSubmitting}
            className="bg-green-600 hover:bg-green-700 text-white font-bold px-6"
          >
            Submit Test
          </Button>
        </div>
      </header>

      {/* Tab Warning */}
      {showTabWarning && (
        <div className="px-4 py-2 shrink-0">
          <Alert variant="destructive">
            <AlertDescription>
              <strong>Warning!</strong> Switching tabs is not allowed. {MAX_TAB_SWITCHES - tabSwitchCount} warning(s) remaining.
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* ===== SUBJECT TABS / FILTERS ===== */}
      <div className="bg-gray-100 dark:bg-gray-800 border-b border-border px-4 py-1 flex items-center gap-2 shrink-0 overflow-x-auto">
        {isNEET ? (
          neetFilters.map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveSubjectTab(filter)}
              className={`px-4 py-1.5 text-sm font-medium rounded transition-colors whitespace-nowrap ${
                activeSubjectTab === filter
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-700 text-foreground hover:bg-blue-100 dark:hover:bg-gray-600 border'
              }`}
            >
              {filter}
            </button>
          ))
        ) : (
          (isCET ? cetTabs : jeeTabs).map((tab, idx) => (
            <button
              key={idx}
              onClick={() => setActiveSubjectTab(String(idx))}
              className={`px-4 py-1.5 text-sm font-medium rounded transition-colors whitespace-nowrap ${
                activeSubjectTab === String(idx)
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-700 text-foreground hover:bg-blue-100 dark:hover:bg-gray-600 border'
              }`}
            >
              {tab.label}
            </button>
          ))
        )}
      </div>

      {/* ===== MAIN CONTENT: Question Panel + Palette ===== */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT: Question Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <ScrollArea className="flex-1 p-4 md:p-6">
            {/* Question Header */}
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <span className="px-3 py-1 rounded-full text-sm font-semibold bg-blue-500/10 text-blue-700 dark:text-blue-400">
                {getCurrentSubject()}
              </span>
              <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-semibold">
                Q.{currentQuestionIndex + 1} of {totalQuestions}
              </span>
              <span className="text-sm text-muted-foreground">
                ({getCurrentQuestionMarks()} mark{getCurrentQuestionMarks() > 1 ? 's' : ''})
              </span>
              {markingScheme?.negativeMarking && markingScheme.negativeMarking > 0 && (
                <span className="text-xs text-destructive font-medium">(-{markingScheme.negativeMarking} for wrong)</span>
              )}
            </div>

            {/* Question */}
            <div className="mb-6 space-y-3">
              {currentQuestion.questionImageUrl ? (
                <img src={currentQuestion.questionImageUrl} alt="" draggable={false}
                  onContextMenu={(e) => e.preventDefault()} onDragStart={(e) => e.preventDefault()}
                  className="max-w-full h-auto rounded"
                  style={{ userSelect: "none", pointerEvents: "none" }} />
              ) : currentQuestion.question?.trim() ? (
                <h2 className="text-lg font-semibold leading-relaxed">
                  <div onCopy={(e) => e.preventDefault()} onCut={(e) => e.preventDefault()}>
                    <LatexRenderer content={currentQuestion.question} />
                  </div>
                </h2>
              ) : null}
            </div>

            {/* Question Image (diagram) */}
            {currentQuestion.imageUrl && (
              <div className="mb-6 p-4 bg-muted/50 rounded-lg">
                <img src={currentQuestion.imageUrl} alt="" draggable={false}
                  onContextMenu={(e) => e.preventDefault()}
                  className="max-h-80 mx-auto rounded-lg"
                  style={{ userSelect: "none", pointerEvents: "none" }} />
              </div>
            )}

            {/* Options */}
            <div className="space-y-3 mb-6">
              {currentQuestion.options.map((option, idx) => (
                <div
                  key={idx}
                  onClick={() => handleAnswerSelect(idx)}
                  className={`flex items-center p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    answers[currentQuestionIndex] === idx
                      ? "border-green-500 bg-green-50 dark:bg-green-950/30"
                      : "border-border hover:border-primary/40 hover:bg-muted/50"
                  }`}
                >
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 font-bold text-sm shrink-0 ${
                    answers[currentQuestionIndex] === idx
                      ? "bg-green-500 text-white"
                      : "bg-muted text-muted-foreground"
                  }`}>
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span className="flex-1 text-base">
                    {currentQuestion.optionImageUrls?.[idx] ? (
                      <img src={currentQuestion.optionImageUrls[idx]} alt="" draggable={false}
                        onContextMenu={(e) => e.preventDefault()} onDragStart={(e) => e.preventDefault()}
                        className="block h-auto max-h-20"
                        style={{ userSelect: "none", pointerEvents: "none" }} />
                    ) : option?.trim() ? (
                      <span onCopy={(e) => e.preventDefault()} onCut={(e) => e.preventDefault()}>
                        <LatexRenderer content={option} />
                      </span>
                    ) : null}
                  </span>
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Bottom Action Bar */}
          <div className="border-t border-border bg-card px-4 py-3 flex items-center justify-between gap-2 shrink-0 flex-wrap">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleClearResponse} className="text-xs">
                Clear Response
              </Button>
              <Button
                variant="outline" size="sm"
                onClick={() => {
                  setMarkedForReview(prev => {
                    const next = new Set(prev);
                    if (next.has(currentQuestionIndex)) next.delete(currentQuestionIndex);
                    else next.add(currentQuestionIndex);
                    return next;
                  });
                }}
                className={`text-xs ${markedForReview.has(currentQuestionIndex) ? 'bg-purple-100 border-purple-400 text-purple-700' : ''}`}
              >
                {markedForReview.has(currentQuestionIndex) ? 'Unmark Review' : 'Mark for Review'}
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline" size="sm"
                onClick={() => navigateToQuestion(Math.max(0, currentQuestionIndex - 1))}
                disabled={currentQuestionIndex === 0}
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Previous
              </Button>
              <Button
                size="sm"
                onClick={handleSaveAndNext}
                disabled={currentQuestionIndex === totalQuestions - 1}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Save & Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
              <Button
                size="sm" variant="outline"
                onClick={handleMarkForReview}
                disabled={currentQuestionIndex === totalQuestions - 1}
                className="border-purple-400 text-purple-700 hover:bg-purple-50 dark:text-purple-300 dark:hover:bg-purple-950"
              >
                Mark for Review & Next
              </Button>
            </div>
          </div>
        </div>

        {/* RIGHT: Question Palette */}
        {paletteOpen && (
          <div className="w-64 md:w-72 border-l border-border bg-card flex flex-col shrink-0 overflow-hidden">
            <div className="p-3 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold text-sm">Question Palette</h3>
              <button onClick={() => setPaletteOpen(false)} className="text-muted-foreground hover:text-foreground">
                <PanelRightClose className="w-4 h-4" />
              </button>
            </div>
            
            <ScrollArea className="flex-1 p-3">
              <div className="space-y-3">
                {(() => {
                  const groups: { name: string; indices: number[] }[] = [];
                  let currentGroup = '';
                  filteredPaletteIndices.forEach(i => {
                    const q = selectedQuestions[i];
                    let subj = (q.subject || '').charAt(0).toUpperCase() + (q.subject || '').slice(1);
                    if (isNEET && q.subject === 'biology') {
                      const bioQs = selectedQuestions.filter(qq => qq.subject === 'biology');
                      const bioIdx = bioQs.indexOf(q);
                      subj = bioIdx < 45 ? 'Botany' : 'Zoology';
                    }
                    if (subj !== currentGroup) {
                      currentGroup = subj;
                      groups.push({ name: subj, indices: [] });
                    }
                    groups[groups.length - 1].indices.push(i);
                  });
                  return groups.map((group) => (
                    <div key={group.name}>
                      <h4 className="text-xs font-bold text-muted-foreground mb-1 uppercase tracking-wider">{group.name}</h4>
                      <div className="grid grid-cols-5 gap-1.5">
                        {group.indices.map(i => {
                          const status = getQuestionStatus(i);
                          const isCurrent = i === currentQuestionIndex;
                          return (
                            <button
                              key={i}
                              onClick={() => navigateToQuestion(i)}
                              className={`relative w-9 h-9 text-xs rounded font-bold transition-all ${getStatusStyle(status, isCurrent)} ${
                                isCurrent ? (status === 'not-visited' ? 'bg-blue-500 text-white' : '') : ''
                              }`}
                              title={`Q${i+1}: ${status.replace('-', ' ')}`}
                            >
                              {i + 1}
                              {status === 'answered-marked' && (
                                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 rounded-full border border-white" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </ScrollArea>

            {/* Legend */}
            <div className="p-3 border-t border-border space-y-1.5 text-[10px] shrink-0">
              <div className="font-semibold text-xs mb-1">Legend</div>
              <div className="grid grid-cols-2 gap-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded bg-gray-300 dark:bg-gray-600 shrink-0" />
                  <span>Not Visited</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded bg-red-500 shrink-0" />
                  <span>Not Answered</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded bg-green-500 shrink-0" />
                  <span>Answered</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded bg-purple-500 shrink-0" />
                  <span>Marked</span>
                </div>
                <div className="flex items-center gap-1.5 col-span-2">
                  <span className="relative w-4 h-4 rounded bg-purple-500 shrink-0">
                    <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-green-400 rounded-full border border-white" />
                  </span>
                  <span>Answered & Marked</span>
                </div>
              </div>
              <div className="pt-1 border-t border-border mt-1 grid grid-cols-2 gap-1 text-[10px]">
                <span>Answered: <strong className="text-green-600">{statusCounts.answered + statusCounts['answered-marked']}</strong></span>
                <span>Not Answered: <strong className="text-red-600">{statusCounts['not-answered']}</strong></span>
                <span>Marked: <strong className="text-purple-600">{statusCounts.marked + statusCounts['answered-marked']}</strong></span>
                <span>Not Visited: <strong>{statusCounts['not-visited']}</strong></span>
              </div>
            </div>
          </div>
        )}

        {/* Collapsed palette toggle */}
        {!paletteOpen && (
          <button
            onClick={() => setPaletteOpen(true)}
            className="absolute right-0 top-1/2 -translate-y-1/2 bg-blue-600 text-white p-2 rounded-l-lg shadow-lg z-10"
          >
            <PanelRightOpen className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Submit Dialog */}
      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit Test?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="p-2 bg-green-50 dark:bg-green-950/30 rounded">
                    <span className="text-green-700 dark:text-green-400 font-medium">✅ Answered: {statusCounts.answered + statusCounts['answered-marked']}</span>
                  </div>
                  <div className="p-2 bg-red-50 dark:bg-red-950/30 rounded">
                    <span className="text-red-700 dark:text-red-400 font-medium">❌ Not Answered: {statusCounts['not-answered'] + statusCounts['not-visited']}</span>
                  </div>
                  <div className="p-2 bg-purple-50 dark:bg-purple-950/30 rounded">
                    <span className="text-purple-700 dark:text-purple-400 font-medium">🔖 Marked: {statusCounts.marked + statusCounts['answered-marked']}</span>
                  </div>
                  <div className="p-2 bg-gray-50 dark:bg-gray-900 rounded">
                    <span className="font-medium">📝 Total: {totalQuestions}</span>
                  </div>
                </div>
                {!allQuestionsAttempted && (
                  <p className="text-destructive font-medium text-sm">⚠️ {totalQuestions - Object.keys(answers).length} questions are unanswered!</p>
                )}
                <p className="text-sm">Are you sure you want to submit?</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Go Back</AlertDialogCancel>
            <AlertDialogAction onClick={submitTest} disabled={isSubmitting} className="bg-green-600 hover:bg-green-700">
              {isSubmitting ? "Submitting..." : "Confirm Submit"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
