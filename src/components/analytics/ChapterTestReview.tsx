import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Users, Award, Target, ChevronRight, CheckCircle2, XCircle, BookOpen, Download, FileSpreadsheet } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";
import { downloadTestResultsAsXlsx } from "@/lib/downloadResultsXlsx";
import { LatexRenderer } from "@/components/LatexRenderer";

type ExamType = 'JEE' | 'NEET' | 'CET';
type Subject = 'physics' | 'chemistry' | 'mathematics' | 'biology';

interface ChapterTest {
  id: string;
  title: string;
  chapter: string;
  subject: Subject;
  questions: Question[];
}

interface Question {
  question: string;
  options: string[];
  correctAnswer: number;
}

interface StudentResult {
  studentId: string;
  studentName: string;
  studentCode: string;
  rank: number;
  score: number;
  totalQuestions: number;
  percentage: number;
  answers: Record<string, number>;
  completedAt: string;
}

interface ChapterTestReviewProps {
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

export const ChapterTestReview = ({ examType, userRole, onBack }: ChapterTestReviewProps) => {
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [chapters, setChapters] = useState<{ chapter: string; subject: Subject; testCount: number }[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<string | null>(null);
  const [chapterTests, setChapterTests] = useState<ChapterTest[]>([]);
  const [selectedTest, setSelectedTest] = useState<ChapterTest | null>(null);
  const [studentResults, setStudentResults] = useState<StudentResult[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentResult | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const subjects = getSubjects(examType);

  useEffect(() => {
    fetchChapters();
  }, [examType]);

  const fetchChapters = async () => {
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

      // Get test availability for these classes
      const { data: availability } = await supabase
        .from("test_availability")
        .select("test_id")
        .in("class_id", classIds);

      if (!availability || availability.length === 0) {
        setLoading(false);
        return;
      }

      const testIds = [...new Set(availability.map(a => a.test_id))];

      // Get chapter tests
      const { data: tests } = await supabase
        .from("tests")
        .select("id, chapter, subject")
        .in("id", testIds)
        .eq("test_type", "chapter_test")
        .eq("exam_type", examType)
        .not("chapter", "is", null);

      if (tests) {
        const chapterMap = new Map<string, { chapter: string; subject: Subject; testCount: number }>();
        tests.forEach((t: any) => {
          const key = `${t.subject}-${t.chapter}`;
          const existing = chapterMap.get(key);
          if (existing) {
            existing.testCount++;
          } else {
            chapterMap.set(key, {
              chapter: t.chapter,
              subject: t.subject,
              testCount: 1,
            });
          }
        });
        setChapters(Array.from(chapterMap.values()));
      }
    } catch (error) {
      console.error("Error fetching chapters:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchChapterTests = async (chapter: string, subject: Subject) => {
    setDetailLoading(true);
    setSelectedChapter(chapter);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const isSuperAdmin = userRole === "super_admin";

      let classQuery = supabase.from("tuition_classes").select("id");
      if (!isSuperAdmin) {
        classQuery = classQuery.eq("admin_id", session.user.id);
      }
      const { data: classes } = await classQuery;
      if (!classes) return;

      const classIds = classes.map(c => c.id);

      const { data: availability } = await supabase
        .from("test_availability")
        .select("test_id")
        .in("class_id", classIds);

      if (!availability) return;

      const testIds = [...new Set(availability.map(a => a.test_id))];

      const { data: tests } = await supabase
        .from("tests")
        .select("id, title, chapter, subject, questions")
        .in("id", testIds)
        .eq("test_type", "chapter_test")
        .eq("exam_type", examType)
        .eq("chapter", chapter)
        .eq("subject", subject);

      if (tests) {
        setChapterTests(tests.map((t: any) => ({
          ...t,
          questions: t.questions as Question[],
        })));
      }
    } catch (error) {
      console.error("Error fetching chapter tests:", error);
    } finally {
      setDetailLoading(false);
    }
  };

  const fetchTestResults = async (test: ChapterTest) => {
    setDetailLoading(true);
    setSelectedTest(test);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const isSuperAdmin = userRole === "super_admin";

      let classQuery = supabase.from("tuition_classes").select("id");
      if (!isSuperAdmin) {
        classQuery = classQuery.eq("admin_id", session.user.id);
      }
      const { data: classes } = await classQuery;
      if (!classes) return;

      const classIds = classes.map(c => c.id);

      const { data: classStudents } = await supabase
        .from("class_students")
        .select("student_id")
        .in("class_id", classIds);

      if (!classStudents) return;

      const studentIds = [...new Set(classStudents.map(cs => cs.student_id))];

      // Get results for this test
      const { data: results } = await supabase
        .from("test_results")
        .select("*")
        .eq("test_id", test.id)
        .in("student_id", studentIds);

      // Get profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, student_id")
        .in("id", studentIds);

      if (results && profiles) {
        // Sort by score descending, then by time taken ascending (tie-breaker)
        const sortedResults = [...results].sort((a: any, b: any) => {
          if (b.score !== a.score) return b.score - a.score;
          return (a.time_taken_seconds || Infinity) - (b.time_taken_seconds || Infinity);
        });

        const rankedResults: StudentResult[] = sortedResults.map((r: any, idx: number) => {
          const profile = profiles.find(p => p.id === r.student_id);
          return {
            studentId: r.student_id,
            studentName: profile?.full_name || "Unknown",
            studentCode: profile?.student_id || "",
            rank: idx + 1,
            score: r.score,
            totalQuestions: r.total_questions,
            percentage: (r.score / r.total_questions) * 100,
            answers: r.answers as Record<string, number>,
            completedAt: r.completed_at,
          };
        });
        setStudentResults(rankedResults);
      }
    } catch (error) {
      console.error("Error fetching test results:", error);
    } finally {
      setDetailLoading(false);
    }
  };

  const downloadRankListPDF = () => {
    if (!selectedTest) {
      toast.error("Please select a test first");
      return;
    }
    
    if (studentResults.length === 0) {
      toast.error("No student data available to download");
      return;
    }

    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();

      // Header
      doc.setFillColor(79, 70, 229);
      doc.rect(0, 0, pageWidth, 40, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('Chapter Test Results', pageWidth / 2, 16, { align: 'center' });

      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(selectedTest.title, pageWidth / 2, 28, { align: 'center' });
      doc.text(`${getSubjectLabel(selectedTest.subject)} - ${examType}`, pageWidth / 2, 36, { align: 'center' });

      // Stats
      const avgScore = studentResults.reduce((sum, s) => sum + s.percentage, 0) / studentResults.length;
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, 14, 52);
      doc.text(`Students: ${studentResults.length} | Avg Score: ${avgScore.toFixed(1)}% | Top Score: ${studentResults[0]?.percentage.toFixed(1)}%`, 14, 60);

      // Table
      const tableData = studentResults.map(s => [
        `#${s.rank}`,
        s.studentName,
        s.studentCode,
        `${s.score}/${s.totalQuestions}`,
        `${s.percentage.toFixed(1)}%`,
      ]);

      autoTable(doc, {
        startY: 68,
        head: [['Rank', 'Student Name', 'Student ID', 'Score', 'Percentage']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229] },
        margin: { left: 14, right: 14 },
        styles: { fontSize: 9 },
        didParseCell: function(data: any) {
          if (data.section === 'body' && data.column.index === 0) {
            const rank = parseInt(data.cell.raw.replace('#', ''));
            if (rank === 1) {
              data.cell.styles.fillColor = [255, 215, 0];
            } else if (rank === 2) {
              data.cell.styles.fillColor = [192, 192, 192];
            } else if (rank === 3) {
              data.cell.styles.fillColor = [205, 127, 50];
              data.cell.styles.textColor = [255, 255, 255];
            }
          }
        },
      });

      const fileName = `${selectedTest.chapter.replace(/\s+/g, '_')}_Rankings.pdf`;
      doc.save(fileName);
      
      toast.success("PDF downloaded successfully!");
    } catch (error) {
      console.error("Error downloading PDF:", error);
      toast.error("Failed to download PDF. Please try again.");
    }
  };

  // Render loading
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Student Detail View
  if (selectedStudent && selectedTest) {
    const questions = selectedTest.questions;
    const wrongAnswers = questions
      .map((q, idx) => ({
        ...q,
        index: idx,
        studentAnswer: selectedStudent.answers[idx.toString()],
      }))
      .filter(q => q.studentAnswer !== undefined && q.studentAnswer !== q.correctAnswer);

    const correctCount = questions.filter((q, idx) => 
      selectedStudent.answers[idx.toString()] === q.correctAnswer
    ).length;

    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="space-y-4"
      >
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSelectedStudent(null)}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-xl font-bold">{selectedStudent.studentName}</h2>
            <p className="text-sm text-muted-foreground">
              Rank #{selectedStudent.rank} • {selectedStudent.studentCode}
            </p>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
            <CardContent className="p-4 text-center">
              <CheckCircle2 className="h-6 w-6 mx-auto mb-2 text-green-600" />
              <div className="text-2xl font-bold text-green-600">{correctCount}</div>
              <p className="text-xs text-muted-foreground">Correct</p>
            </CardContent>
          </Card>
          <Card className="bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800">
            <CardContent className="p-4 text-center">
              <XCircle className="h-6 w-6 mx-auto mb-2 text-red-600" />
              <div className="text-2xl font-bold text-red-600">{wrongAnswers.length}</div>
              <p className="text-xs text-muted-foreground">Wrong</p>
            </CardContent>
          </Card>
          <Card className="bg-primary/10 border-primary/20">
            <CardContent className="p-4 text-center">
              <Target className="h-6 w-6 mx-auto mb-2 text-primary" />
              <div className="text-2xl font-bold text-primary">{selectedStudent.percentage.toFixed(0)}%</div>
              <p className="text-xs text-muted-foreground">Score</p>
            </CardContent>
          </Card>
        </div>

        {/* Wrong Answers Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              Incorrect Answers ({wrongAnswers.length})
            </CardTitle>
            <CardDescription>Questions the student answered incorrectly</CardDescription>
          </CardHeader>
          <CardContent>
            {wrongAnswers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-500" />
                <p className="font-medium">Perfect Score!</p>
                <p className="text-sm">All answers were correct</p>
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="space-y-4 pr-4">
                  {wrongAnswers.map((q, idx) => (
                    <Card key={idx} className="border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/30">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3 mb-3">
                          <Badge variant="outline" className="shrink-0">Q{q.index + 1}</Badge>
                          <div className="text-sm font-medium"><LatexRenderer content={q.question} /></div>
                        </div>
                        <div className="space-y-2 ml-8">
                          <div className="flex items-start gap-2 text-sm">
                            <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                            <div className="text-red-600 dark:text-red-400">
                              <span className="font-medium">Student's Answer: </span>
                              {q.studentAnswer !== undefined && q.options[q.studentAnswer] !== undefined
                                ? <LatexRenderer content={q.options[q.studentAnswer]} />
                                : "Not answered"}
                            </div>
                          </div>
                          <div className="flex items-start gap-2 text-sm">
                            <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                            <div className="text-green-600 dark:text-green-400">
                              <span className="font-medium">Correct Answer: </span>
                              <LatexRenderer content={q.options[q.correctAnswer]} />
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // Rank List View (Test selected)
  if (selectedTest) {
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="space-y-4"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setSelectedTest(null);
                setStudentResults([]);
              }}
              className="shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h2 className="text-xl font-bold">{selectedTest.title}</h2>
              <p className="text-sm text-muted-foreground">
                {selectedTest.chapter} • {getSubjectLabel(selectedTest.subject)}
              </p>
            </div>
          </div>
          {studentResults.length > 0 && (
            <div className="flex gap-2">
              <Button onClick={downloadRankListPDF} size="sm" variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                PDF
              </Button>
              <Button onClick={() => {
                downloadTestResultsAsXlsx({
                  testTitle: selectedTest.title,
                  examType,
                  subject: getSubjectLabel(selectedTest.subject),
                  chapter: selectedTest.chapter,
                  students: studentResults.map(s => ({
                    rank: s.rank,
                    studentName: s.studentName,
                    score: s.score,
                    totalQuestions: s.totalQuestions,
                    percentage: s.percentage,
                  })),
                });
                toast.success("Excel file downloaded!");
              }} size="sm" className="gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                Excel
              </Button>
            </div>
          )}
        </div>

        {detailLoading ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : studentResults.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="pt-6">
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No Attempts Yet</p>
                <p className="text-sm mt-2">No students have attempted this test</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <Card className="bg-primary text-primary-foreground border-0">
                <CardContent className="p-4">
                  <Users className="h-5 w-5 mb-1" />
                  <div className="text-2xl font-bold">{studentResults.length}</div>
                  <p className="text-xs opacity-80">Appeared Students</p>
                </CardContent>
              </Card>
              <Card className="bg-accent text-accent-foreground border-0">
                <CardContent className="p-4">
                  <Target className="h-5 w-5 mb-1" />
                  <div className="text-2xl font-bold">
                    {(studentResults.reduce((sum, s) => sum + s.percentage, 0) / studentResults.length).toFixed(0)}%
                  </div>
                  <p className="text-xs opacity-80">Avg Score</p>
                </CardContent>
              </Card>
              <Card className="gradient-primary text-white border-0">
                <CardContent className="p-4">
                  <Award className="h-5 w-5 mb-1" />
                  <div className="text-2xl font-bold">{studentResults[0]?.percentage.toFixed(0)}%</div>
                  <p className="text-xs opacity-80">Top Score</p>
                </CardContent>
              </Card>
            </div>

            {/* Rank List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-primary" />
                  Student Rankings
                </CardTitle>
                <CardDescription>Tap on a student to see detailed analysis</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Rank</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead className="text-right">Marks</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {studentResults.map((student) => (
                      <TableRow
                        key={student.studentId}
                        className="cursor-pointer hover:bg-muted/80"
                        onClick={() => setSelectedStudent(student)}
                      >
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
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">{student.studentName}</div>
                              <div className="text-xs text-muted-foreground">{student.studentCode}</div>
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="font-bold">{student.score}/{student.totalQuestions}</div>
                          <Badge className={
                            student.percentage >= 80 ? 'bg-green-600' :
                            student.percentage >= 60 ? 'bg-yellow-600' : 'bg-red-600'
                          }>
                            {student.percentage.toFixed(0)}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}
      </motion.div>
    );
  }

  // Chapter Tests List
  if (selectedChapter && selectedSubject) {
    return (
      <motion.div
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
              setChapterTests([]);
            }}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-xl font-bold">{selectedChapter}</h2>
            <p className="text-sm text-muted-foreground">{getSubjectLabel(selectedSubject)} Tests</p>
          </div>
        </div>

        {detailLoading ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : chapterTests.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="pt-6">
              <div className="text-center py-12 text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No Tests Found</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {chapterTests.map((test, idx) => (
              <motion.div
                key={test.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Card
                  className="cursor-pointer hover:shadow-md active:scale-[0.99] transition-all"
                  onClick={() => fetchTestResults(test)}
                >
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">{test.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {test.questions.length} questions
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    );
  }

  // Subject View - Chapters in subject
  if (selectedSubject) {
    const subjectChapters = chapters.filter(c => c.subject === selectedSubject);

    return (
      <motion.div
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
            <p className="text-sm text-muted-foreground">{examType} Chapters</p>
          </div>
        </div>

        {subjectChapters.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="pt-6">
              <div className="text-center py-12 text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No Chapters Yet</p>
                <p className="text-sm mt-2">No chapter tests available for this subject</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {subjectChapters.map((chapter, idx) => (
              <motion.div
                key={chapter.chapter}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Card
                  className="cursor-pointer hover:shadow-md active:scale-[0.99] transition-all"
                  onClick={() => fetchChapterTests(chapter.chapter, chapter.subject)}
                >
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">{chapter.chapter}</h3>
                      <p className="text-sm text-muted-foreground">
                        {chapter.testCount} test{chapter.testCount > 1 ? 's' : ''}
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    );
  }

  // Main View - Subjects
  if (chapters.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-xl font-bold">Chapter Test Review</h2>
            <p className="text-sm text-muted-foreground">{examType}</p>
          </div>
        </div>
        <Card className="border-dashed">
          <CardContent className="pt-6">
            <div className="text-center py-12 text-muted-foreground">
              <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No Chapter Tests</p>
              <p className="text-sm mt-2">Create chapter tests to see review options</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <motion.div
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
          <h2 className="text-xl font-bold">Chapter Test Review</h2>
          <p className="text-sm text-muted-foreground">{examType} - Select Subject</p>
        </div>
      </div>

      <div className="space-y-3">
        {subjects.map((subject, idx) => {
          const subjectChapters = chapters.filter(c => c.subject === subject);
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
                      {subjectChapters.length} chapter{subjectChapters.length !== 1 ? 's' : ''} with tests
                    </p>
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
