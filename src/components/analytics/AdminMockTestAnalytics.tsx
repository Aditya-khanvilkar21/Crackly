import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Users, TrendingUp, TrendingDown, BookOpen, Award, Target, AlertTriangle, Lightbulb, Brain, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StudentTestDrillDown } from "./StudentTestDrillDown";

interface MockTestResult {
  student_id: string;
  score: number;
  total_questions: number;
  answers: Record<number, number>;
  completed_at: string;
  test_id: string;
}

interface StudentPerformance {
  student_name: string;
  student_id: string;
  user_id: string;
  avg_score: number;
  mock_tests_taken: number;
  physics_avg: number;
  chemistry_avg: number;
  mathematics_avg: number;
  weakest_subject: string;
  strongest_subject: string;
  trend: 'improving' | 'declining' | 'stable';
}

interface TestOverview {
  test_id: string;
  test_title: string;
  avg_score: number;
  highest_score: number;
  lowest_score: number;
  students_attempted: number;
  physics_avg: number;
  chemistry_avg: number;
  mathematics_avg: number;
}

interface AdminMockTestAnalyticsProps {
  userRole: string;
}

export const AdminMockTestAnalytics = ({ userRole }: AdminMockTestAnalyticsProps) => {
  const [results, setResults] = useState<MockTestResult[]>([]);
  const [studentPerformances, setStudentPerformances] = useState<StudentPerformance[]>([]);
  const [testOverviews, setTestOverviews] = useState<TestOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [drillDownOpen, setDrillDownOpen] = useState(false);
  const [drillDownStudent, setDrillDownStudent] = useState<{ id: string; name: string; testId: string } | null>(null);
  const [latestTestMap, setLatestTestMap] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    fetchMockTestAnalytics();
  }, []);

  const fetchMockTestAnalytics = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const isSuperAdmin = userRole === "super_admin";

      let classQuery = supabase.from("tuition_classes").select("id, name");
      if (!isSuperAdmin) {
        classQuery = classQuery.eq("admin_id", session.user.id);
      }
      const { data: classes } = await classQuery;

      if (!classes || classes.length === 0) {
        setLoading(false);
        return;
      }

      const classIds = classes.map(c => c.id);

      const { data: classStudents } = await supabase
        .from("class_students")
        .select("student_id")
        .in("class_id", classIds);

      if (!classStudents || classStudents.length === 0) {
        setLoading(false);
        return;
      }

      const studentIds = [...new Set(classStudents.map(cs => cs.student_id))];

      const { data: resultsData } = await supabase
        .from("test_results")
        .select("*, tests!inner(id, title, test_type, questions)")
        .in("student_id", studentIds)
        .eq("tests.test_type", "mock_test")
        .order("completed_at", { ascending: true });

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, student_id")
        .in("id", studentIds);

      if (resultsData && profiles) {
        const formattedResults = resultsData.map((r: any) => ({
          student_id: r.student_id,
          score: r.score,
          total_questions: r.total_questions,
          answers: r.answers as Record<number, number>,
          completed_at: r.completed_at,
          test_id: r.test_id,
        }));
        setResults(formattedResults);

        // --- Per-test overviews ---
        const testMap = new Map<string, { title: string; results: any[]; questions: any[] }>();
        resultsData.forEach((r: any) => {
          const existing = testMap.get(r.test_id) || { title: r.tests.title, results: [], questions: r.tests.questions };
          existing.results.push(r);
          testMap.set(r.test_id, existing);
        });

        const overviews: TestOverview[] = Array.from(testMap.entries()).map(([testId, data]) => {
          const scores = data.results.map((r: any) => (r.score / r.total_questions) * 100);
          const subjectCalc = (start: number, count: number) => {
            let totalCorrect = 0, totalQ = 0;
            data.results.forEach((r: any) => {
              for (let i = start; i < start + count; i++) {
                totalQ++;
                if (r.answers[i] === data.questions[i]?.correctAnswer) totalCorrect++;
              }
            });
            return totalQ > 0 ? (totalCorrect / totalQ) * 100 : 0;
          };

          return {
            test_id: testId,
            test_title: data.title,
            avg_score: scores.reduce((a: number, b: number) => a + b, 0) / scores.length,
            highest_score: Math.max(...scores),
            lowest_score: Math.min(...scores),
            students_attempted: data.results.length,
            physics_avg: subjectCalc(0, 25),
            chemistry_avg: subjectCalc(25, 25),
            mathematics_avg: subjectCalc(50, 25),
          };
        });
        setTestOverviews(overviews);

        // --- Student performances with trend + weak/strong ---
        const studentResultsMap = new Map<string, any[]>();
        const latestTests = new Map<string, string>();
        resultsData.forEach((r: any) => {
          const existing = studentResultsMap.get(r.student_id) || [];
          existing.push(r);
          studentResultsMap.set(r.student_id, existing);
          // Track latest test per student
          const currentLatest = latestTests.get(r.student_id);
          if (!currentLatest || new Date(r.completed_at) > new Date(currentLatest)) {
            latestTests.set(r.student_id, r.test_id);
          }
        });
        setLatestTestMap(latestTests);

        const performances: StudentPerformance[] = Array.from(studentResultsMap.entries())
          .map(([userId, studentResults]) => {
            const profile = profiles.find(p => p.id === userId);
            let physicsC = 0, physicsT = 0, chemC = 0, chemT = 0, mathC = 0, mathT = 0;
            let totalScore = 0, totalQ = 0;

            studentResults.forEach((r: any) => {
              const test = r.tests;
              totalScore += r.score;
              totalQ += r.total_questions;
              for (let i = 0; i < 25; i++) { physicsT++; if (r.answers[i] === test.questions[i]?.correctAnswer) physicsC++; }
              for (let i = 25; i < 50; i++) { chemT++; if (r.answers[i] === test.questions[i]?.correctAnswer) chemC++; }
              for (let i = 50; i < 75; i++) { mathT++; if (r.answers[i] === test.questions[i]?.correctAnswer) mathC++; }
            });

            const phyAvg = physicsT > 0 ? (physicsC / physicsT) * 100 : 0;
            const chemAvg = chemT > 0 ? (chemC / chemT) * 100 : 0;
            const mathAvg = mathT > 0 ? (mathC / mathT) * 100 : 0;

            const subjectAvgs = [
              { name: 'Physics', avg: phyAvg },
              { name: 'Chemistry', avg: chemAvg },
              { name: 'Mathematics', avg: mathAvg },
            ];
            const weakest = [...subjectAvgs].sort((a, b) => a.avg - b.avg)[0].name;
            const strongest = [...subjectAvgs].sort((a, b) => b.avg - a.avg)[0].name;

            // Trend: compare last 2 tests
            let trend: 'improving' | 'declining' | 'stable' = 'stable';
            if (studentResults.length >= 2) {
              const sorted = [...studentResults].sort((a: any, b: any) => new Date(a.completed_at).getTime() - new Date(b.completed_at).getTime());
              const last = (sorted[sorted.length - 1].score / sorted[sorted.length - 1].total_questions) * 100;
              const prev = (sorted[sorted.length - 2].score / sorted[sorted.length - 2].total_questions) * 100;
              trend = last > prev + 5 ? 'improving' : last < prev - 5 ? 'declining' : 'stable';
            }

            return {
              student_name: profile?.full_name || "Unknown",
              student_id: profile?.student_id || "",
              user_id: userId,
              avg_score: totalQ > 0 ? (totalScore / totalQ) * 100 : 0,
              mock_tests_taken: studentResults.length,
              physics_avg: phyAvg,
              chemistry_avg: chemAvg,
              mathematics_avg: mathAvg,
              weakest_subject: weakest,
              strongest_subject: strongest,
              trend,
            };
          })
          .sort((a, b) => b.avg_score - a.avg_score);

        setStudentPerformances(performances);
      }
    } catch (error) {
      console.error("Error fetching mock test analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  // Detect common weak subject across class
  const getCommonWeakSubject = () => {
    if (studentPerformances.length === 0) return null;
    const counts: Record<string, number> = {};
    studentPerformances.forEach(s => {
      counts[s.weakest_subject] = (counts[s.weakest_subject] || 0) + 1;
    });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return sorted[0] ? { subject: sorted[0][0], count: sorted[0][1] } : null;
  };

  // Teacher recommendations
  const getRecommendations = () => {
    const recs: string[] = [];
    const common = getCommonWeakSubject();
    if (common && common.count >= Math.ceil(studentPerformances.length * 0.4)) {
      recs.push(`Most students are weak in ${common.subject}. Revise ${common.subject} in the next class.`);
    }

    testOverviews.forEach(t => {
      const subjects = [
        { name: 'Physics', avg: t.physics_avg },
        { name: 'Chemistry', avg: t.chemistry_avg },
        { name: 'Mathematics', avg: t.mathematics_avg },
      ];
      subjects.forEach(s => {
        if (s.avg < 50) {
          recs.push(`Give more practice in ${s.name} — class average is only ${s.avg.toFixed(0)}% in "${t.test_title}".`);
        }
      });
    });

    // Deduplicate
    return [...new Set(recs)].slice(0, 5);
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
            <p className="text-sm mt-2">Students need to complete mock tests to see analytics</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalMockTests = results.length;
  const avgClassScore = studentPerformances.length > 0
    ? studentPerformances.reduce((sum, s) => sum + s.avg_score, 0) / studentPerformances.length
    : 0;

  const overallSubjectAvgs = {
    physics: studentPerformances.length > 0 ? studentPerformances.reduce((sum, s) => sum + s.physics_avg, 0) / studentPerformances.length : 0,
    chemistry: studentPerformances.length > 0 ? studentPerformances.reduce((sum, s) => sum + s.chemistry_avg, 0) / studentPerformances.length : 0,
    mathematics: studentPerformances.length > 0 ? studentPerformances.reduce((sum, s) => sum + s.mathematics_avg, 0) / studentPerformances.length : 0,
  };

  const subjectData = [
    { subject: "Physics", percentage: overallSubjectAvgs.physics },
    { subject: "Chemistry", percentage: overallSubjectAvgs.chemistry },
    { subject: "Mathematics", percentage: overallSubjectAvgs.mathematics },
  ];

  const getStrengthLabel = (avg: number) => {
    if (avg >= 70) return { label: 'Strong', className: 'bg-green-600' };
    if (avg >= 50) return { label: 'Moderate', className: 'bg-yellow-600' };
    return { label: 'Weak', className: 'bg-red-600' };
  };

  const recommendations = getRecommendations();
  const commonWeak = getCommonWeakSubject();

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-primary text-primary-foreground border-0 shadow-primary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Students</CardTitle>
            <Users className="h-5 w-5" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{studentPerformances.length}</div>
            <p className="text-xs opacity-80 mt-1">Attempted mock tests</p>
          </CardContent>
        </Card>

        <Card className="bg-accent text-accent-foreground border-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Attempts</CardTitle>
            <BookOpen className="h-5 w-5" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalMockTests}</div>
            <p className="text-xs opacity-80 mt-1">Completed attempts</p>
          </CardContent>
        </Card>

        <Card className="bg-success text-success-foreground border-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Class Average</CardTitle>
            <Target className="h-5 w-5" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{avgClassScore.toFixed(1)}%</div>
            <p className="text-xs opacity-80 mt-1">Overall performance</p>
          </CardContent>
        </Card>

        <Card className="gradient-primary text-white border-0 shadow-primary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white/90">Top Performer</CardTitle>
            <Award className="h-5 w-5 text-white/90" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{studentPerformances[0]?.avg_score.toFixed(1)}%</div>
            <p className="text-xs text-white/80 mt-1">{studentPerformances[0]?.student_name}</p>
          </CardContent>
        </Card>
      </div>

      {/* Teacher Recommendations */}
      {recommendations.length > 0 && (
        <Card className="border-amber-300 bg-amber-50/50 dark:bg-amber-950/20 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
              <Lightbulb className="h-5 w-5" />
              Teacher Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recommendations.map((rec, idx) => (
                <div key={idx} className="flex items-start gap-2 p-3 rounded-lg bg-amber-100/50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                  <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-amber-800 dark:text-amber-200">{rec}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Common Problem Detection */}
      {commonWeak && (
        <Card className="border-red-300 bg-red-50/50 dark:bg-red-950/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-red-600" />
              <div>
                <p className="font-semibold text-red-800 dark:text-red-200">
                  Common Problem Detected
                </p>
                <p className="text-sm text-red-700 dark:text-red-300">
                  {commonWeak.count} out of {studentPerformances.length} students are weakest in {commonWeak.subject}. Consider dedicating extra revision time.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Test Overview</TabsTrigger>
          <TabsTrigger value="subjects">Subject Analysis</TabsTrigger>
          <TabsTrigger value="students">Student Insights</TabsTrigger>
        </TabsList>

        {/* Per-Test Overview */}
        <TabsContent value="overview">
          <div className="space-y-4">
            {testOverviews.map(overview => {
              const subjects = [
                { name: 'Physics', avg: overview.physics_avg },
                { name: 'Chemistry', avg: overview.chemistry_avg },
                { name: 'Mathematics', avg: overview.mathematics_avg },
              ];
              return (
                <Card key={overview.test_id} className="shadow-md">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{overview.test_title}</CardTitle>
                      <Badge variant="outline">{overview.students_attempted} students</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="text-center p-3 bg-muted/30 rounded-lg">
                        <div className="text-2xl font-bold">{overview.avg_score.toFixed(1)}%</div>
                        <div className="text-xs text-muted-foreground">Average</div>
                      </div>
                      <div className="text-center p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">{overview.highest_score.toFixed(1)}%</div>
                        <div className="text-xs text-muted-foreground">Highest</div>
                      </div>
                      <div className="text-center p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                        <div className="text-2xl font-bold text-red-600">{overview.lowest_score.toFixed(1)}%</div>
                        <div className="text-xs text-muted-foreground">Lowest</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {subjects.map(s => {
                        const strength = getStrengthLabel(s.avg);
                        return (
                          <div key={s.name} className="p-3 border rounded-lg">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium">{s.name}</span>
                              <Badge className={strength.className}>{strength.label}</Badge>
                            </div>
                            <div className="text-lg font-bold">{s.avg.toFixed(1)}%</div>
                            <div className="w-full bg-muted rounded-full h-1.5 mt-1">
                              <div className={`h-1.5 rounded-full ${
                                s.avg >= 70 ? 'bg-green-600' : s.avg >= 50 ? 'bg-yellow-600' : 'bg-red-600'
                              }`} style={{ width: `${s.avg}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Subject Analysis */}
        <TabsContent value="subjects">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  Subject-wise Class Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={subjectData}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis dataKey="subject" stroke="hsl(var(--muted-foreground))" />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} stroke="hsl(var(--muted-foreground))" />
                    <Radar name="Average %" dataKey="percentage" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.6} />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} formatter={(value: number) => `${value.toFixed(1)}%`} />
                  </RadarChart>
                </ResponsiveContainer>
                <div className="mt-4 space-y-2">
                  {subjectData.map(s => {
                    const strength = getStrengthLabel(s.percentage);
                    return (
                      <div key={s.subject} className="flex items-center justify-between text-sm">
                        <span className="font-medium">{s.subject}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{s.percentage.toFixed(1)}%</span>
                          <Badge className={strength.className}>{strength.label}</Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-accent" />
                  Top Performers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={studentPerformances.slice(0, 8)} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" domain={[0, 100]} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis type="category" dataKey="student_name" width={100} stroke="hsl(var(--muted-foreground))" fontSize={10} />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} formatter={(value: number) => [`${value.toFixed(1)}%`, "Average Score"]} />
                    <Bar dataKey="avg_score" fill="hsl(var(--accent))" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Student Insights */}
        <TabsContent value="students">
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                Student-wise Insights
              </CardTitle>
              <CardDescription>Detailed breakdown with weak/strong subjects and score trends</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-3">
                  {studentPerformances.map((student, idx) => (
                    <Card key={student.user_id} className="p-4 bg-muted/30">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold">{student.student_name}</h4>
                            {student.trend === 'improving' && (
                              <Badge variant="outline" className="border-green-500 text-green-700 text-xs">
                                <TrendingUp className="w-3 h-3 mr-1" /> Improving
                              </Badge>
                            )}
                            {student.trend === 'declining' && (
                              <Badge variant="outline" className="border-red-500 text-red-700 text-xs">
                                <TrendingDown className="w-3 h-3 mr-1" /> Declining
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">ID: {student.student_id} · {student.mock_tests_taken} test{student.mock_tests_taken !== 1 ? 's' : ''}</p>
                        </div>
                        <Badge className={
                          student.avg_score >= 70 ? 'bg-green-600' :
                          student.avg_score >= 50 ? 'bg-yellow-600' : 'bg-red-600'
                        }>
                          {student.avg_score.toFixed(1)}%
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-sm mb-3">
                        {[
                          { name: 'Physics', avg: student.physics_avg },
                          { name: 'Chemistry', avg: student.chemistry_avg },
                          { name: 'Mathematics', avg: student.mathematics_avg },
                        ].map(s => (
                          <div key={s.name} className="p-2 bg-background rounded">
                            <div className="font-medium text-xs mb-1">{s.name}</div>
                            <div className={`font-bold ${
                              s.avg >= 70 ? 'text-green-600' : s.avg >= 50 ? 'text-yellow-600' : 'text-red-600'
                            }`}>{s.avg.toFixed(1)}%</div>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2 text-xs">
                        <Badge variant="outline" className="border-red-300 text-red-700">
                          Weak: {student.weakest_subject}
                        </Badge>
                        <Badge variant="outline" className="border-green-300 text-green-700">
                          Strong: {student.strongest_subject}
                        </Badge>
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
