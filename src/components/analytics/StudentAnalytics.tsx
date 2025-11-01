import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, Target, Award, Calendar } from "lucide-react";

interface TestResult {
  score: number;
  total_questions: number;
  completed_at: string;
  test_id: string;
}

interface PerformanceTrend {
  date: string;
  percentage: number;
}

export const StudentAnalytics = () => {
  const [results, setResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchResults();
  }, []);

  const fetchResults = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data, error } = await supabase
      .from("test_results")
      .select("*")
      .eq("student_id", session.user.id)
      .order("completed_at", { ascending: true });

    if (!error && data) {
      setResults(data as TestResult[]);
    }
    setLoading(false);
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
            <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No Data Yet</p>
            <p className="text-sm mt-2">Complete tests to see your analytics</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate statistics
  const totalTests = results.length;
  const totalCorrect = results.reduce((sum, r) => sum + r.score, 0);
  const totalQuestions = results.reduce((sum, r) => sum + r.total_questions, 0);
  const avgPercentage = ((totalCorrect / totalQuestions) * 100).toFixed(1);
  
  const bestScore = Math.max(...results.map(r => (r.score / r.total_questions) * 100));
  const recentScore = results.length > 0 ? (results[results.length - 1].score / results[results.length - 1].total_questions) * 100 : 0;

  // Performance trend data
  const performanceTrend: PerformanceTrend[] = results.map((r) => ({
    date: new Date(r.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    percentage: Number(((r.score / r.total_questions) * 100).toFixed(1)),
  }));

  // Score distribution
  const scoreDistribution = [
    { name: "Excellent (80-100%)", value: results.filter(r => (r.score / r.total_questions) * 100 >= 80).length, color: "hsl(var(--success))" },
    { name: "Good (60-79%)", value: results.filter(r => {
      const p = (r.score / r.total_questions) * 100;
      return p >= 60 && p < 80;
    }).length, color: "hsl(var(--accent))" },
    { name: "Average (40-59%)", value: results.filter(r => {
      const p = (r.score / r.total_questions) * 100;
      return p >= 40 && p < 60;
    }).length, color: "hsl(var(--warning))" },
    { name: "Needs Work (<40%)", value: results.filter(r => (r.score / r.total_questions) * 100 < 40).length, color: "hsl(var(--destructive))" },
  ];

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
            <CardTitle className="text-sm font-medium">Tests Completed</CardTitle>
            <Calendar className="h-5 w-5" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalTests}</div>
            <p className="text-xs opacity-80 mt-1">Total attempts</p>
          </CardContent>
        </Card>

        <Card className={recentScore >= Number(avgPercentage) ? "bg-success/10 border-success" : "bg-warning/10 border-warning"}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Score</CardTitle>
            <TrendingUp className="h-5 w-5" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{recentScore.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {recentScore >= Number(avgPercentage) ? "Above average!" : "Keep improving"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Trend Chart */}
      <Card className="shadow-md hover:shadow-lg transition-shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Performance Trend
          </CardTitle>
          <CardDescription>Your score progression over time</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={performanceTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="date" 
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

      {/* Score Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-md hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-accent" />
              Score Distribution
            </CardTitle>
            <CardDescription>Breakdown of your performance levels</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={scoreDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => percent > 0 ? `${(percent * 100).toFixed(0)}%` : ''}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {scoreDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--card))", 
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px"
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-md hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-success" />
              Test Scores
            </CardTitle>
            <CardDescription>Individual test performance</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={results.slice(-8).map((r, i) => ({
                test: `Test ${i + 1}`,
                percentage: Number(((r.score / r.total_questions) * 100).toFixed(1))
              }))}>
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
                <Bar 
                  dataKey="percentage" 
                  fill="hsl(var(--accent))"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
