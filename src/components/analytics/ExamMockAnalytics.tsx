import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Users, TrendingUp, BookOpen, Award, Target, ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type ExamType = 'JEE' | 'NEET' | 'CET';
type Subject = 'physics' | 'chemistry' | 'mathematics' | 'biology';

interface StudentPerformance {
  studentName: string;
  studentId: string;
  avgScore: number;
  mockTestsTaken: number;
  physicsAvg: number;
  chemistryAvg: number;
  mathOrBioAvg: number;
  rank: number;
}

interface ExamMockAnalyticsProps {
  examType: ExamType;
  userRole: string;
  onBack: () => void;
}

const getSubjects = (examType: ExamType): { key: string; label: string }[] => {
  if (examType === 'NEET') {
    return [
      { key: 'physics', label: 'Physics' },
      { key: 'chemistry', label: 'Chemistry' },
      { key: 'biology', label: 'Biology' },
    ];
  }
  return [
    { key: 'physics', label: 'Physics' },
    { key: 'chemistry', label: 'Chemistry' },
    { key: 'mathematics', label: 'Mathematics' },
  ];
};

export const ExamMockAnalytics = ({ examType, userRole, onBack }: ExamMockAnalyticsProps) => {
  const [studentPerformances, setStudentPerformances] = useState<StudentPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalMockTests, setTotalMockTests] = useState(0);

  const subjects = getSubjects(examType);

  useEffect(() => {
    fetchMockTestAnalytics();
  }, [examType]);

  const fetchMockTestAnalytics = async () => {
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

      // Get mock test results for this exam type
      const { data: resultsData } = await supabase
        .from("test_results")
        .select("*, tests!inner(id, title, test_type, exam_type, questions)")
        .in("student_id", studentIds)
        .eq("tests.test_type", "mock_test")
        .eq("tests.exam_type", examType);

      // Get student profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, student_id")
        .in("id", studentIds);

      if (resultsData && profiles) {
        setTotalMockTests(resultsData.length);

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
          thirdSubjectCorrect: number;
          thirdSubjectTotal: number;
        }>();

        resultsData.forEach((r: any) => {
          const test = r.tests;
          const profile = profiles.find(p => p.id === r.student_id);
          
          const existing = studentStats.get(r.student_id) || {
            name: profile?.full_name || "Unknown",
            studentId: profile?.student_id || "",
            totalScore: 0,
            totalQuestions: 0,
            testCount: 0,
            physicsCorrect: 0,
            physicsTotal: 0,
            chemistryCorrect: 0,
            chemistryTotal: 0,
            thirdSubjectCorrect: 0,
            thirdSubjectTotal: 0,
          };

          // Calculate subject-wise scores (assuming 25 questions per subject)
          const questions = test.questions || [];
          const answers = r.answers || {};

          // Physics: 0-24
          for (let i = 0; i < Math.min(25, questions.length); i++) {
            if (answers[i] === questions[i]?.correctAnswer) existing.physicsCorrect++;
            existing.physicsTotal++;
          }
          // Chemistry: 25-49
          for (let i = 25; i < Math.min(50, questions.length); i++) {
            if (answers[i] === questions[i]?.correctAnswer) existing.chemistryCorrect++;
            existing.chemistryTotal++;
          }
          // Math/Bio: 50-74
          for (let i = 50; i < Math.min(75, questions.length); i++) {
            if (answers[i] === questions[i]?.correctAnswer) existing.thirdSubjectCorrect++;
            existing.thirdSubjectTotal++;
          }

          studentStats.set(r.student_id, {
            ...existing,
            totalScore: existing.totalScore + r.score,
            totalQuestions: existing.totalQuestions + r.total_questions,
            testCount: existing.testCount + 1,
          });
        });

        const performances: StudentPerformance[] = Array.from(studentStats.values())
          .map(s => ({
            studentName: s.name,
            studentId: s.studentId,
            avgScore: s.totalQuestions > 0 ? (s.totalScore / s.totalQuestions) * 100 : 0,
            mockTestsTaken: s.testCount,
            physicsAvg: s.physicsTotal > 0 ? (s.physicsCorrect / s.physicsTotal) * 100 : 0,
            chemistryAvg: s.chemistryTotal > 0 ? (s.chemistryCorrect / s.chemistryTotal) * 100 : 0,
            mathOrBioAvg: s.thirdSubjectTotal > 0 ? (s.thirdSubjectCorrect / s.thirdSubjectTotal) * 100 : 0,
            rank: 0,
          }))
          .sort((a, b) => b.avgScore - a.avgScore)
          .map((s, idx) => ({ ...s, rank: idx + 1 }));

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

  if (studentPerformances.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="space-y-4"
      >
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-xl font-bold">Mock Test Analytics</h2>
            <p className="text-sm text-muted-foreground">{examType}</p>
          </div>
        </div>
        <Card className="border-dashed">
          <CardContent className="pt-6">
            <div className="text-center py-12 text-muted-foreground">
              <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No Mock Test Data</p>
              <p className="text-sm mt-2">Students need to complete {examType} mock tests to see analytics</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  const avgClassScore = studentPerformances.reduce((sum, s) => sum + s.avgScore, 0) / studentPerformances.length;
  
  const subjectData = [
    { subject: subjects[0].label, percentage: studentPerformances.reduce((sum, s) => sum + s.physicsAvg, 0) / studentPerformances.length },
    { subject: subjects[1].label, percentage: studentPerformances.reduce((sum, s) => sum + s.chemistryAvg, 0) / studentPerformances.length },
    { subject: subjects[2].label, percentage: studentPerformances.reduce((sum, s) => sum + s.mathOrBioAvg, 0) / studentPerformances.length },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-4"
    >
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-xl font-bold">Mock Test Analytics</h2>
          <p className="text-sm text-muted-foreground">{examType}</p>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-primary text-primary-foreground border-0">
          <CardContent className="p-4">
            <Users className="h-5 w-5 mb-2" />
            <div className="text-2xl font-bold">{studentPerformances.length}</div>
            <p className="text-xs opacity-80">Students</p>
          </CardContent>
        </Card>
        <Card className="bg-accent text-accent-foreground border-0">
          <CardContent className="p-4">
            <BookOpen className="h-5 w-5 mb-2" />
            <div className="text-2xl font-bold">{totalMockTests}</div>
            <p className="text-xs opacity-80">Total Tests</p>
          </CardContent>
        </Card>
        <Card className="bg-success text-success-foreground border-0">
          <CardContent className="p-4">
            <Target className="h-5 w-5 mb-2" />
            <div className="text-2xl font-bold">{avgClassScore.toFixed(1)}%</div>
            <p className="text-xs opacity-80">Class Average</p>
          </CardContent>
        </Card>
        <Card className="gradient-primary text-white border-0">
          <CardContent className="p-4">
            <Award className="h-5 w-5 mb-2 text-white/90" />
            <div className="text-2xl font-bold">{studentPerformances[0]?.avgScore.toFixed(1)}%</div>
            <p className="text-xs text-white/80">Top Score</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Subject Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
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

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-accent" />
              Top Performers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={studentPerformances.slice(0, 6)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" domain={[0, 100]} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis type="category" dataKey="studentName" width={100} stroke="hsl(var(--muted-foreground))" fontSize={10} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--card))", 
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px"
                  }}
                  formatter={(value: number) => [`${value.toFixed(1)}%`, "Score"]}
                />
                <Bar dataKey="avgScore" fill="hsl(var(--accent))" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Leaderboard */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Student Rankings
          </CardTitle>
          <CardDescription>Complete mock test performance breakdown</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-80">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Rank</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead className="text-center">Tests</TableHead>
                  <TableHead className="text-center">{subjects[0].label}</TableHead>
                  <TableHead className="text-center">{subjects[1].label}</TableHead>
                  <TableHead className="text-center">{subjects[2].label}</TableHead>
                  <TableHead className="text-right">Overall</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {studentPerformances.map((student) => (
                  <TableRow key={student.studentId}>
                    <TableCell>
                      {student.rank <= 3 ? (
                        <Badge className={
                          student.rank === 1 ? 'bg-yellow-500' :
                          student.rank === 2 ? 'bg-gray-400' : 'bg-orange-600'
                        }>
                          #{student.rank}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">#{student.rank}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{student.studentName}</div>
                        <div className="text-xs text-muted-foreground">{student.studentId}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">{student.mockTestsTaken}</TableCell>
                    <TableCell className="text-center">
                      <span className={
                        student.physicsAvg >= 80 ? 'text-green-600 font-medium' :
                        student.physicsAvg >= 60 ? 'text-yellow-600' : 'text-red-600'
                      }>
                        {student.physicsAvg.toFixed(1)}%
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={
                        student.chemistryAvg >= 80 ? 'text-green-600 font-medium' :
                        student.chemistryAvg >= 60 ? 'text-yellow-600' : 'text-red-600'
                      }>
                        {student.chemistryAvg.toFixed(1)}%
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={
                        student.mathOrBioAvg >= 80 ? 'text-green-600 font-medium' :
                        student.mathOrBioAvg >= 60 ? 'text-yellow-600' : 'text-red-600'
                      }>
                        {student.mathOrBioAvg.toFixed(1)}%
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge className={
                        student.avgScore >= 80 ? 'bg-green-600' :
                        student.avgScore >= 60 ? 'bg-yellow-600' : 'bg-red-600'
                      }>
                        {student.avgScore.toFixed(1)}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </motion.div>
  );
};
