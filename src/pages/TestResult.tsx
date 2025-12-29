import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle2, XCircle, Clock, Award, Lightbulb, Download, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { downloadResultAsPDF } from "@/lib/downloadResult";

interface Question {
  question: string;
  options: string[];
  correctAnswer: number;
  imageUrl?: string;
  explanation?: string;
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
  questions: Question[];
}

interface SubjectBreakdown {
  subject: string;
  correct: number;
  total: number;
  percentage: number;
}

interface RankingInfo {
  rank: number;
  totalStudents: number;
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
  const [ranking, setRanking] = useState<RankingInfo | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

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
      setTest(testData as unknown as Test);

      // Fetch ranking - get all results for this test and calculate rank
      const { data: allResults } = await supabase
        .from("test_results")
        .select("student_id, score")
        .eq("test_id", testId)
        .order("score", { ascending: false });

      if (allResults && allResults.length > 0) {
        // Get unique students with their best scores
        const studentBestScores = new Map<string, number>();
        allResults.forEach(r => {
          const existing = studentBestScores.get(r.student_id);
          if (!existing || r.score > existing) {
            studentBestScores.set(r.student_id, r.score);
          }
        });

        // Sort by score and find rank
        const sortedScores = Array.from(studentBestScores.entries())
          .sort((a, b) => b[1] - a[1]);
        
        const userRank = sortedScores.findIndex(([id]) => id === user.id) + 1;
        
        if (userRank > 0) {
          setRanking({
            rank: userRank,
            totalStudents: sortedScores.length
          });
        }
      }
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
    // For chapter tests, always calculate out of 25
    const totalQuestions = test.test_type === 'chapter_test' ? 25 : result.total_questions;
    return ((result.score / totalQuestions) * 100).toFixed(1);
  };

  const getDisplayTotal = () => {
    if (!test) return 0;
    return test.test_type === 'chapter_test' ? 25 : result?.total_questions || 0;
  };

  const isNEETMockTest = () => {
    if (!test || test.test_type !== 'mock_test') return false;
    return test.chapter === 'NEET' || (test.questions && test.questions.length === 180);
  };

  const getSubjectBreakdown = (): SubjectBreakdown[] => {
    if (!test || test.test_type !== 'mock_test' || !result) return [];
    
    const isNEET = isNEETMockTest();
    
    if (isNEET) {
      // NEET: 45 Physics, 45 Chemistry, 90 Biology
      const subjectsConfig = [
        { subject: 'Physics', start: 0, count: 45 },
        { subject: 'Chemistry', start: 45, count: 45 },
        { subject: 'Biology', start: 90, count: 90 },
      ];
      
      return subjectsConfig.map(({ subject, start, count }) => {
        let correct = 0;
        for (let i = start; i < start + count; i++) {
          if (result.answers[i] === test.questions[i]?.correctAnswer) {
            correct++;
          }
        }
        return {
          subject,
          correct,
          total: count,
          percentage: (correct / count) * 100
        };
      });
    } else {
      // JEE: 25 Physics, 25 Chemistry, 25 Mathematics
      const subjects = ['Physics', 'Chemistry', 'Mathematics'];
      return subjects.map((subject, subjectIndex) => {
        const startIdx = subjectIndex * 25;
        let correct = 0;
        
        for (let i = startIdx; i < startIdx + 25; i++) {
          if (result.answers[i] === test.questions[i]?.correctAnswer) {
            correct++;
          }
        }
        
        return {
          subject,
          correct,
          total: 25,
          percentage: (correct / 25) * 100
        };
      });
    }
  };

  if (!result || !test) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const subjectBreakdown = getSubjectBreakdown();
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
            
            <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto">
              <div className="bg-white/10 rounded-lg p-4">
                <div className="text-4xl font-bold">{result.score}/{getDisplayTotal()}</div>
                <div className="text-sm opacity-90">Score</div>
              </div>
              <div className="bg-white/10 rounded-lg p-4">
                <div className="text-4xl font-bold">{getPercentage()}%</div>
                <div className="text-sm opacity-90">Percentage</div>
              </div>
              <div className="bg-white/10 rounded-lg p-4">
                <div className="text-4xl font-bold">{formatTime(result.time_taken_seconds)}</div>
                <div className="text-sm opacity-90">Time Taken</div>
              </div>
            </div>
          </div>
        </Card>

        {/* Performance Analysis */}
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Performance Analysis</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-950 rounded-lg">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
              <div>
                <div className="text-2xl font-bold text-green-600">{result.score}</div>
                <div className="text-sm text-muted-foreground">Correct</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-950 rounded-lg">
              <XCircle className="w-8 h-8 text-red-600" />
              <div>
                <div className="text-2xl font-bold text-red-600">
                  {getDisplayTotal() - result.score}
                </div>
                <div className="text-sm text-muted-foreground">Incorrect</div>
              </div>
            </div>
          </div>
        </Card>

        {/* Subject-wise Breakdown for Mock Tests */}
        {isMockTest && subjectBreakdown.length > 0 && (
          <Card className="p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">Subject-wise Performance</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {subjectBreakdown.map((subject) => (
                <div key={subject.subject} className="p-4 border rounded-lg bg-muted/20">
                  <h3 className="font-semibold text-lg mb-2">{subject.subject}</h3>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>Score:</span>
                      <span className="font-medium">{subject.correct}/{subject.total}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Percentage:</span>
                      <span className={`font-bold ${
                        subject.percentage >= 80 ? 'text-green-600' : 
                        subject.percentage >= 60 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {subject.percentage.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2 mt-2">
                      <div 
                        className={`h-2 rounded-full transition-all ${
                          subject.percentage >= 80 ? 'bg-green-600' : 
                          subject.percentage >= 60 ? 'bg-yellow-600' : 'bg-red-600'
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

        {/* Detailed Review */}
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-bold mb-6">Detailed Review</h2>
          <div className="space-y-6">
            {Object.entries(result.answers).map(([questionIndex, selectedAnswer]) => {
              const qIndex = parseInt(questionIndex);
              const question = test.questions[qIndex];
              const isCorrect = selectedAnswer === question.correctAnswer;
              
              return (
                <div key={qIndex} className={`p-4 rounded-lg border-2 ${
                  isCorrect ? 'border-green-500 bg-green-50 dark:bg-green-950/20' : 'border-red-500 bg-red-50 dark:bg-red-950/20'
                }`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">Q{qIndex + 1}.</span>
                      {isCorrect ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600" />
                      )}
                    </div>
                    <Badge className={isCorrect ? 'bg-green-600' : 'bg-red-600'}>
                      {isCorrect ? 'Correct' : 'Incorrect'}
                    </Badge>
                  </div>
                  
                  <p className="font-medium mb-4">{question.question}</p>
                  
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
                            <span>{option}</span>
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
                  {question.explanation && (
                    <div className="mt-4 p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                      <div className="flex items-start gap-2">
                        <Lightbulb className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-semibold text-amber-800 dark:text-amber-200 mb-1">Explanation</p>
                          <p className="text-sm text-amber-700 dark:text-amber-300">{question.explanation}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        {/* Ranking Card */}
        {ranking && (
          <Card className="p-6 mb-6 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30 border-amber-200 dark:border-amber-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-amber-100 dark:bg-amber-900">
                  <Trophy className="w-8 h-8 text-amber-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-amber-800 dark:text-amber-200">Your Ranking</h2>
                  <p className="text-amber-600 dark:text-amber-400">
                    #{ranking.rank} out of {ranking.totalStudents} students
                  </p>
                </div>
              </div>
              <Badge className="text-lg px-4 py-2 bg-amber-500 text-white">
                Rank #{ranking.rank}
              </Badge>
            </div>
          </Card>
        )}

        {/* Actions */}
        <div className="flex gap-4 justify-center flex-wrap">
          <Button onClick={() => navigate("/")} variant="outline" size="lg">
            Back to Home
          </Button>
          <Button onClick={() => navigate(`/take-test/${testId}`)} size="lg">
            Retake Test
          </Button>
          <Button 
            onClick={() => {
              if (!profile || !result || !test) return;
              
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
                rank: ranking?.rank,
                totalStudents: ranking?.totalStudents,
                subjectBreakdown: isMockTest ? subjectBreakdown : undefined
              });
              toast.success("Result downloaded successfully!");
            }}
            variant="secondary"
            size="lg"
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            Download Result
          </Button>
        </div>
      </div>
    </div>
  );
}
