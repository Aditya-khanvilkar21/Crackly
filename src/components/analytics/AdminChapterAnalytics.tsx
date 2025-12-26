import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Users, TrendingUp, BookOpen, Award, Target, ChevronRight, ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type ExamType = 'JEE' | 'NEET' | 'CET';
type Subject = 'physics' | 'chemistry' | 'mathematics' | 'biology';

interface ChapterStats {
  chapter: string;
  subject: Subject;
  totalAttempts: number;
  uniqueStudents: number;
  avgScore: number;
  avgAttempts: number;
  topScore: number;
}

interface StudentChapterResult {
  studentName: string;
  studentId: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  attempts: number;
  completedAt: string;
}

interface AdminChapterAnalyticsProps {
  examType: ExamType;
  userRole: string;
  onBack: () => void;
}

const getSubjects = (examType: ExamType): Subject[] => {
  if (examType === 'NEET') {
    return ['physics', 'chemistry', 'biology'];
  }
  return ['physics', 'chemistry', 'mathematics'];
};

const getSubjectColor = (subject: Subject): string => {
  switch (subject) {
    case 'physics': return 'from-blue-500 to-indigo-600';
    case 'chemistry': return 'from-green-500 to-emerald-600';
    case 'mathematics': return 'from-purple-500 to-pink-600';
    case 'biology': return 'from-orange-500 to-red-600';
  }
};

const getSubjectLabel = (subject: Subject): string => {
  return subject.charAt(0).toUpperCase() + subject.slice(1);
};

export const AdminChapterAnalytics = ({ examType, userRole, onBack }: AdminChapterAnalyticsProps) => {
  const [chapterStats, setChapterStats] = useState<ChapterStats[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<string | null>(null);
  const [chapterStudents, setChapterStudents] = useState<StudentChapterResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [chapterLoading, setChapterLoading] = useState(false);

  const subjects = getSubjects(examType);

  useEffect(() => {
    fetchChapterAnalytics();
  }, [examType]);

  const fetchChapterAnalytics = async () => {
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

      // Get chapter test results
      const { data: resultsData } = await supabase
        .from("test_results")
        .select("*, tests!inner(id, title, test_type, chapter, subject, exam_type)")
        .in("student_id", studentIds)
        .eq("tests.test_type", "chapter_test")
        .eq("tests.exam_type", examType);

      if (!resultsData || resultsData.length === 0) {
        setLoading(false);
        return;
      }

      // Group by chapter
      const chapterMap = new Map<string, {
        chapter: string;
        subject: Subject;
        attempts: number;
        students: Set<string>;
        totalScore: number;
        topScore: number;
      }>();

      resultsData.forEach((r: any) => {
        const chapter = r.tests.chapter || 'Unknown';
        const subject = r.tests.subject as Subject;
        const key = `${subject}-${chapter}`;
        
        const existing = chapterMap.get(key) || {
          chapter,
          subject,
          attempts: 0,
          students: new Set<string>(),
          totalScore: 0,
          topScore: 0,
        };

        existing.attempts++;
        existing.students.add(r.student_id);
        const percentage = (r.score / r.total_questions) * 100;
        existing.totalScore += percentage;
        existing.topScore = Math.max(existing.topScore, percentage);

        chapterMap.set(key, existing);
      });

      const stats: ChapterStats[] = Array.from(chapterMap.entries()).map(([key, data]) => ({
        chapter: data.chapter,
        subject: data.subject,
        totalAttempts: data.attempts,
        uniqueStudents: data.students.size,
        avgScore: data.attempts > 0 ? data.totalScore / data.attempts : 0,
        avgAttempts: data.students.size > 0 ? data.attempts / data.students.size : 0,
        topScore: data.topScore,
      }));

      setChapterStats(stats);
    } catch (error) {
      console.error("Error fetching chapter analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchChapterDetails = async (chapter: string, subject: Subject) => {
    setChapterLoading(true);
    setSelectedChapter(chapter);

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

      if (!classes) return;

      const classIds = classes.map(c => c.id);

      // Get students in these classes
      const { data: classStudents } = await supabase
        .from("class_students")
        .select("student_id")
        .in("class_id", classIds);

      if (!classStudents) return;

      const studentIds = [...new Set(classStudents.map(cs => cs.student_id))];

      // Get results for this chapter
      const { data: resultsData } = await supabase
        .from("test_results")
        .select("*, tests!inner(id, title, test_type, chapter, subject, exam_type)")
        .in("student_id", studentIds)
        .eq("tests.test_type", "chapter_test")
        .eq("tests.exam_type", examType)
        .eq("tests.chapter", chapter)
        .eq("tests.subject", subject)
        .order("completed_at", { ascending: false });

      // Get profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, student_id")
        .in("id", studentIds);

      if (resultsData && profiles) {
        // Group by student to get best score and attempt count
        const studentMap = new Map<string, {
          name: string;
          studentId: string;
          bestScore: number;
          totalQuestions: number;
          attempts: number;
          lastAttempt: string;
        }>();

        resultsData.forEach((r: any) => {
          const profile = profiles.find(p => p.id === r.student_id);
          const existing = studentMap.get(r.student_id);

          if (!existing || r.score > existing.bestScore) {
            studentMap.set(r.student_id, {
              name: profile?.full_name || 'Unknown',
              studentId: profile?.student_id || '',
              bestScore: r.score,
              totalQuestions: r.total_questions,
              attempts: (existing?.attempts || 0) + 1,
              lastAttempt: r.completed_at,
            });
          } else {
            studentMap.set(r.student_id, {
              ...existing,
              attempts: existing.attempts + 1,
            });
          }
        });

        const students: StudentChapterResult[] = Array.from(studentMap.values())
          .map(s => ({
            studentName: s.name,
            studentId: s.studentId,
            score: s.bestScore,
            totalQuestions: s.totalQuestions,
            percentage: (s.bestScore / s.totalQuestions) * 100,
            attempts: s.attempts,
            completedAt: s.lastAttempt,
          }))
          .sort((a, b) => b.percentage - a.percentage);

        setChapterStudents(students);
      }
    } catch (error) {
      console.error("Error fetching chapter details:", error);
    } finally {
      setChapterLoading(false);
    }
  };

  const getSubjectChapters = (subject: Subject) => {
    return chapterStats.filter(c => c.subject === subject);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Chapter Detail View
  if (selectedChapter && selectedSubject) {
    return (
      <motion.div
        key="chapter-detail"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="space-y-4"
      >
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => {
              setSelectedChapter(null);
              setChapterStudents([]);
            }}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-xl font-bold">{selectedChapter}</h2>
            <p className="text-sm text-muted-foreground">{getSubjectLabel(selectedSubject)} - Student Rankings</p>
          </div>
        </div>

        {chapterLoading ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : chapterStudents.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="pt-6">
              <div className="text-center py-12 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No Attempts Yet</p>
                <p className="text-sm mt-2">No students have attempted this chapter test</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card className="bg-primary text-primary-foreground border-0">
                <CardContent className="p-4">
                  <Users className="h-5 w-5 mb-2" />
                  <div className="text-2xl font-bold">{chapterStudents.length}</div>
                  <p className="text-xs opacity-80">Students</p>
                </CardContent>
              </Card>
              <Card className="bg-accent text-accent-foreground border-0">
                <CardContent className="p-4">
                  <BookOpen className="h-5 w-5 mb-2" />
                  <div className="text-2xl font-bold">
                    {chapterStudents.reduce((sum, s) => sum + s.attempts, 0)}
                  </div>
                  <p className="text-xs opacity-80">Total Attempts</p>
                </CardContent>
              </Card>
              <Card className="bg-success text-success-foreground border-0">
                <CardContent className="p-4">
                  <Target className="h-5 w-5 mb-2" />
                  <div className="text-2xl font-bold">
                    {(chapterStudents.reduce((sum, s) => sum + s.percentage, 0) / chapterStudents.length).toFixed(1)}%
                  </div>
                  <p className="text-xs opacity-80">Class Average</p>
                </CardContent>
              </Card>
              <Card className="gradient-primary text-white border-0">
                <CardContent className="p-4">
                  <Award className="h-5 w-5 mb-2 text-white/90" />
                  <div className="text-2xl font-bold">{chapterStudents[0]?.percentage.toFixed(1)}%</div>
                  <p className="text-xs text-white/80">Top Score</p>
                </CardContent>
              </Card>
            </div>

            {/* Leaderboard */}
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-primary" />
                  Student Rankings
                </CardTitle>
                <CardDescription>Best scores with rank positions</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Rank</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead className="text-center">Score</TableHead>
                      <TableHead className="text-center">Attempts</TableHead>
                      <TableHead className="text-right">Percentage</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {chapterStudents.map((student, idx) => (
                      <TableRow key={student.studentId}>
                        <TableCell>
                          {idx < 3 ? (
                            <Badge className={
                              idx === 0 ? 'bg-yellow-500' :
                              idx === 1 ? 'bg-gray-400' : 'bg-orange-600'
                            }>
                              #{idx + 1}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">#{idx + 1}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{student.studentName}</div>
                            <div className="text-xs text-muted-foreground">{student.studentId}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {student.score}/{student.totalQuestions}
                        </TableCell>
                        <TableCell className="text-center">{student.attempts}</TableCell>
                        <TableCell className="text-right">
                          <Badge className={
                            student.percentage >= 80 ? 'bg-green-600' :
                            student.percentage >= 60 ? 'bg-yellow-600' : 'bg-red-600'
                          }>
                            {student.percentage.toFixed(1)}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Bar Chart */}
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle>Score Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chapterStudents.slice(0, 10)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" domain={[0, 100]} stroke="hsl(var(--muted-foreground))" />
                    <YAxis 
                      type="category" 
                      dataKey="studentName" 
                      width={120}
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={11}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--card))", 
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px"
                      }}
                      formatter={(value: number) => [`${value.toFixed(1)}%`, "Score"]}
                    />
                    <Bar dataKey="percentage" fill="hsl(var(--primary))" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </>
        )}
      </motion.div>
    );
  }

  // Subject View - Show chapters in selected subject
  if (selectedSubject) {
    const chapters = getSubjectChapters(selectedSubject);
    
    return (
      <motion.div
        key="subject-chapters"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="space-y-4"
      >
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setSelectedSubject(null)}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-xl font-bold">{getSubjectLabel(selectedSubject)}</h2>
            <p className="text-sm text-muted-foreground">{examType} Chapter Analytics</p>
          </div>
        </div>

        {chapters.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="pt-6">
              <div className="text-center py-12 text-muted-foreground">
                <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No Chapter Tests Yet</p>
                <p className="text-sm mt-2">No students have attempted chapter tests for this subject</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {chapters.map((chapter, idx) => (
              <motion.div
                key={chapter.chapter}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Card 
                  className="cursor-pointer hover:shadow-md active:scale-[0.99] transition-all"
                  onClick={() => fetchChapterDetails(chapter.chapter, chapter.subject)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold">{chapter.chapter}</h3>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-sm">
                      <div className="p-2 bg-muted rounded text-center">
                        <div className="text-xs text-muted-foreground mb-1">Students</div>
                        <div className="font-bold text-primary">{chapter.uniqueStudents}</div>
                      </div>
                      <div className="p-2 bg-muted rounded text-center">
                        <div className="text-xs text-muted-foreground mb-1">Attempts</div>
                        <div className="font-bold text-accent">{chapter.totalAttempts}</div>
                      </div>
                      <div className="p-2 bg-muted rounded text-center">
                        <div className="text-xs text-muted-foreground mb-1">Avg Score</div>
                        <div className={`font-bold ${
                          chapter.avgScore >= 80 ? 'text-green-600' :
                          chapter.avgScore >= 60 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {chapter.avgScore.toFixed(1)}%
                        </div>
                      </div>
                      <div className="p-2 bg-muted rounded text-center">
                        <div className="text-xs text-muted-foreground mb-1">Top Score</div>
                        <div className="font-bold text-green-600">{chapter.topScore.toFixed(1)}%</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    );
  }

  // Main View - Show subjects
  if (chapterStats.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-xl font-bold">Chapter Analytics</h2>
            <p className="text-sm text-muted-foreground">{examType}</p>
          </div>
        </div>
        <Card className="border-dashed">
          <CardContent className="pt-6">
            <div className="text-center py-12 text-muted-foreground">
              <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No Data Yet</p>
              <p className="text-sm mt-2">Students need to complete chapter tests to see analytics</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <motion.div
      key="subjects"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-4"
    >
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-xl font-bold">Chapter Analytics</h2>
          <p className="text-sm text-muted-foreground">{examType} - Select Subject</p>
        </div>
      </div>

      <div className="space-y-3">
        {subjects.map((subject, idx) => {
          const chapters = getSubjectChapters(subject);
          const totalStudents = chapters.reduce((sum, c) => sum + c.uniqueStudents, 0);
          const totalAttempts = chapters.reduce((sum, c) => sum + c.totalAttempts, 0);
          const avgScore = chapters.length > 0
            ? chapters.reduce((sum, c) => sum + c.avgScore, 0) / chapters.length
            : 0;

          return (
            <motion.div
              key={subject}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
            >
              <Card
                className="cursor-pointer hover:shadow-md active:scale-[0.98] transition-all"
                onClick={() => setSelectedSubject(subject)}
              >
                <CardContent className="p-4 flex items-center gap-4">
                  <div className={`p-3 rounded-xl bg-gradient-to-br ${getSubjectColor(subject)} shrink-0`}>
                    <BookOpen className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold">{getSubjectLabel(subject)}</h3>
                    <p className="text-sm text-muted-foreground">
                      {chapters.length} chapters • {totalStudents} students • {totalAttempts} attempts
                    </p>
                    {chapters.length > 0 && (
                      <Badge className={`mt-1 ${
                        avgScore >= 80 ? 'bg-green-600' :
                        avgScore >= 60 ? 'bg-yellow-600' : 'bg-red-600'
                      }`}>
                        Avg: {avgScore.toFixed(1)}%
                      </Badge>
                    )}
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};
