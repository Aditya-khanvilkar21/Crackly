import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  ArrowLeft, Users, UserCheck, Percent, Target, Trophy, TrendingDown, Clock,
  BarChart3, Search, Sparkles, AlertTriangle, CheckCircle2, ArrowUpRight, ArrowDownRight,
  Minus, ChevronRight, Medal, FileDown, Lightbulb, TrendingUp,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { motion } from "framer-motion";
import { LatexRenderer } from "@/components/LatexRenderer";
import { downloadParentReport } from "@/lib/downloadParentReport";
import { toast } from "@/hooks/use-toast";


interface Props {
  testId: string;
  userRole: string;
  onBack: () => void;
}

interface QuestionRow {
  qNo: number;
  question: string;
  options: string[];
  correctAnswer: number;
  topic: string;
  correct: number;
  wrong: number;
  skipped: number;
  accuracy: number;
  avgTime: number;
  optionCounts: number[];
  negativeMarkingCount: number;
}

interface StudentRow {
  userId: string;
  name: string;
  studentId: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  timeTaken: number;
  correct: number;
  wrong: number;
  skipped: number;
  previousAvg: number | null;
  trend: "up" | "down" | "flat";
  improvement: number | null;
}

const fmtTime = (sec: number) => {
  if (!sec || isNaN(sec)) return "—";
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
};

const diffOf = (accuracy: number): { label: string; color: string; bg: string } => {
  if (accuracy >= 80) return { label: "Easy", color: "text-emerald-700 dark:text-emerald-300", bg: "bg-emerald-100 dark:bg-emerald-950/40" };
  if (accuracy >= 50) return { label: "Medium", color: "text-amber-700 dark:text-amber-300", bg: "bg-amber-100 dark:bg-amber-950/40" };
  if (accuracy >= 30) return { label: "Difficult", color: "text-rose-700 dark:text-rose-300", bg: "bg-rose-100 dark:bg-rose-950/40" };
  return { label: "Critical", color: "text-red-50", bg: "bg-red-700" };
};

const accuracyBarColor = (a: number) =>
  a >= 80 ? "hsl(142 71% 45%)" :
  a >= 50 ? "hsl(38 92% 50%)" :
  a >= 30 ? "hsl(0 84% 60%)" :
            "hsl(0 72% 40%)";

const StatCard = ({ icon: Icon, label, value, sub, gradient }: any) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    whileHover={{ y: -2 }}
    transition={{ duration: 0.2 }}
  >
    <Card className="overflow-hidden border-border/60 shadow-sm hover:shadow-md transition-shadow h-full">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className={`p-2 rounded-lg bg-gradient-to-br ${gradient}`}>
            <Icon className="h-4 w-4 text-white" />
          </div>
        </div>
        <div className="text-2xl font-bold tracking-tight">{value}</div>
        <div className="text-xs font-medium text-muted-foreground mt-1">{label}</div>
        {sub && <div className="text-[11px] text-muted-foreground/70 mt-0.5">{sub}</div>}
      </CardContent>
    </Card>
  </motion.div>
);

export const AdminTestInsights = ({ testId, userRole, onBack }: Props) => {
  const [loading, setLoading] = useState(true);
  const [test, setTest] = useState<any>(null);
  const [questionRows, setQuestionRows] = useState<QuestionRow[]>([]);
  const [studentRows, setStudentRows] = useState<StudentRow[]>([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [selectedQ, setSelectedQ] = useState<QuestionRow | null>(null);
  const [tab, setTab] = useState("questions");
  const [studentSearch, setStudentSearch] = useState("");
  const [qSearch, setQSearch] = useState("");
  const [topicFilter, setTopicFilter] = useState<string>("all");
  const [difficultyFilter, setDifficultyFilter] = useState<"all" | "Easy" | "Medium" | "Difficult" | "Critical">("all");
  const [bandFilter, setBandFilter] = useState<"all" | "top" | "mid" | "low">("all");


  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const isSuper = userRole === "super_admin";

        // Test with questions
        const { data: testData } = await supabase.from("tests").select("*").eq("id", testId).maybeSingle();
        if (!testData) { setLoading(false); return; }
        setTest(testData);

        // Admin's classes
        let classQ = supabase.from("tuition_classes").select("id");
        if (!isSuper) classQ = classQ.eq("admin_id", session.user.id);
        const { data: classes } = await classQ;
        const classIds = (classes || []).map(c => c.id);

        // Students in those classes
        const { data: classStudents } = await supabase
          .from("class_students")
          .select("student_id, class_id")
          .in("class_id", classIds.length ? classIds : ["00000000-0000-0000-0000-000000000000"]);
        const studentIds = [...new Set((classStudents || []).map(cs => cs.student_id))];
        setTotalStudents(studentIds.length);

        if (studentIds.length === 0) { setLoading(false); return; }

        // Results for this test from those students
        const { data: results } = await supabase
          .from("test_results")
          .select("*")
          .eq("test_id", testId)
          .in("student_id", studentIds);

        // Profiles
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, student_id")
          .in("id", studentIds);
        const pmap = new Map((profiles || []).map(p => [p.id, p]));

        // Previous results for trend (same students, other tests, before this test)
        const { data: prevResults } = await supabase
          .from("test_results")
          .select("student_id, score, total_questions, completed_at")
          .in("student_id", studentIds)
          .neq("test_id", testId)
          .order("completed_at", { ascending: false })
          .limit(500);

        const prevMap = new Map<string, number[]>();
        (prevResults || []).forEach(r => {
          const pct = (r.score / Math.max(1, r.total_questions)) * 100;
          const arr = prevMap.get(r.student_id) || [];
          if (arr.length < 3) arr.push(pct);
          prevMap.set(r.student_id, arr);
        });

        // Aggregate per-question
        const questions: any[] = (testData.questions as any) || [];
        const qAgg: QuestionRow[] = questions.map((q, idx) => ({
          qNo: idx + 1,
          question: q.question || "",
          options: q.options || [],
          correctAnswer: q.correctAnswer,
          topic: q.topic || testData.chapter || "General",
          correct: 0, wrong: 0, skipped: 0, accuracy: 0, avgTime: 0,
          optionCounts: new Array((q.options || []).length).fill(0),
          negativeMarkingCount: 0,
        }));

        const totalTimeByQ = new Array(questions.length).fill(0);
        const timeCountByQ = new Array(questions.length).fill(0);
        const negMark = Number(testData.negative_marking || 0);

        const studentRowsAgg: StudentRow[] = [];

        (results || []).forEach(r => {
          const answers = (r.answers as Record<string, number>) || {};
          const perQTime = ((r as any).time_per_question as Record<string, number>) || {};
          let correct = 0, wrong = 0, skipped = 0;
          questions.forEach((q, idx) => {
            const chosen = answers[idx as any] ?? answers[String(idx) as any];
            if (chosen === undefined || chosen === null || chosen === -1) {
              qAgg[idx].skipped++;
              skipped++;
            } else if (chosen === q.correctAnswer) {
              qAgg[idx].correct++;
              if (qAgg[idx].optionCounts[chosen] !== undefined) qAgg[idx].optionCounts[chosen]++;
              correct++;
            } else {
              qAgg[idx].wrong++;
              if (qAgg[idx].optionCounts[chosen] !== undefined) qAgg[idx].optionCounts[chosen]++;
              if (negMark > 0) qAgg[idx].negativeMarkingCount++;
              wrong++;
            }
            const t = perQTime[idx as any] ?? perQTime[String(idx) as any];
            if (typeof t === "number" && t > 0) {
              totalTimeByQ[idx] += t;
              timeCountByQ[idx]++;
            }
          });

          // fallback avg time distribution when per-Q not present
          if (Object.keys(perQTime).length === 0 && r.time_taken_seconds && questions.length) {
            const avg = r.time_taken_seconds / questions.length;
            for (let i = 0; i < questions.length; i++) {
              totalTimeByQ[i] += avg;
              timeCountByQ[i]++;
            }
          }

          const profile = pmap.get(r.student_id);
          const prevArr = prevMap.get(r.student_id) || [];
          const prevAvg = prevArr.length ? prevArr.reduce((a, b) => a + b, 0) / prevArr.length : null;
          const pct = (r.score / Math.max(1, r.total_questions)) * 100;
          const improvement = prevAvg !== null ? pct - prevAvg : null;

          studentRowsAgg.push({
            userId: r.student_id,
            name: profile?.full_name || "Unknown",
            studentId: profile?.student_id || "",
            score: r.score,
            totalQuestions: r.total_questions,
            percentage: pct,
            timeTaken: r.time_taken_seconds || 0,
            correct, wrong, skipped,
            previousAvg: prevAvg,
            trend: improvement === null ? "flat" : improvement > 3 ? "up" : improvement < -3 ? "down" : "flat",
            improvement,
          });
        });

        qAgg.forEach((q, idx) => {
          const attempted = q.correct + q.wrong;
          q.accuracy = attempted > 0 ? (q.correct / attempted) * 100 : 0;
          q.avgTime = timeCountByQ[idx] > 0 ? totalTimeByQ[idx] / timeCountByQ[idx] : 0;
        });

        studentRowsAgg.sort((a, b) => b.percentage - a.percentage);

        setQuestionRows(qAgg);
        setStudentRows(studentRowsAgg);
      } finally {
        setLoading(false);
      }
    })();
  }, [testId, userRole]);

  // ---- Derived ----
  const appeared = studentRows.length;
  const attendance = totalStudents > 0 ? (appeared / totalStudents) * 100 : 0;
  const avgScore = appeared > 0 ? studentRows.reduce((s, r) => s + r.percentage, 0) / appeared : 0;
  const highest = appeared > 0 ? Math.max(...studentRows.map(r => r.percentage)) : 0;
  const lowest = appeared > 0 ? Math.min(...studentRows.map(r => r.percentage)) : 0;
  const avgTime = appeared > 0 ? studentRows.reduce((s, r) => s + r.timeTaken, 0) / appeared : 0;

  const problematic = useMemo(
    () => [...questionRows].filter(q => q.accuracy < 50).sort((a, b) => a.accuracy - b.accuracy).slice(0, 5),
    [questionRows]
  );

  const topics = useMemo(() => {
    const map = new Map<string, { topic: string; correct: number; wrong: number; skipped: number; total: number }>();
    questionRows.forEach(q => {
      const cur = map.get(q.topic) || { topic: q.topic, correct: 0, wrong: 0, skipped: 0, total: 0 };
      cur.correct += q.correct; cur.wrong += q.wrong; cur.skipped += q.skipped;
      cur.total += q.correct + q.wrong;
      map.set(q.topic, cur);
    });
    return Array.from(map.values()).map(t => ({
      ...t,
      accuracy: t.total > 0 ? (t.correct / t.total) * 100 : 0,
    })).sort((a, b) => b.accuracy - a.accuracy);
  }, [questionRows]);

  const strongTopics = topics.filter(t => t.accuracy >= 70).slice(0, 5);
  const weakTopics = [...topics].filter(t => t.accuracy < 50).sort((a, b) => a.accuracy - b.accuracy).slice(0, 5);

  const attentionStudents = useMemo(() => {
    return studentRows.filter(s => s.percentage < 40 || s.trend === "down");
  }, [studentRows]);

  const distribution = useMemo(() => {
    const bins = [
      { range: "0-20", count: 0 },
      { range: "20-40", count: 0 },
      { range: "40-60", count: 0 },
      { range: "60-80", count: 0 },
      { range: "80-100", count: 0 },
    ];
    studentRows.forEach(s => {
      const i = s.percentage >= 80 ? 4 : s.percentage >= 60 ? 3 : s.percentage >= 40 ? 2 : s.percentage >= 20 ? 1 : 0;
      bins[i].count++;
    });
    return bins;
  }, [studentRows]);

  const filteredQuestions = questionRows.filter(q => {
    if (qSearch && !q.question.toLowerCase().includes(qSearch.toLowerCase()) && !String(q.qNo).includes(qSearch)) return false;
    if (topicFilter !== "all" && q.topic !== topicFilter) return false;
    if (difficultyFilter !== "all" && diffOf(q.accuracy).label !== difficultyFilter) return false;
    return true;
  });
  const filteredStudents = studentRows.filter(s => {
    if (studentSearch &&
      !s.name.toLowerCase().includes(studentSearch.toLowerCase()) &&
      !s.studentId.toLowerCase().includes(studentSearch.toLowerCase())) return false;
    if (bandFilter === "top" && s.percentage < 75) return false;
    if (bandFilter === "mid" && (s.percentage < 40 || s.percentage >= 75)) return false;
    if (bandFilter === "low" && s.percentage >= 40) return false;
    return true;
  });

  // ---- Rule-based Teacher Insights ----
  const teacherInsights = useMemo(() => {
    const out: { icon: any; type: "success" | "warning" | "danger" | "info"; text: string; priority: number }[] = [];
    if (studentRows.length === 0) return out;

    // Weak topics
    weakTopics.slice(0, 3).forEach(t => out.push({
      icon: AlertTriangle, type: "danger", priority: 1,
      text: `Revise "${t.topic}" — class accuracy only ${t.accuracy.toFixed(0)}%. Consider a dedicated recap session.`,
    }));
    // Strong topics
    if (strongTopics.length) out.push({
      icon: CheckCircle2, type: "success", priority: 5,
      text: `Strong areas: ${strongTopics.slice(0, 3).map(t => t.topic).join(", ")}. Maintain momentum with quick review questions.`,
    });
    // Problematic questions
    if (problematic.length >= 3) out.push({
      icon: Lightbulb, type: "warning", priority: 2,
      text: `${problematic.length} questions had <50% accuracy. Discuss questions ${problematic.map(q => `Q${q.qNo}`).join(", ")} in the next lecture.`,
    });
    // Low performers
    const low = studentRows.filter(s => s.percentage < 40);
    if (low.length) out.push({
      icon: AlertTriangle, type: "danger", priority: 1,
      text: `${low.length} student${low.length > 1 ? "s" : ""} scored below 40%. Schedule one-on-one support.`,
    });
    // Declining
    const declining = studentRows.filter(s => s.trend === "down");
    if (declining.length >= Math.max(3, Math.ceil(studentRows.length * 0.3))) out.push({
      icon: TrendingDown, type: "warning", priority: 2,
      text: `${declining.length} students are trending down vs their previous tests. Watch for burnout or gaps.`,
    });
    // Improving
    const improving = studentRows.filter(s => s.trend === "up");
    if (improving.length >= Math.ceil(studentRows.length * 0.5)) out.push({
      icon: TrendingUp, type: "success", priority: 3,
      text: `${improving.length} of ${studentRows.length} students improved vs their previous average — teaching impact is visible.`,
    });
    // Attendance
    if (attendance < 60 && totalStudents > 0) out.push({
      icon: Users, type: "warning", priority: 4,
      text: `Only ${attendance.toFixed(0)}% attendance (${appeared}/${totalStudents}). Follow up with absentees.`,
    });
    // Average difficulty
    if (avgScore < 40) out.push({
      icon: AlertTriangle, type: "danger", priority: 1,
      text: `Class average is only ${avgScore.toFixed(0)}%. This test may be too tough — consider recap before moving on.`,
    });
    else if (avgScore >= 75) out.push({
      icon: Trophy, type: "success", priority: 3,
      text: `Class average is ${avgScore.toFixed(0)}%. Great work — consider raising difficulty next time.`,
    });
    // Negative marking hits
    const negHeavy = questionRows.filter(q => q.negativeMarkingCount >= Math.ceil(appeared * 0.4));
    if (negHeavy.length) out.push({
      icon: Target, type: "info", priority: 4,
      text: `${negHeavy.length} questions saw high negative marking — reinforce "skip if unsure" strategy.`,
    });
    return out.sort((a, b) => a.priority - b.priority);
  }, [studentRows, weakTopics, strongTopics, problematic, attendance, totalStudents, appeared, avgScore, questionRows]);

  const availableTopics = useMemo(() => Array.from(new Set(questionRows.map(q => q.topic))), [questionRows]);

  const handleParentPdf = (s: StudentRow) => {
    try {
      const questions: any[] = (test?.questions as any) || [];
      // Subject breakdown from stored per-question subjects (if any)
      const subjMap = new Map<string, { correct: number; total: number }>();
      const results = studentRows.find(x => x.userId === s.userId);
      questions.forEach((q) => {
        const subj = q.subject || test?.subject || "General";
        const cur = subjMap.get(subj) || { correct: 0, total: 0 };
        cur.total++;
        subjMap.set(subj, cur);
      });
      const subjectBreakdown = Array.from(subjMap.entries()).map(([subject, v]) => ({
        subject, correct: 0, total: v.total, percentage: 0,
      }));
      const timeMin = Math.floor(s.timeTaken / 60);
      const timeSec = Math.round(s.timeTaken % 60);
      downloadParentReport({
        studentName: s.name,
        studentId: s.studentId,
        testTitle: test.title,
        examType: test.exam_type,
        testType: test.test_type,
        subject: test.subject,
        chapter: test.chapter,
        completedAt: new Date().toLocaleDateString(),
        score: s.score,
        totalQuestions: s.totalQuestions,
        percentage: s.percentage,
        rank: studentRows.findIndex(x => x.userId === s.userId) + 1,
        totalStudents: studentRows.length,
        timeTaken: timeMin > 0 ? `${timeMin}m ${timeSec}s` : `${timeSec}s`,
        correct: s.correct,
        wrong: s.wrong,
        skipped: s.skipped,
        classAverage: avgScore,
        highestScore: highest,
        previousAverage: s.previousAvg,
        improvement: s.improvement,
        subjectBreakdown,
        strongTopics: strongTopics.map(t => t.topic),
        weakTopics: weakTopics.map(t => t.topic),
        teacherRemark:
          s.percentage >= 75 ? "Consistent, strong performance. Keep building on advanced problems."
          : s.percentage >= 50 ? "Good foundation. Focus on the highlighted weak areas to push higher."
          : "Needs structured revision on weak areas. Recommended: daily practice + concept recap.",
      });
      toast({ title: "Parent report downloaded", description: `${s.name}'s report has been saved.` });
    } catch (e) {
      toast({ title: "Download failed", description: "Please try again.", variant: "destructive" });
    }
  };


  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-40 bg-muted/50 rounded animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-24 bg-muted/40 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="h-64 bg-muted/40 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!test) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="h-4 w-4 mr-2" />Back</Button>
        <Card><CardContent className="py-16 text-center text-muted-foreground">Test not found.</CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0 mt-1">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <Badge variant="outline" className="text-[10px] uppercase tracking-wider">{test.exam_type}</Badge>
              <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">
                {test.test_type === "mock_test" ? "Mock Test" : "Chapter Test"}
              </Badge>
              {test.subject && <Badge variant="outline" className="capitalize text-[10px]">{test.subject}</Badge>}
            </div>
            <h1 className="text-xl md:text-2xl font-bold leading-tight">{test.title}</h1>
            {test.chapter && <p className="text-sm text-muted-foreground mt-0.5">{test.chapter}</p>}
          </div>
        </div>
      </div>

      {/* SECTION 1: Test Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={UserCheck} label="Appeared" value={appeared} sub={`of ${totalStudents}`} gradient="from-blue-500 to-indigo-600" />
        <StatCard icon={Users} label="Total Students" value={totalStudents} gradient="from-slate-500 to-slate-700" />
        <StatCard icon={Percent} label="Attendance" value={`${attendance.toFixed(0)}%`} gradient="from-cyan-500 to-blue-600" />
        <StatCard icon={Target} label="Average Score" value={`${avgScore.toFixed(1)}%`} gradient="from-indigo-500 to-purple-600" />
        <StatCard icon={Trophy} label="Highest" value={`${highest.toFixed(1)}%`} gradient="from-amber-500 to-orange-600" />
        <StatCard icon={TrendingDown} label="Lowest" value={`${lowest.toFixed(1)}%`} gradient="from-rose-500 to-red-600" />
        <StatCard icon={Clock} label="Avg Time" value={fmtTime(avgTime)} gradient="from-emerald-500 to-teal-600" />
        <StatCard icon={BarChart3} label="Total Attempts" value={appeared} gradient="from-fuchsia-500 to-pink-600" />
      </div>

      {/* Most problematic questions banner */}
      {problematic.length > 0 && (
        <Card className="border-amber-200 dark:border-amber-900/60 bg-gradient-to-br from-amber-50/70 to-orange-50/40 dark:from-amber-950/20 dark:to-orange-950/10">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Most Problematic Questions
            </CardTitle>
            <CardDescription>Recommended to discuss in tomorrow's lecture.</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-2">
              {problematic.map(q => (
                <button
                  key={q.qNo}
                  onClick={() => setSelectedQ(q)}
                  className="group flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/70 dark:bg-background/40 border border-amber-200/60 dark:border-amber-900/40 hover:border-amber-500 transition-colors"
                >
                  <span className="text-xs font-semibold">Question {q.qNo}</span>
                  <span className="text-xs font-mono text-amber-700 dark:text-amber-300">{q.accuracy.toFixed(0)}% acc</span>
                  <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <div className="overflow-x-auto -mx-1 px-1">
          <TabsList className="inline-flex w-max">
            <TabsTrigger value="questions" className="text-xs md:text-sm">Question Analysis</TabsTrigger>
            <TabsTrigger value="topics" className="text-xs md:text-sm">Weak Topics</TabsTrigger>
            <TabsTrigger value="attention" className="text-xs md:text-sm">Needs Attention</TabsTrigger>
            <TabsTrigger value="distribution" className="text-xs md:text-sm">Distribution</TabsTrigger>
            <TabsTrigger value="leaderboard" className="text-xs md:text-sm">Leaderboard</TabsTrigger>
          </TabsList>
        </div>

        {/* SECTION 2: Question Wise Analysis */}
        <TabsContent value="questions" className="space-y-3 mt-4">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between gap-3 flex-wrap">
              <div>
                <CardTitle className="text-base">Question Wise Analysis</CardTitle>
                <CardDescription>Click any question to see full option-level breakdown</CardDescription>
              </div>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input value={qSearch} onChange={e => setQSearch(e.target.value)} placeholder="Search questions" className="pl-8 h-9 w-52" />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead className="w-14">Q#</TableHead>
                      <TableHead className="text-center">Correct</TableHead>
                      <TableHead className="text-center">Wrong</TableHead>
                      <TableHead className="text-center">Skipped</TableHead>
                      <TableHead className="min-w-[180px]">Accuracy</TableHead>
                      <TableHead className="text-center">Avg Time</TableHead>
                      <TableHead className="text-center">Difficulty</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredQuestions.map(q => {
                      const d = diffOf(q.accuracy);
                      return (
                        <TableRow key={q.qNo} className="cursor-pointer hover:bg-muted/40" onClick={() => setSelectedQ(q)}>
                          <TableCell className="font-semibold">{q.qNo}</TableCell>
                          <TableCell className="text-center text-emerald-600 font-medium">{q.correct}</TableCell>
                          <TableCell className="text-center text-rose-600 font-medium">{q.wrong}</TableCell>
                          <TableCell className="text-center text-muted-foreground">{q.skipped}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                                <div className="h-full rounded-full transition-all"
                                     style={{ width: `${q.accuracy}%`, background: accuracyBarColor(q.accuracy) }} />
                              </div>
                              <span className="text-xs font-mono w-10 text-right">{q.accuracy.toFixed(0)}%</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center text-xs text-muted-foreground">{fmtTime(q.avgTime)}</TableCell>
                          <TableCell className="text-center">
                            <Badge className={`${d.bg} ${d.color} border-0 font-medium`}>{d.label}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" className="h-7">View <ChevronRight className="h-3 w-3 ml-1" /></Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SECTION 3: Weak Topic Detection */}
        <TabsContent value="topics" className="space-y-4 mt-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="border-emerald-200/60 dark:border-emerald-900/40 bg-gradient-to-br from-emerald-50/60 to-transparent dark:from-emerald-950/20">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Strong Topics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {strongTopics.length === 0 && <p className="text-sm text-muted-foreground">No topics above 70% yet.</p>}
                {strongTopics.map(t => (
                  <div key={t.topic} className="flex items-center justify-between p-2.5 rounded-lg bg-background/70">
                    <span className="text-sm font-medium">{t.topic}</span>
                    <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-0">{t.accuracy.toFixed(0)}%</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-rose-200/60 dark:border-rose-900/40 bg-gradient-to-br from-rose-50/60 to-transparent dark:from-rose-950/20">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertTriangle className="h-4 w-4 text-rose-600" />
                  Weak Topics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {weakTopics.length === 0 && <p className="text-sm text-muted-foreground">No topic is currently weak. 🎉</p>}
                {weakTopics.map(t => (
                  <div key={t.topic}>
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-background/70">
                      <span className="text-sm font-medium">{t.topic}</span>
                      <Badge className="bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-0">{t.accuracy.toFixed(0)}%</Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1 ml-1">
                      Students struggled here. Recommend revising <span className="font-medium">{t.topic}</span> in the next lecture.
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Topic Performance</CardTitle>
              <CardDescription>Accuracy per topic — highest to lowest</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={Math.max(220, topics.length * 34)}>
                <BarChart data={topics} layout="vertical" margin={{ left: 12, right: 24, top: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-border/50" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="topic" tick={{ fontSize: 11 }} width={130} />
                  <Tooltip formatter={(v: any) => `${Number(v).toFixed(1)}%`} />
                  <Bar dataKey="accuracy" radius={[0, 4, 4, 0]}>
                    {topics.map((t, i) => (
                      <Cell key={i} fill={accuracyBarColor(t.accuracy)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SECTION 4: Students Requiring Attention */}
        <TabsContent value="attention" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                Students Requiring Attention
              </CardTitle>
              <CardDescription>
                {attentionStudents.length} student{attentionStudents.length === 1 ? "" : "s"} scored below 40% or showed a declining trend.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {attentionStudents.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  All students are performing above the attention threshold.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead className="text-center">Current</TableHead>
                        <TableHead className="text-center">Prev Avg</TableHead>
                        <TableHead className="text-center">Δ</TableHead>
                        <TableHead className="text-center">Trend</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {attentionStudents.map(s => (
                        <TableRow key={s.userId}>
                          <TableCell>
                            <div className="font-medium">{s.name}</div>
                            <div className="text-[11px] text-muted-foreground">{s.studentId}</div>
                          </TableCell>
                          <TableCell className="text-center font-mono font-semibold">{s.percentage.toFixed(1)}%</TableCell>
                          <TableCell className="text-center text-muted-foreground font-mono">
                            {s.previousAvg !== null ? `${s.previousAvg.toFixed(1)}%` : "—"}
                          </TableCell>
                          <TableCell className="text-center font-mono text-xs">
                            {s.improvement === null ? "—" :
                              <span className={s.improvement > 0 ? "text-emerald-600" : s.improvement < 0 ? "text-rose-600" : "text-muted-foreground"}>
                                {s.improvement > 0 ? "+" : ""}{s.improvement.toFixed(1)}%
                              </span>}
                          </TableCell>
                          <TableCell className="text-center">
                            {s.trend === "up" && <Badge className="bg-emerald-100 text-emerald-700 border-0 dark:bg-emerald-950/60 dark:text-emerald-300"><ArrowUpRight className="h-3 w-3 mr-1" />Improving</Badge>}
                            {s.trend === "down" && <Badge className="bg-rose-100 text-rose-700 border-0 dark:bg-rose-950/60 dark:text-rose-300"><ArrowDownRight className="h-3 w-3 mr-1" />Declining</Badge>}
                            {s.trend === "flat" && <Badge className="bg-amber-100 text-amber-700 border-0 dark:bg-amber-950/60 dark:text-amber-300"><Minus className="h-3 w-3 mr-1" />Consistent</Badge>}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* SECTION 6: Performance Distribution */}
        <TabsContent value="distribution" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Performance Distribution</CardTitle>
              <CardDescription>How many students fell into each score band</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={distribution} margin={{ top: 8, right: 12, left: -12, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis dataKey="range" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {distribution.map((d, i) => (
                      <Cell key={i} fill={
                        d.range === "0-20" ? "hsl(0 72% 40%)" :
                        d.range === "20-40" ? "hsl(0 84% 60%)" :
                        d.range === "40-60" ? "hsl(38 92% 50%)" :
                        d.range === "60-80" ? "hsl(142 71% 45%)" :
                                              "hsl(217 91% 60%)"
                      } />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SECTION 7: Leaderboard */}
        <TabsContent value="leaderboard" className="mt-4">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between flex-wrap gap-3">
              <div>
                <CardTitle className="text-base">Leaderboard</CardTitle>
                <CardDescription>Rankings with trend vs previous tests</CardDescription>
              </div>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input value={studentSearch} onChange={e => setStudentSearch(e.target.value)} placeholder="Search student" className="pl-8 h-9 w-52" />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead className="w-16">Rank</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead className="text-center">Marks</TableHead>
                      <TableHead className="text-center">%</TableHead>
                      <TableHead className="text-center">Accuracy</TableHead>
                      <TableHead className="text-center">Time</TableHead>
                      <TableHead className="text-center">Improvement</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.map((s, i) => {
                      const originalRank = studentRows.findIndex(x => x.userId === s.userId) + 1;
                      const attempted = s.correct + s.wrong;
                      const acc = attempted > 0 ? (s.correct / attempted) * 100 : 0;
                      return (
                        <TableRow key={s.userId}>
                          <TableCell>
                            {originalRank === 1 && <Medal className="h-5 w-5 text-yellow-500" />}
                            {originalRank === 2 && <Medal className="h-5 w-5 text-slate-400" />}
                            {originalRank === 3 && <Medal className="h-5 w-5 text-amber-700" />}
                            {originalRank > 3 && <span className="text-sm font-mono text-muted-foreground">#{originalRank}</span>}
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{s.name}</div>
                            <div className="text-[11px] text-muted-foreground">{s.studentId}</div>
                          </TableCell>
                          <TableCell className="text-center font-mono">{s.score}/{s.totalQuestions}</TableCell>
                          <TableCell className="text-center font-mono font-semibold">{s.percentage.toFixed(1)}%</TableCell>
                          <TableCell className="text-center font-mono text-sm">{acc.toFixed(0)}%</TableCell>
                          <TableCell className="text-center text-xs text-muted-foreground">{fmtTime(s.timeTaken)}</TableCell>
                          <TableCell className="text-center">
                            {s.improvement === null ? <span className="text-muted-foreground text-xs">—</span> :
                              <span className={`font-mono text-xs ${s.improvement > 0 ? "text-emerald-600" : s.improvement < 0 ? "text-rose-600" : "text-muted-foreground"}`}>
                                {s.improvement > 0 ? "▲" : s.improvement < 0 ? "▼" : "•"} {Math.abs(s.improvement).toFixed(1)}%
                              </span>}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Question Side Panel */}
      <Sheet open={!!selectedQ} onOpenChange={o => !o && setSelectedQ(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selectedQ && (
            <>
              <SheetHeader className="mb-4">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Question {selectedQ.qNo}</Badge>
                  <Badge className={`${diffOf(selectedQ.accuracy).bg} ${diffOf(selectedQ.accuracy).color} border-0`}>
                    {diffOf(selectedQ.accuracy).label}
                  </Badge>
                </div>
                <SheetTitle className="text-left text-base leading-snug">
                  <LatexRenderer content={selectedQ.question || "(no text)"} />
                </SheetTitle>
                <SheetDescription>Topic: {selectedQ.topic}</SheetDescription>
              </SheetHeader>

              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-center">
                    <div className="text-xs text-muted-foreground">Correct</div>
                    <div className="text-lg font-bold text-emerald-600">{selectedQ.correct}</div>
                  </div>
                  <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/30 text-center">
                    <div className="text-xs text-muted-foreground">Wrong</div>
                    <div className="text-lg font-bold text-rose-600">{selectedQ.wrong}</div>
                  </div>
                  <div className="p-2 rounded-lg bg-muted text-center">
                    <div className="text-xs text-muted-foreground">Skipped</div>
                    <div className="text-lg font-bold">{selectedQ.skipped}</div>
                  </div>
                </div>

                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-2">Option distribution</div>
                  <div className="space-y-2">
                    {selectedQ.options.map((opt, idx) => {
                      const total = selectedQ.optionCounts.reduce((a, b) => a + b, 0);
                      const pct = total > 0 ? (selectedQ.optionCounts[idx] / total) * 100 : 0;
                      const isCorrect = idx === selectedQ.correctAnswer;
                      return (
                        <div key={idx} className={`p-2 rounded-lg border ${isCorrect ? "border-emerald-400 bg-emerald-50/60 dark:bg-emerald-950/20" : "border-border"}`}>
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-xs font-mono w-5">{String.fromCharCode(65 + idx)}</span>
                              <div className="text-sm truncate"><LatexRenderer content={opt || ""} /></div>
                              {isCorrect && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />}
                            </div>
                            <span className="text-xs font-mono shrink-0">{selectedQ.optionCounts[idx]} · {pct.toFixed(0)}%</span>
                          </div>
                          <Progress value={pct} className="h-1.5" />
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                  <div className="p-2">
                    <div className="text-[11px] text-muted-foreground">Avg solving time</div>
                    <div className="text-sm font-semibold">{fmtTime(selectedQ.avgTime)}</div>
                  </div>
                  <div className="p-2">
                    <div className="text-[11px] text-muted-foreground">Negative marks incurred</div>
                    <div className="text-sm font-semibold">{selectedQ.negativeMarkingCount}</div>
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};
