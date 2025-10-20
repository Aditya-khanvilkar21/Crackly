import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle2, XCircle, Clock, Award } from "lucide-react";
import { toast } from "sonner";

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
  subject: string;
  chapter: string;
  questions: Array<{
    question: string;
    options: string[];
    correct_answer: number;
  }>;
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
      console.error("Error fetching result:", error);
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

  if (!result || !test) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Result Summary */}
        <Card className="p-8 mb-8 bg-gradient-primary text-primary-foreground">
          <div className="text-center">
            <Award className="w-16 h-16 mx-auto mb-4" />
            <h1 className="text-3xl font-bold mb-2">Test Completed!</h1>
            <p className="text-lg opacity-90 mb-6">
              {test.title} - {test.subject}
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
