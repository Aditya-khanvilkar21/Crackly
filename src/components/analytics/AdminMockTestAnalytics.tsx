import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, LineChart, Line, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Users, TrendingUp, BookOpen, Award, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

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
  avg_score: number;
  mock_tests_taken: number;
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
  const [tests, setTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMockTestAnalytics();
  }, []);

  const fetchMockTestAnalytics = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const isSuperAdmin = userRole === "super_admin";

      // Get classes for this admin
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

      // Get students in these classes
      const { data: classStudents } = await supabase
        .from("class_students")
        .select("student_id")
        .in("class_id", classIds);

      if (!classStudents || classStudents.length === 0) {
        setLoading(false);
        return;
      }

      const studentIds = [...new Set(classStudents.map(cs => cs.student_id))];

      // Get mock test results
      const { data: resultsData } = await supabase
        .from("test_results")
        .select("*, tests!inner(id, title, test_type, questions)")
        .in("student_id", studentIds)
        .eq("tests.test_type", "mock_test");

      // Get student profiles
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
        const uniqueTests = resultsData.map((r: any) => r.tests);
        setTests(uniqueTests);

        // Calculate student performances
        const studentStats = new Map<string, {
          name: string;
          studentId: string;
          totalScore: number;
          totalQuestions: number;
          testCount: number;
          physicsCorrect: number;
          physicsTotal: number;
          chemistryCorrect: number;
          chemistryTotal: number;
          mathematicsCorrect: number;
          mathematicsTotal: number;
        }>();

        resultsData.forEach((r: any) => {
          const test = r.tests;
          const existing = studentStats.get(r.student_id) || {
            name: profiles.find(p => p.id === r.student_id)?.full_name || "Unknown",
            studentId: profiles.find(p => p.id === r.student_id)?.student_id || "",
            totalScore: 0,
            totalQuestions: 0,
            testCount: 0,
            physicsCorrect: 0,
            physicsTotal: 0,
            chemistryCorrect: 0,
            chemistryTotal: 0,
            mathematicsCorrect: 0,
            mathematicsTotal: 0,
          };

          // Calculate subject-wise scores
          for (let i = 0; i < 25; i++) {
            const isCorrect = r.answers[i] === test.questions[i]?.correctAnswer;
            if (isCorrect) existing.physicsCorrect++;
            existing.physicsTotal++;
          }
          for (let i = 25; i < 50; i++) {
            const isCorrect = r.answers[i] === test.questions[i]?.correctAnswer;
            if (isCorrect) existing.chemistryCorrect++;
            existing.chemistryTotal++;
          }
          for (let i = 50; i < 75; i++) {
            const isCorrect = r.answers[i] === test.questions[i]?.correctAnswer;
            if (isCorrect) existing.mathematicsCorrect++;
            existing.mathematicsTotal++;
          }

          studentStats.set(r.student_id, {
            ...existing,
            totalScore: existing.totalScore + r.score,
            totalQuestions: existing.totalQuestions + r.total_questions,
            testCount: existing.testCount + 1,
          });
        });

        const performances: StudentPerformance[] = Array.from(studentStats.entries())
          .map(([id, stats]) => ({
            student_name: stats.name,
            student_id: stats.studentId,
            avg_score: (stats.totalScore / stats.totalQuestions) * 100,
            mock_tests_taken: stats.testCount,
            physics_avg: stats.physicsTotal > 0 ? (stats.physicsCorrect / stats.physicsTotal) * 100 : 0,
            chemistry_avg: stats.chemistryTotal > 0 ? (stats.chemistryCorrect / stats.chemistryTotal) * 100 : 0,
            mathematics_avg: stats.mathematicsTotal > 0 ? (stats.mathematicsCorrect / stats.mathematicsTotal) * 100 : 0,
          }))
          .sort((a, b) => b.avg_score - a.avg_score);

        setStudentPerformances(performances);
      }
    } catch (error) {
      console.error("Error fetching mock test analytics:", error);
    } finally {
      setLoading(false);
    }
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
  
  // Overall subject averages
  const overallSubjectAvgs = {
    physics: studentPerformances.length > 0 
      ? studentPerformances.reduce((sum, s) => sum + s.physics_avg, 0) / studentPerformances.length 
      : 0,
    chemistry: studentPerformances.length > 0 
      ? studentPerformances.reduce((sum, s) => sum + s.chemistry_avg, 0) / studentPerformances.length 
      : 0,
    mathematics: studentPerformances.length > 0 
      ? studentPerformances.reduce((sum, s) => sum + s.mathematics_avg, 0) / studentPerformances.length 
      : 0,
  };

  const subjectData = [
    { subject: "Physics", percentage: overallSubjectAvgs.physics },
    { subject: "Chemistry", percentage: overallSubjectAvgs.chemistry },
    { subject: "Mathematics", percentage: overallSubjectAvgs.mathematics },
  ];

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
            <CardTitle className="text-sm font-medium">Total Mock Tests</CardTitle>
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
            <CardTitle className="text-sm font-medium text-white/90">Best Performance</CardTitle>
            <Award className="h-5 w-5 text-white/90" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {studentPerformances[0]?.avg_score.toFixed(1)}%
            </div>
            <p className="text-xs text-white/80 mt-1">{studentPerformances[0]?.student_name}</p>
          </CardContent>
        </Card>
      </div>

      {/* Subject-wise Class Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-md hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Subject-wise Class Performance
            </CardTitle>
            <CardDescription>Average scores across different subjects</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={subjectData}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis dataKey="subject" stroke="hsl(var(--muted-foreground))" />
                <PolarRadiusAxis angle={90} domain={[0, 100]} stroke="hsl(var(--muted-foreground))" />
                <Radar 
                  name="Average %" 
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
          </CardContent>
        </Card>

        <Card className="shadow-md hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-accent" />
              Top Performers
            </CardTitle>
            <CardDescription>Students with highest mock test scores</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={studentPerformances.slice(0, 8)} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  type="number"
                  domain={[0, 100]}
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis 
                  type="category"
                  dataKey="student_name"
                  width={100}
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={10}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--card))", 
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px"
                  }}
                  formatter={(value: number) => [`${value.toFixed(1)}%`, "Average Score"]}
                />
                <Bar 
                  dataKey="avg_score" 
                  fill="hsl(var(--accent))"
                  radius={[0, 8, 8, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Student Details */}
      <Card className="shadow-md hover:shadow-lg transition-shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Student Performance Details
          </CardTitle>
          <CardDescription>Detailed breakdown of each student's mock test performance</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            <div className="space-y-3">
              {studentPerformances.map((student, idx) => (
                <Card key={student.student_id} className="p-4 bg-muted/30">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-semibold">{student.student_name}</h4>
                      <p className="text-sm text-muted-foreground">ID: {student.student_id}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {student.mock_tests_taken} mock test{student.mock_tests_taken !== 1 ? 's' : ''} completed
                      </p>
                    </div>
                    <Badge className={
                      student.avg_score >= 80 ? 'bg-green-600' : 
                      student.avg_score >= 60 ? 'bg-yellow-600' : 'bg-red-600'
                    }>
                      {student.avg_score.toFixed(1)}%
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div className="p-2 bg-background rounded">
                      <div className="font-medium text-xs mb-1">Physics</div>
                      <div className={`font-bold ${
                        student.physics_avg >= 80 ? 'text-green-600' : 
                        student.physics_avg >= 60 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {student.physics_avg.toFixed(1)}%
                      </div>
                    </div>
                    <div className="p-2 bg-background rounded">
                      <div className="font-medium text-xs mb-1">Chemistry</div>
                      <div className={`font-bold ${
                        student.chemistry_avg >= 80 ? 'text-green-600' : 
                        student.chemistry_avg >= 60 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {student.chemistry_avg.toFixed(1)}%
                      </div>
                    </div>
                    <div className="p-2 bg-background rounded">
                      <div className="font-medium text-xs mb-1">Mathematics</div>
                      <div className={`font-bold ${
                        student.mathematics_avg >= 80 ? 'text-green-600' : 
                        student.mathematics_avg >= 60 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {student.mathematics_avg.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};
