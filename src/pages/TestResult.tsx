import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle2, XCircle, Clock, Award } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface Question {
  question: string;
  options: string[];
  correctAnswer: number;
  imageUrl?: string;
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

export default function TestResult() {
  const { testId } = useParams();
  const navigate = useNavigate();
  const [result, setResult] = useState<TestResult | null>(null);
  const [test, setTest] = useState<Test | null>(null);

  useEffect(() => {
    fetchResultAndTest();
  }, [testId]);

  const fetchResultAndTest = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

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

      // Fetch test details
      const { data: testData, error: testError } = await supabase
        .from("tests")
        .select("*")
        .eq("id", testId)
        .single();

      if (testError) throw testError;

      setResult(resultData as unknown as TestResult);
      setTest(testData as unknown as Test);
    } catch (error) {
      toast.error("Failed to load test result");
      navigate("/dashboard");
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getPercentage = () => {
    if (!result) return 0;
    return ((result.score / result.total_questions) * 100).toFixed(1);
  };

  const getSubjectBreakdown = (): SubjectBreakdown[] => {
    if (!test || test.test_type !== 'mock_test') return [];
    
    const subjects = ['physics', 'chemistry', 'mathematics'];
    const breakdown: SubjectBreakdown[] = [];
    
    subjects.forEach((subject, subjectIndex) => {
      const startIdx = subjectIndex * 25;
      const endIdx = startIdx + 25;
      let correct = 0;
      
      for (let i = startIdx; i < endIdx; i++) {
        if (result.answers[i] === test.questions[i].correctAnswer) {
          correct++;
        }
      }
      
      breakdown.push({
        subject: subject.charAt(0).toUpperCase() + subject.slice(1),
        correct,
        total: 25,
        percentage: (correct / 25) * 100
      });
    });
    
    return breakdown;
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
              {test.title} {isMockTest ? '- Mock Test' : `- ${test.subject}`}
            </p>
            
            <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto">
              <div className="bg-white/10 rounded-lg p-4">
                <div className="text-4xl font-bold">{result.score}</div>
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
                  {result.total_questions - result.score}
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
                </div>
              );
            })}
          </div>
        </Card>

        {/* Actions */}
        <div className="flex gap-4 justify-center">
          <Button onClick={() => navigate("/dashboard")} variant="outline" size="lg">
            Back to Dashboard
          </Button>
          <Button onClick={() => navigate(`/take-test/${testId}`)} size="lg">
            Retake Test
          </Button>
        </div>
      </div>
    </div>
  );
}
