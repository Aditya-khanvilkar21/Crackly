import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, Target, Award, BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MockTestInsights } from "./MockTestInsights";

interface MockTestResult {
  id: string;
  score: number;
  total_questions: number;
  answers: Record<number, number>;
  completed_at: string;
  test_id: string;
  test_title?: string;
}

interface SubjectStats {
  subject: string;
  correct: number;
  total: number;
  percentage: number;
}

interface Test {
  id: string;
  title: string;
  questions: any[];
}

export const MockTestAnalytics = () => {
  const [results, setResults] = useState<MockTestResult[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMockTestResults();
  }, []);

  const fetchMockTestResults = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // Fetch mock test results
    const { data: resultsData, error: resultsError } = await supabase
      .from("test_results")
      .select("*, tests!inner(id, title, test_type, questions)")
      .eq("student_id", session.user.id)
      .eq("tests.test_type", "mock_test")
      .order("completed_at", { ascending: true });

    if (!resultsError && resultsData) {
      const formattedResults = resultsData.map((r: any) => ({
        ...r,
        test_title: r.tests.title
      }));
      setResults(formattedResults);
      
      // Extract unique tests
      const uniqueTests = resultsData.map((r: any) => r.tests);
      setTests(uniqueTests);
    }
    setLoading(false);
  };

  const calculateSubjectStats = (result: MockTestResult, test: Test): SubjectStats[] => {
    const subjects = ['Physics', 'Chemistry', 'Mathematics'];
    const stats: SubjectStats[] = [];

    subjects.forEach((subject, subjectIndex) => {
      const startIdx = subjectIndex * 25;
      const endIdx = startIdx + 25;
      let correct = 0;

      for (let i = startIdx; i < endIdx; i++) {
        if (result.answers[i] === test.questions[i]?.correctAnswer) {
          correct++;
        }
      }

      stats.push({
        subject,
        correct,
        total: 25,
        percentage: (correct / 25) * 100
      });
    });

    return stats;
  };

  const getOverallSubjectStats = (): SubjectStats[] => {
    if (results.length === 0 || tests.length === 0) return [];

    const subjects = ['Physics', 'Chemistry', 'Mathematics'];
    const aggregated = subjects.map(subject => ({
      subject,
      correct: 0,
      total: 0,
      percentage: 0
    }));

    results.forEach(result => {
      const test = tests.find(t => t.id === result.test_id);
      if (!test) return;

      const subjectStats = calculateSubjectStats(result, test);
      subjectStats.forEach((stat, index) => {
        aggregated[index].correct += stat.correct;
        aggregated[index].total += stat.total;
      });
    });

    return aggregated.map(agg => ({
      ...agg,
      percentage: agg.total > 0 ? (agg.correct / agg.total) * 100 : 0
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="pt-6">
          <div className="text-center py-12 text-muted-foreground">
            <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No Mock Test Data</p>
            <p className="text-sm mt-2">Complete mock tests to see your analytics</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalMockTests = results.length;
  const totalCorrect = results.reduce((sum, r) => sum + r.score, 0);
  const totalQuestions = results.reduce((sum, r) => sum + r.total_questions, 0);
  const avgPercentage = ((totalCorrect / totalQuestions) * 100).toFixed(1);
  const bestScore = Math.max(...results.map(r => (r.score / r.total_questions) * 100));
  
  const subjectStats = getOverallSubjectStats();
  
  // Performance trend
  const performanceTrend = results.map((r, idx) => ({
    test: `Test ${idx + 1}`,
    date: new Date(r.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    percentage: Number(((r.score / r.total_questions) * 100).toFixed(1))
  }));

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="gradient-primary text-white border-0 shadow-primary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white/90">Average Score</CardTitle>
            <Target className="h-5 w-5 text-white/90" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{avgPercentage}%</div>
            <p className="text-xs text-white/80 mt-1">
              {totalCorrect} / {totalQuestions} questions
            </p>
          </CardContent>
        </Card>

        <Card className="bg-success text-success-foreground border-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Best Score</CardTitle>
            <Award className="h-5 w-5" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{bestScore.toFixed(1)}%</div>
            <p className="text-xs opacity-80 mt-1">Your top performance</p>
          </CardContent>
        </Card>

        <Card className="bg-accent text-accent-foreground border-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mock Tests</CardTitle>
            <BookOpen className="h-5 w-5" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalMockTests}</div>
            <p className="text-xs opacity-80 mt-1">Total completed</p>
          </CardContent>
        </Card>

        <Card className="bg-primary/10 border-primary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Questions Solved</CardTitle>
            <TrendingUp className="h-5 w-5" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalQuestions}</div>
            <p className="text-xs text-muted-foreground mt-1">Across all mock tests</p>
          </CardContent>
        </Card>
      </div>

      {/* Subject-wise Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-md hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Subject-wise Performance
            </CardTitle>
            <CardDescription>Your performance across different subjects</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={subjectStats}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis dataKey="subject" stroke="hsl(var(--muted-foreground))" />
                <PolarRadiusAxis angle={90} domain={[0, 100]} stroke="hsl(var(--muted-foreground))" />
                <Radar 
                  name="Percentage" 
                  dataKey="percentage" 
                  stroke="hsl(var(--primary))" 
                  fill="hsl(var(--primary))" 
                  fillOpacity={0.6} 
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--card))", 
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px"
                  }}
                  formatter={(value: number) => `${value.toFixed(1)}%`}
                />
              </RadarChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
              {subjectStats.map(stat => (
                <div key={stat.subject} className="flex items-center justify-between text-sm">
                  <span className="font-medium">{stat.subject}:</span>
                  <span className={`font-bold ${
                    stat.percentage >= 80 ? 'text-green-600' : 
                    stat.percentage >= 60 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {stat.correct}/{stat.total} ({stat.percentage.toFixed(1)}%)
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-accent" />
              Performance Trend
            </CardTitle>
            <CardDescription>Your score progression over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={performanceTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="test" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  domain={[0, 100]}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--card))", 
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px"
                  }}
                  formatter={(value: number) => [`${value}%`, "Score"]}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="percentage" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={3}
                  dot={{ fill: "hsl(var(--primary))", r: 5 }}
                  activeDot={{ r: 7 }}
                  name="Score %"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Mock Test History */}
      <Card className="shadow-md hover:shadow-lg transition-shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Mock Test History
          </CardTitle>
          <CardDescription>Complete history of all your mock tests</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            <div className="space-y-3">
              {results.map((result, idx) => {
                const percentage = (result.score / result.total_questions) * 100;
                const test = tests.find(t => t.id === result.test_id);
                const subjectBreakdown = test ? calculateSubjectStats(result, test) : [];

                return (
                  <Card key={result.id} className="p-4 bg-muted/30">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-semibold">{result.test_title || `Mock Test ${idx + 1}`}</h4>
                        <p className="text-sm text-muted-foreground">
                          {new Date(result.completed_at).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                      <Badge className={
                        percentage >= 80 ? 'bg-green-600' : 
                        percentage >= 60 ? 'bg-yellow-600' : 'bg-red-600'
                      }>
                        {percentage.toFixed(1)}%
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      {subjectBreakdown.map(sub => (
                        <div key={sub.subject} className="p-2 bg-background rounded">
                          <div className="font-medium text-xs mb-1">{sub.subject}</div>
                          <div className="font-bold">{sub.correct}/{sub.total}</div>
                          <div className={`text-xs ${
                            sub.percentage >= 80 ? 'text-green-600' : 
                            sub.percentage >= 60 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {sub.percentage.toFixed(0)}%
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};
