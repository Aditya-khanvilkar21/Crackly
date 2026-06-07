import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle2, XCircle, Clock, Award, Lightbulb, Download, AlertCircle } from "lucide-react";
import { LatexRenderer } from "@/components/LatexRenderer";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { downloadResultAsPDF } from "@/lib/downloadResult";

interface Question {
  question: string;
  options: string[];
  correctAnswer: number;
  imageUrl?: string;
  explanation?: string;
  explanationImage?: string;
  subject?: string;
  marksPerQuestion?: number;
  topic?: string;
}

interface TestResult {
  id: string;
  score: number;
  total_questions: number;
  answers: Record<number, number>;
  time_taken_seconds: number;
  completed_at: string;
}

interface Test {
  id: string;
  title: string;
  subject: string | null;
  chapter: string | null;
  test_type: 'chapter_test' | 'mock_test';
  exam_type?: 'JEE' | 'NEET' | 'CET';
  negative_marking?: number;
  questions: Question[];
}

interface SubjectBreakdown {
  subject: string;
  correct: number;
  wrong: number;
  attempted: number;
  total: number;
  percentage: number;
  accuracy: number;
}

interface TopicAnalysis {
  topic: string;
  correct: number;
  wrong: number;
  total: number;
  percentage: number;
}

interface Profile {
  full_name: string;
  student_id: string;
}

export default function TestResult() {
  const { testId } = useParams();
  const navigate = useNavigate();
  const [result, setResult] = useState<TestResult | null>(null);
  const [test, setTest] = useState<Test | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    fetchResultAndTest();
  }, [testId]);

  const fetchResultAndTest = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Fetch profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name, student_id")
        .eq("id", user.id)
        .single();
      
      if (profileData) {
        setProfile(profileData);
      }

      // Fetch test result
      const { data: resultData, error: resultError } = await supabase
        .from("test_results")
        .select("*")
        .eq("test_id", testId)
        .eq("student_id", user.id)
        .order("completed_at", { ascending: false })
        .limit(1)
        .single();

      if (resultError) throw resultError;

      // Fetch test details using secure RPC that only returns data if student has submitted
      const { data: testData, error: testError } = await supabase
        .rpc("get_test_result_with_questions", { test_id_param: testId });

      if (testError) throw testError;
      if (!testData) throw new Error("Test not found or access denied");

      setResult(resultData as unknown as TestResult);
      
      const testObj = testData as unknown as Test;
      // Fix options: ensure each question's options is a proper string array
      testObj.questions = testObj.questions.map(q => ({
        ...q,
        options: Array.isArray(q.options) 
          ? q.options.map(o => typeof o === 'string' ? o : String(o))
          : typeof q.options === 'string'
            ? JSON.parse(q.options as unknown as string)
            : ['', '', '', '']
      }));
      setTest(testObj);

    } catch (error) {
      toast.error("Failed to load test result");
      navigate("/");
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getPercentage = () => {
    if (!result || !test) return 0;
    return ((result.score / result.total_questions) * 100).toFixed(1);
  };

  const getDisplayTotal = () => {
    if (!result) return 0;
    return result.total_questions;
  };

  const isNEETMockTest = () => {
    if (!test || test.test_type !== 'mock_test') return false;
    if (test.exam_type === 'NEET') return true;
    return test.chapter === 'NEET' || (test.questions && test.questions.length === 180);
  };

  const isCETMockTest = () => {
    if (!test || test.test_type !== 'mock_test') return false;
    if (test.exam_type === 'CET') return true;
    return test.chapter === 'CET' || (test.questions && (test.questions.length === 150 || test.questions.length === 200));
  };

  // CET PCB has Biology (200 questions total: 50+50+100). CET PCM has Math (150 questions: 50+50+50).
  const isCETPCB = () => {
    if (!test) return false;
    if (test.questions?.length === 200) return true;
    return test.questions?.some(q => (q.subject || '').toLowerCase().includes('bio')) ?? false;
  };

  const getSubjectBreakdown = (): SubjectBreakdown[] => {
    if (!test || test.test_type !== 'mock_test' || !result) return [];

    const buildSubjects = (configs: { subject: string; start: number; count: number }[]) =>
      configs.map(({ subject, start, count }) => {
        let correct = 0;
        let attempted = 0;
        for (let i = start; i < start + count; i++) {
          if (result.answers[i] !== undefined) {
            attempted++;
            if (result.answers[i] === test.questions[i]?.correctAnswer) correct++;
          }
        }
        const wrong = attempted - correct;
        return {
          subject,
          correct,
          wrong,
          attempted,
          total: count,
          percentage: count > 0 ? (correct / count) * 100 : 0,
          accuracy: attempted > 0 ? (correct / attempted) * 100 : 0,
        };
      });

    if (isCETMockTest()) {
      if (isCETPCB()) {
        return buildSubjects([
          { subject: 'Physics', start: 0, count: 50 },
          { subject: 'Chemistry', start: 50, count: 50 },
          { subject: 'Biology', start: 100, count: 100 },
        ]);
      }
      return buildSubjects([
        { subject: 'Physics', start: 0, count: 50 },
        { subject: 'Chemistry', start: 50, count: 50 },
        { subject: 'Mathematics', start: 100, count: 50 },
      ]);
    }

    if (isNEETMockTest()) {
      return buildSubjects([
        { subject: 'Physics', start: 0, count: 45 },
        { subject: 'Chemistry', start: 45, count: 45 },
        { subject: 'Biology', start: 90, count: 90 },
      ]);
    }

    // JEE: 25 / 25 / 25
    return buildSubjects([
      { subject: 'Physics', start: 0, count: 25 },
      { subject: 'Chemistry', start: 25, count: 25 },
      { subject: 'Mathematics', start: 50, count: 25 },
    ]);
  };

  // CET marks: Phys ×1, Chem ×1, Math ×2 (PCM) → 200; Phys ×1, Chem ×1, Bio ×1 (PCB) → 200
  const getCETScore = () => {
    if (!isCETMockTest()) return null;
    const breakdown = getSubjectBreakdown();
    const pcb = isCETPCB();
    let obtained = 0;
    breakdown.forEach(b => {
      const mult = !pcb && b.subject === 'Mathematics' ? 2 : 1;
      obtained += b.correct * mult;
    });
    return { obtained, max: 200, pcb };
  };

  // Calculate detailed score with negative marking
  const calculateDetailedScore = () => {
    if (!result || !test) return { correct: 0, wrong: 0, unanswered: 0, totalMarks: 0, maxMarks: 0, negativeMarksDeducted: 0 };
    
    let correct = 0;
    let wrong = 0;
    let totalMarks = 0;
    let maxMarks = 0;
    const negativeMarking = test.negative_marking || 0;
    
    test.questions.forEach((q, idx) => {
      const marksPerQ = q.marksPerQuestion || 1;
      maxMarks += marksPerQ;
      
      if (result.answers[idx] !== undefined) {
        if (result.answers[idx] === q.correctAnswer) {
          correct++;
          totalMarks += marksPerQ;
        } else {
          wrong++;
          if (negativeMarking > 0) {
            totalMarks -= negativeMarking * marksPerQ;
          }
        }
      }
    });
    
    const unanswered = test.questions.length - correct - wrong;
    const negativeMarksDeducted = wrong * negativeMarking;
    totalMarks = Math.max(0, totalMarks);
    
    return { correct, wrong, unanswered, totalMarks, maxMarks, negativeMarksDeducted };
  };

  // Calculate topic-wise analysis for weak areas
  const getTopicAnalysis = (): TopicAnalysis[] => {
    if (!result || !test) return [];
    
    const topicMap = new Map<string, { correct: number; wrong: number; total: number }>();
    
    test.questions.forEach((q, idx) => {
      const topic = q.topic || 'General';
      const existing = topicMap.get(topic) || { correct: 0, wrong: 0, total: 0 };
      existing.total++;
      
      if (result.answers[idx] !== undefined) {
        if (result.answers[idx] === q.correctAnswer) {
          existing.correct++;
        } else {
          existing.wrong++;
        }
      }
      topicMap.set(topic, existing);
    });

    return Array.from(topicMap.entries())
      .map(([topic, data]) => ({
        topic,
        correct: data.correct,
        wrong: data.wrong,
        total: data.total,
        percentage: (data.correct / data.total) * 100,
      }))
      .sort((a, b) => a.percentage - b.percentage);
  };

  const getWeakTopics = (): TopicAnalysis[] => {
    return getTopicAnalysis().filter(t => t.percentage < 60 && t.topic !== 'General');
  };

  if (!result || !test) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const detailedScore = calculateDetailedScore();
  const subjectBreakdown = getSubjectBreakdown();
  const weakTopics = getWeakTopics();
  const isMockTest = test.test_type === 'mock_test';

  return (
    <div className="min-h-screen bg-gradient-subtle py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Result Summary */}
        <Card className="p-8 mb-8 bg-gradient-primary text-primary-foreground">
          <div className="text-center">
            <Award className="w-16 h-16 mx-auto mb-4" />
            <h1 className="text-3xl font-bold mb-2">Test Completed!</h1>
            <p className="text-lg opacity-90 mb-6">
              {test.title} {isMockTest ? (isNEETMockTest() ? '- NEET Mock Test' : '- JEE Mock Test') : `- ${test.subject}`}
            </p>
            
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 max-w-4xl mx-auto">
              <div className="bg-white/10 rounded-lg p-4">
                <div className="text-3xl font-bold">{detailedScore.totalMarks.toFixed(1)}/{detailedScore.maxMarks}</div>
                <div className="text-sm opacity-90">Total Score</div>
              </div>
              <div className="bg-white/10 rounded-lg p-4">
                <div className="text-3xl font-bold">{detailedScore.correct}</div>
                <div className="text-sm opacity-90">Correct</div>
              </div>
              <div className="bg-white/10 rounded-lg p-4">
                <div className="text-3xl font-bold">{detailedScore.wrong}</div>
                <div className="text-sm opacity-90">Incorrect</div>
              </div>
              <div className="bg-white/10 rounded-lg p-4">
                <div className="text-3xl font-bold">{detailedScore.unanswered}</div>
                <div className="text-sm opacity-90">Not Attempted</div>
              </div>
              <div className="bg-white/10 rounded-lg p-4">
                <div className="text-3xl font-bold">
                  {(detailedScore.correct + detailedScore.wrong) > 0 
                    ? ((detailedScore.correct / (detailedScore.correct + detailedScore.wrong)) * 100).toFixed(1) 
                    : '0'}%
                </div>
                <div className="text-sm opacity-90">Accuracy</div>
              </div>
            </div>
            
            {/* Negative Marking Summary */}
            {test.negative_marking && test.negative_marking > 0 && detailedScore.negativeMarksDeducted > 0 && (
              <div className="mt-4 p-3 bg-white/10 rounded-lg max-w-md mx-auto">
                <p className="text-sm">
                  ⚠️ Negative Marking Applied: <span className="font-bold text-red-300">-{detailedScore.negativeMarksDeducted.toFixed(2)} marks</span> deducted for {detailedScore.wrong} wrong answers
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Performance Analysis */}
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Performance Analysis</h2>
          <div className={`grid grid-cols-2 ${test.negative_marking && test.negative_marking > 0 ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-4`}>
            <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-950 rounded-lg">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
              <div>
                <div className="text-2xl font-bold text-green-600">{detailedScore.correct}</div>
                <div className="text-sm text-muted-foreground">Correct</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-950 rounded-lg">
              <XCircle className="w-8 h-8 text-red-600" />
              <div>
                <div className="text-2xl font-bold text-red-600">{detailedScore.wrong}</div>
                <div className="text-sm text-muted-foreground">Wrong</div>
              </div>
            </div>
            {test.negative_marking && test.negative_marking > 0 && (
              <div className="flex items-center gap-3 p-4 bg-orange-50 dark:bg-orange-950 rounded-lg">
                <AlertCircle className="w-8 h-8 text-orange-600" />
                <div>
                  <div className="text-2xl font-bold text-orange-600">-{detailedScore.negativeMarksDeducted.toFixed(1)}</div>
                  <div className="text-sm text-muted-foreground">Marks Deducted</div>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Subject-wise Breakdown for Mock Tests */}
        {isMockTest && subjectBreakdown.length > 0 && (
          <Card className="p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">Subject-wise Performance</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {subjectBreakdown.map((subject) => (
                <div key={subject.subject} className={`p-4 border rounded-lg ${
                  subject.accuracy >= 70 ? 'bg-green-50/50 dark:bg-green-950/20 border-green-300' :
                  subject.accuracy >= 50 ? 'bg-yellow-50/50 dark:bg-yellow-950/20 border-yellow-300' :
                  'bg-red-50/50 dark:bg-red-950/20 border-red-300'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-lg">{subject.subject}</h3>
                    <Badge className={
                      subject.accuracy >= 70 ? 'bg-green-600' : subject.accuracy >= 50 ? 'bg-yellow-600' : 'bg-red-600'
                    }>
                      {subject.accuracy >= 70 ? 'Strong' : subject.accuracy >= 50 ? 'Moderate' : 'Weak'}
                    </Badge>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between"><span>Total Questions:</span><span className="font-medium">{subject.total}</span></div>
                    <div className="flex justify-between"><span>Attempted:</span><span className="font-medium">{subject.attempted}</span></div>
                    <div className="flex justify-between"><span>Correct:</span><span className="font-medium text-green-600">{subject.correct}</span></div>
                    <div className="flex justify-between"><span>Incorrect:</span><span className="font-medium text-red-600">{subject.wrong}</span></div>
                    <div className="flex justify-between"><span>Accuracy:</span>
                      <span className={`font-bold ${
                        subject.accuracy >= 70 ? 'text-green-600' : subject.accuracy >= 50 ? 'text-yellow-600' : 'text-red-600'
                      }`}>{subject.accuracy.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2 mt-2">
                      <div 
                        className={`h-2 rounded-full transition-all ${
                          subject.accuracy >= 70 ? 'bg-green-600' : subject.accuracy >= 50 ? 'bg-yellow-600' : 'bg-red-600'
                        }`}
                        style={{ width: `${subject.percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Weak Topics Analysis */}
        {weakTopics.length > 0 && (
          <Card className="p-6 mb-6 border-orange-500/30 bg-orange-50/50 dark:bg-orange-950/20">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-600" />
              Areas for Improvement
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Focus on these topics where you scored below 60%:
            </p>
            <div className="flex flex-wrap gap-2">
              {weakTopics.map((topic) => (
                <Badge key={topic.topic} variant="outline" className="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-300">
                  {topic.topic} ({topic.percentage.toFixed(0)}%)
                </Badge>
              ))}
            </div>
          </Card>
        )}
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-bold mb-6">Detailed Review</h2>
          <div className="space-y-6">
            {test.questions.map((question, qIndex) => {
              const selectedAnswer = result.answers[qIndex];
              const isAttempted = selectedAnswer !== undefined;
              const isCorrect = isAttempted && selectedAnswer === question.correctAnswer;
              const marksPerQ = question.marksPerQuestion || 1;
              const marksObtained = !isAttempted ? 0 : isCorrect ? marksPerQ : (test.negative_marking ? -(test.negative_marking * marksPerQ) : 0);
              
              return (
                <div key={qIndex} className={`p-4 rounded-lg border-2 ${
                  !isAttempted ? 'border-gray-400 bg-gray-50 dark:bg-gray-950/20' :
                  isCorrect ? 'border-green-500 bg-green-50 dark:bg-green-950/20' : 'border-red-500 bg-red-50 dark:bg-red-950/20'
                }`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">Q{qIndex + 1}.</span>
                      {!isAttempted ? (
                        <AlertCircle className="w-5 h-5 text-gray-500" />
                      ) : isCorrect ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600" />
                      )}
                      <span className="text-xs text-muted-foreground">({marksPerQ} mark{marksPerQ > 1 ? 's' : ''})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${
                        !isAttempted ? 'text-gray-500' : isCorrect ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {marksObtained > 0 ? '+' : ''}{marksObtained.toFixed(1)} marks
                      </span>
                      <Badge className={!isAttempted ? 'bg-gray-500' : isCorrect ? 'bg-green-600' : 'bg-red-600'}>
                        {!isAttempted ? 'Not Attempted' : isCorrect ? 'Correct' : 'Incorrect'}
                      </Badge>
                    </div>
                  </div>
                  
                  {/* Topic Badge */}
                  {question.topic && (
                    <Badge variant="outline" className="mb-2 text-xs">
                      Topic: {question.topic}
                    </Badge>
                  )}
                  
                  <p className="font-medium mb-4"><LatexRenderer content={question.question} /></p>
                  
                  {/* Question Image */}
                  {question.imageUrl && (
                    <div className="mb-4 p-3 bg-muted/30 rounded-lg">
                      <img 
                        src={question.imageUrl} 
                        alt="Question diagram"
                        className="max-h-64 mx-auto rounded-lg"
                      />
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    {question.options.map((option, optIndex) => {
                      const isSelected = selectedAnswer === optIndex;
                      const isCorrectOption = question.correctAnswer === optIndex;
                      
                      return (
                        <div key={optIndex} className={`p-3 rounded-lg ${
                          isCorrectOption 
                            ? 'bg-green-100 dark:bg-green-900/30 border-2 border-green-500' 
                            : isSelected 
                            ? 'bg-red-100 dark:bg-red-900/30 border-2 border-red-500' 
                            : 'bg-muted/50'
                        }`}>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {String.fromCharCode(97 + optIndex)})
                            </span>
                            <span><LatexRenderer content={option} /></span>
                            {isCorrectOption && (
                              <Badge className="ml-auto bg-green-600">Correct Answer</Badge>
                            )}
                            {isSelected && !isCorrectOption && (
                              <Badge className="ml-auto bg-red-600">Your Answer</Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Explanation Section */}
                  {(question.explanation || question.explanationImage) && (
                    <div className="mt-4 p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                      <div className="flex items-start gap-2">
                        <Lightbulb className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="font-semibold text-amber-800 dark:text-amber-200 mb-1">Explanation</p>
                          {question.explanation && (
                            <p className="text-sm text-amber-700 dark:text-amber-300"><LatexRenderer content={question.explanation} /></p>
                          )}
                          {question.explanationImage && (
                            <img 
                              src={question.explanationImage} 
                              alt="Explanation diagram"
                              className="mt-3 max-w-full max-h-80 rounded-lg border border-amber-300 dark:border-amber-700"
                              loading="lazy"
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>


        {/* Actions */}
        <div className="flex gap-4 justify-center flex-wrap">
          <Button onClick={() => navigate("/")} variant="outline" size="lg">
            Back to Home
          </Button>
          <Button onClick={() => navigate(`/take-test/${testId}`)} size="lg">
            Retake Test
          </Button>
          <Button
            onClick={async () => {
              if (!profile || !result || !test) {
                toast.error("Result data is still loading. Please wait.");
                return;
              }
              setDownloading(true);
              try {
                const { data: { user } } = await supabase.auth.getUser();
                let rank: number | null = null;
                let totalStudents: number | null = null;
                try {
                  const { data: allResults } = await supabase
                    .from("test_results")
                    .select("student_id, score, completed_at")
                    .eq("test_id", testId)
                    .order("score", { ascending: false })
                    .order("completed_at", { ascending: true });
                  if (allResults && allResults.length > 0 && user) {
                    const bestByStudent = new Map<string, { score: number; completed_at: string }>();
                    allResults.forEach((r: any) => {
                      const existing = bestByStudent.get(r.student_id);
                      if (!existing || r.score > existing.score) {
                        bestByStudent.set(r.student_id, { score: r.score, completed_at: r.completed_at });
                      }
                    });
                    const ranked = Array.from(bestByStudent.entries())
                      .sort((a, b) => b[1].score - a[1].score);
                    totalStudents = ranked.length;
                    const idx = ranked.findIndex(([sid]) => sid === user.id);
                    if (idx >= 0) rank = idx + 1;
                  }
                } catch {}

                const questionSummary = test.questions.map((q, idx) => {
                  const sel = result.answers[idx];
                  const labels = ['A', 'B', 'C', 'D', 'E'];
                  const yourAnswer = sel === undefined ? '-' : (labels[sel] || String(sel + 1));
                  const correctAnswer = labels[q.correctAnswer] || String(q.correctAnswer + 1);
                  const status: 'Correct' | 'Incorrect' | 'Not Attempted' =
                    sel === undefined ? 'Not Attempted' : sel === q.correctAnswer ? 'Correct' : 'Incorrect';
                  return { qNo: idx + 1, yourAnswer, correctAnswer, status };
                });

                downloadResultAsPDF({
                  studentName: profile.full_name,
                  studentId: profile.student_id,
                  testTitle: test.title,
                  testType: test.test_type,
                  subject: test.subject || undefined,
                  chapter: test.chapter || undefined,
                  score: result.score,
                  totalQuestions: getDisplayTotal(),
                  percentage: parseFloat(getPercentage() as string),
                  timeTaken: formatTime(result.time_taken_seconds),
                  completedAt: new Date(result.completed_at).toLocaleDateString('en-IN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  }),
                  rank,
                  totalStudents,
                  subjectBreakdown: isMockTest ? subjectBreakdown : undefined,
                  weakTopics: weakTopics.length > 0 ? weakTopics.map(t => `${t.topic} (${t.percentage.toFixed(0)}%)`) : undefined,
                  questions: questionSummary,
                });
                toast.success("Result downloaded successfully!");
              } catch (err) {
                console.error(err);
                toast.error("Failed to generate PDF. Please try again.");
              } finally {
                setDownloading(false);
              }
            }}
            variant="secondary"
            size="lg"
            className="gap-2"
            disabled={downloading || !profile || !result || !test}
          >
            <Download className="w-4 h-4" />
            {downloading ? "Generating PDF..." : "Download Result"}
          </Button>
        </div>
      </div>
    </div>
  );
}
