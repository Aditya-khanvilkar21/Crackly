import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Target, TrendingUp, BookOpen, Award, Beaker, Calculator, Atom, Leaf } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface JEENEETComparisonProps {
  userRole: string;
}

interface ExamReadiness {
  jee: {
    physics: number;
    chemistry: number;
    mathematics: number;
    overall: number;
    testsCompleted: number;
  };
  neet: {
    physics: number;
    chemistry: number;
    biology: number;
    overall: number;
    testsCompleted: number;
  };
}

export const JEENEETComparison = ({ userRole }: JEENEETComparisonProps) => {
  const [readiness, setReadiness] = useState<ExamReadiness>({
    jee: { physics: 0, chemistry: 0, mathematics: 0, overall: 0, testsCompleted: 0 },
    neet: { physics: 0, chemistry: 0, biology: 0, overall: 0, testsCompleted: 0 },
  });
  const [studentCount, setStudentCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchComparisonData();
  }, []);

  const fetchComparisonData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const isSuperAdmin = userRole === "super_admin";

      // Get classes for this admin
      let classQuery = supabase.from("tuition_classes").select("id");
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
      setStudentCount(studentIds.length);

      // Get all mock test results with test details
      const { data: resultsData } = await supabase
        .from("test_results")
        .select("*, tests!inner(id, title, test_type, questions)")
        .in("student_id", studentIds)
        .eq("tests.test_type", "mock_test");

      if (resultsData) {
        const jeeStats = { physics: 0, chemistry: 0, mathematics: 0, count: 0, physicsTotal: 0, chemistryTotal: 0, mathTotal: 0 };
        const neetStats = { physics: 0, chemistry: 0, biology: 0, count: 0, physicsTotal: 0, chemistryTotal: 0, bioTotal: 0 };

        resultsData.forEach((r: any) => {
          const test = r.tests;
          const questions = test.questions;
          const isNEET = test.title?.toLowerCase().includes('neet') || questions.length === 180;

          if (isNEET) {
            // NEET: 45 Physics, 45 Chemistry, 90 Biology
            neetStats.count++;
            for (let i = 0; i < 45; i++) {
              if (r.answers[i] === questions[i]?.correctAnswer) neetStats.physics++;
              neetStats.physicsTotal++;
            }
            for (let i = 45; i < 90; i++) {
              if (r.answers[i] === questions[i]?.correctAnswer) neetStats.chemistry++;
              neetStats.chemistryTotal++;
            }
            for (let i = 90; i < 180; i++) {
              if (r.answers[i] === questions[i]?.correctAnswer) neetStats.biology++;
              neetStats.bioTotal++;
            }
          } else {
            // JEE: 25 Physics, 25 Chemistry, 25 Math
            jeeStats.count++;
            for (let i = 0; i < 25; i++) {
              if (r.answers[i] === questions[i]?.correctAnswer) jeeStats.physics++;
              jeeStats.physicsTotal++;
            }
            for (let i = 25; i < 50; i++) {
              if (r.answers[i] === questions[i]?.correctAnswer) jeeStats.chemistry++;
              jeeStats.chemistryTotal++;
            }
            for (let i = 50; i < 75; i++) {
              if (r.answers[i] === questions[i]?.correctAnswer) jeeStats.mathematics++;
              jeeStats.mathTotal++;
            }
          }
        });

        const jeePhysicsAvg = jeeStats.physicsTotal > 0 ? (jeeStats.physics / jeeStats.physicsTotal) * 100 : 0;
        const jeeChemistryAvg = jeeStats.chemistryTotal > 0 ? (jeeStats.chemistry / jeeStats.chemistryTotal) * 100 : 0;
        const jeeMathAvg = jeeStats.mathTotal > 0 ? (jeeStats.mathematics / jeeStats.mathTotal) * 100 : 0;
        const jeeOverall = jeeStats.count > 0 ? (jeePhysicsAvg + jeeChemistryAvg + jeeMathAvg) / 3 : 0;

        const neetPhysicsAvg = neetStats.physicsTotal > 0 ? (neetStats.physics / neetStats.physicsTotal) * 100 : 0;
        const neetChemistryAvg = neetStats.chemistryTotal > 0 ? (neetStats.chemistry / neetStats.chemistryTotal) * 100 : 0;
        const neetBioAvg = neetStats.bioTotal > 0 ? (neetStats.biology / neetStats.bioTotal) * 100 : 0;
        const neetOverall = neetStats.count > 0 ? (neetPhysicsAvg + neetChemistryAvg + neetBioAvg) / 3 : 0;

        setReadiness({
          jee: {
            physics: jeePhysicsAvg,
            chemistry: jeeChemistryAvg,
            mathematics: jeeMathAvg,
            overall: jeeOverall,
            testsCompleted: jeeStats.count,
          },
          neet: {
            physics: neetPhysicsAvg,
            chemistry: neetChemistryAvg,
            biology: neetBioAvg,
            overall: neetOverall,
            testsCompleted: neetStats.count,
          },
        });
      }
    } catch (error) {
      console.error("Error fetching comparison data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getReadinessLevel = (score: number) => {
    if (score >= 80) return { label: "Excellent", color: "bg-green-500" };
    if (score >= 60) return { label: "Good", color: "bg-blue-500" };
    if (score >= 40) return { label: "Average", color: "bg-yellow-500" };
    return { label: "Needs Work", color: "bg-red-500" };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const comparisonData = [
    { subject: "Physics", JEE: readiness.jee.physics, NEET: readiness.neet.physics },
    { subject: "Chemistry", JEE: readiness.jee.chemistry, NEET: readiness.neet.chemistry },
  ];

  const jeeRadarData = [
    { subject: "Physics", score: readiness.jee.physics },
    { subject: "Chemistry", score: readiness.jee.chemistry },
    { subject: "Mathematics", score: readiness.jee.mathematics },
  ];

  const neetRadarData = [
    { subject: "Physics", score: readiness.neet.physics },
    { subject: "Chemistry", score: readiness.neet.chemistry },
    { subject: "Biology", score: readiness.neet.biology },
  ];

  const examDistribution = [
    { name: "JEE Tests", value: readiness.jee.testsCompleted, color: "hsl(var(--primary))" },
    { name: "NEET Tests", value: readiness.neet.testsCompleted, color: "hsl(var(--accent))" },
  ];

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-700 text-white border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              JEE Readiness
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{readiness.jee.overall.toFixed(1)}%</div>
            <p className="text-sm text-white/80 mt-1">{readiness.jee.testsCompleted} tests completed</p>
            <Badge className={`mt-2 ${getReadinessLevel(readiness.jee.overall).color}`}>
              {getReadinessLevel(readiness.jee.overall).label}
            </Badge>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-green-700 text-white border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Leaf className="h-5 w-5" />
              NEET Readiness
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{readiness.neet.overall.toFixed(1)}%</div>
            <p className="text-sm text-white/80 mt-1">{readiness.neet.testsCompleted} tests completed</p>
            <Badge className={`mt-2 ${getReadinessLevel(readiness.neet.overall).color}`}>
              {getReadinessLevel(readiness.neet.overall).label}
            </Badge>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-700 text-white border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Total Students
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{studentCount}</div>
            <p className="text-sm text-white/80 mt-1">Active in your classes</p>
            <Badge className="mt-2 bg-white/20">
              {readiness.jee.testsCompleted + readiness.neet.testsCompleted} total attempts
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Subject-wise Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Atom className="h-5 w-5 text-blue-500" />
              JEE Subject Performance
            </CardTitle>
            <CardDescription>Physics, Chemistry & Mathematics breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <RadarChart data={jeeRadarData}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis dataKey="subject" stroke="hsl(var(--muted-foreground))" />
                <PolarRadiusAxis angle={90} domain={[0, 100]} stroke="hsl(var(--muted-foreground))" />
                <Radar name="Score %" dataKey="score" stroke="hsl(217, 91%, 60%)" fill="hsl(217, 91%, 60%)" fillOpacity={0.5} />
                <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
              </RadarChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm flex items-center gap-2"><Atom className="h-4 w-4" /> Physics</span>
                <div className="flex items-center gap-2 flex-1 max-w-[200px] ml-4">
                  <Progress value={readiness.jee.physics} className="flex-1" />
                  <span className="text-sm font-medium w-12">{readiness.jee.physics.toFixed(0)}%</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm flex items-center gap-2"><Beaker className="h-4 w-4" /> Chemistry</span>
                <div className="flex items-center gap-2 flex-1 max-w-[200px] ml-4">
                  <Progress value={readiness.jee.chemistry} className="flex-1" />
                  <span className="text-sm font-medium w-12">{readiness.jee.chemistry.toFixed(0)}%</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm flex items-center gap-2"><Calculator className="h-4 w-4" /> Mathematics</span>
                <div className="flex items-center gap-2 flex-1 max-w-[200px] ml-4">
                  <Progress value={readiness.jee.mathematics} className="flex-1" />
                  <span className="text-sm font-medium w-12">{readiness.jee.mathematics.toFixed(0)}%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Leaf className="h-5 w-5 text-green-500" />
              NEET Subject Performance
            </CardTitle>
            <CardDescription>Physics, Chemistry & Biology breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <RadarChart data={neetRadarData}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis dataKey="subject" stroke="hsl(var(--muted-foreground))" />
                <PolarRadiusAxis angle={90} domain={[0, 100]} stroke="hsl(var(--muted-foreground))" />
                <Radar name="Score %" dataKey="score" stroke="hsl(142, 71%, 45%)" fill="hsl(142, 71%, 45%)" fillOpacity={0.5} />
                <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
              </RadarChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm flex items-center gap-2"><Atom className="h-4 w-4" /> Physics</span>
                <div className="flex items-center gap-2 flex-1 max-w-[200px] ml-4">
                  <Progress value={readiness.neet.physics} className="flex-1" />
                  <span className="text-sm font-medium w-12">{readiness.neet.physics.toFixed(0)}%</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm flex items-center gap-2"><Beaker className="h-4 w-4" /> Chemistry</span>
                <div className="flex items-center gap-2 flex-1 max-w-[200px] ml-4">
                  <Progress value={readiness.neet.chemistry} className="flex-1" />
                  <span className="text-sm font-medium w-12">{readiness.neet.chemistry.toFixed(0)}%</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm flex items-center gap-2"><Leaf className="h-4 w-4" /> Biology</span>
                <div className="flex items-center gap-2 flex-1 max-w-[200px] ml-4">
                  <Progress value={readiness.neet.biology} className="flex-1" />
                  <span className="text-sm font-medium w-12">{readiness.neet.biology.toFixed(0)}%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Side by Side Comparison */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            JEE vs NEET - Common Subjects Comparison
          </CardTitle>
          <CardDescription>Physics and Chemistry performance across both exams</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={comparisonData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="subject" stroke="hsl(var(--muted-foreground))" />
              <YAxis domain={[0, 100]} stroke="hsl(var(--muted-foreground))" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: "hsl(var(--card))", 
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px"
                }}
                formatter={(value: number) => `${value.toFixed(1)}%`}
              />
              <Legend />
              <Bar dataKey="JEE" fill="hsl(217, 91%, 60%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="NEET" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Exam Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              Test Distribution
            </CardTitle>
            <CardDescription>JEE vs NEET mock tests attempted</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={examDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {examDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              Readiness Summary
            </CardTitle>
            <CardDescription>Overall exam preparation status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
              <div className="flex justify-between items-center mb-2">
                <span className="font-semibold text-blue-700 dark:text-blue-300">JEE Mains</span>
                <Badge className={getReadinessLevel(readiness.jee.overall).color}>
                  {getReadinessLevel(readiness.jee.overall).label}
                </Badge>
              </div>
              <Progress value={readiness.jee.overall} className="h-3" />
              <p className="text-xs text-muted-foreground mt-2">
                {readiness.jee.overall >= 60 
                  ? "Students are on track for JEE preparation" 
                  : "Focus needed on JEE specific topics"}
              </p>
            </div>
            
            <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
              <div className="flex justify-between items-center mb-2">
                <span className="font-semibold text-green-700 dark:text-green-300">NEET</span>
                <Badge className={getReadinessLevel(readiness.neet.overall).color}>
                  {getReadinessLevel(readiness.neet.overall).label}
                </Badge>
              </div>
              <Progress value={readiness.neet.overall} className="h-3" />
              <p className="text-xs text-muted-foreground mt-2">
                {readiness.neet.overall >= 60 
                  ? "Students are on track for NEET preparation" 
                  : "Focus needed on NEET specific topics"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
