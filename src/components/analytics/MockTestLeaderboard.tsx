import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Award, Trophy, Medal, ArrowLeft, Download, Users, Target, TrendingUp, Eye } from "lucide-react";
import { motion } from "framer-motion";
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { StudentTestDrillDown } from "./StudentTestDrillDown";

type ExamType = 'JEE' | 'NEET' | 'CET';

interface MockTest {
  id: string;
  title: string;
  exam_type: ExamType;
  created_at: string;
}

interface LeaderboardEntry {
  rank: number;
  studentName: string;
  studentId: string;
  visibleStudentId: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  marks: number;
  maxMarks: number;
  percentile: number;
  timeTaken: number;
  completedAt: string;
}

interface MockTestLeaderboardProps {
  examType: ExamType;
  userRole: string;
  onBack: () => void;
}

export const MockTestLeaderboard = ({ examType, userRole, onBack }: MockTestLeaderboardProps) => {
  const [mockTests, setMockTests] = useState<MockTest[]>([]);
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null);
  const [selectedTest, setSelectedTest] = useState<MockTest | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [drillDownOpen, setDrillDownOpen] = useState(false);
  const [drillDownStudent, setDrillDownStudent] = useState<{ id: string; name: string; rank: number } | null>(null);

  useEffect(() => {
    fetchMockTests();
  }, [examType]);

  useEffect(() => {
    if (selectedTestId) {
      fetchLeaderboard(selectedTestId);
    }
  }, [selectedTestId]);

  const fetchMockTests = async () => {
    setLoading(true);
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

      // Get tests available to these classes
      const { data: testAvailability } = await supabase
        .from("test_availability")
        .select("test_id")
        .in("class_id", classIds);

      if (!testAvailability || testAvailability.length === 0) {
        setLoading(false);
        return;
      }

      const testIds = [...new Set(testAvailability.map(ta => ta.test_id))];

      // Get mock tests
      const { data: tests } = await supabase
        .from("tests")
        .select("id, title, exam_type, created_at")
        .in("id", testIds)
        .eq("test_type", "mock_test")
        .eq("exam_type", examType)
        .order("created_at", { ascending: false });

      setMockTests(tests || []);
      
      // Auto-select first test
      if (tests && tests.length > 0) {
        setSelectedTestId(tests[0].id);
        setSelectedTest(tests[0]);
      }
    } catch (error) {
      console.error("Error fetching mock tests:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaderboard = async (testId: string) => {
    setLeaderboardLoading(true);
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

      // Get test details
      const { data: testData } = await supabase
        .from("tests")
        .select("questions, negative_marking")
        .eq("id", testId)
        .single();

      // Get results for this test
      const { data: results } = await supabase
        .from("test_results")
        .select("*")
        .eq("test_id", testId)
        .in("student_id", studentIds)
        .order("score", { ascending: false });

      // Get profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, student_id")
        .in("id", studentIds);

      if (results && profiles && testData) {
        const questions = testData.questions as any[];
        const negativeMarking = testData.negative_marking || 0;
        const maxMarks = questions.reduce((sum, q) => sum + (q.marksPerQuestion || 1), 0);

        // Group by student to get best score
        const studentBest = new Map<string, any>();
        results.forEach((r) => {
          const existing = studentBest.get(r.student_id);
          if (!existing || r.score > existing.score) {
            studentBest.set(r.student_id, r);
          }
        });

        // Calculate marks and create leaderboard
        const entries: LeaderboardEntry[] = Array.from(studentBest.values())
          .map(r => {
            const profile = profiles.find(p => p.id === r.student_id);
            const answers = r.answers as Record<number, number>;
            
            let correct = 0;
            let wrong = 0;
            let marks = 0;

            questions.forEach((q, idx) => {
              const marksPerQ = q.marksPerQuestion || 1;
              if (answers[idx] !== undefined) {
                if (answers[idx] === q.correctAnswer) {
                  correct++;
                  marks += marksPerQ;
                } else {
                  wrong++;
                  marks -= negativeMarking * marksPerQ;
                }
              }
            });

            marks = Math.max(0, marks);

            return {
              rank: 0,
              studentName: profile?.full_name || 'Unknown',
              studentId: r.student_id,
              visibleStudentId: profile?.student_id || '',
              score: r.score,
              totalQuestions: r.total_questions,
              percentage: (r.score / r.total_questions) * 100,
              marks,
              maxMarks,
              percentile: 0,
              timeTaken: r.time_taken_seconds || 0,
              completedAt: r.completed_at,
            };
          })
          .sort((a, b) => b.marks - a.marks);

        // Calculate percentiles and ranks
        const totalStudents = entries.length;
        entries.forEach((entry, idx) => {
          entry.rank = idx + 1;
          entry.percentile = totalStudents > 1 
            ? ((totalStudents - entry.rank) / (totalStudents - 1)) * 100
            : 100;
        });

        setLeaderboard(entries);
      }
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
    } finally {
      setLeaderboardLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const downloadLeaderboardPDF = () => {
    if (!selectedTest || leaderboard.length === 0) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFillColor(79, 70, 229);
    doc.rect(0, 0, pageWidth, 45, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('Mock Test Leaderboard', pageWidth / 2, 18, { align: 'center' });

    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.text(selectedTest.title, pageWidth / 2, 30, { align: 'center' });

    doc.setFontSize(11);
    doc.text(`${examType} | ${new Date().toLocaleDateString('en-IN')}`, pageWidth / 2, 40, { align: 'center' });

    // Stats
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    const avgMarks = leaderboard.reduce((sum, e) => sum + e.marks, 0) / leaderboard.length;
    const topMarks = leaderboard[0]?.marks || 0;
    
    doc.text(`Total Students: ${leaderboard.length}  |  Average Marks: ${avgMarks.toFixed(1)}  |  Top Score: ${topMarks.toFixed(1)}`, pageWidth / 2, 55, { align: 'center' });

    // Table
    const tableData = leaderboard.map(e => [
      `#${e.rank}`,
      e.studentName,
      e.visibleStudentId,
      `${e.marks.toFixed(1)}/${e.maxMarks}`,
      `${e.percentage.toFixed(1)}%`,
      `${e.percentile.toFixed(1)}%`,
    ]);

    (doc as any).autoTable({
      startY: 65,
      head: [['Rank', 'Student Name', 'ID', 'Marks', 'Accuracy', 'Percentile']],
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
            data.cell.styles.textColor = [0, 0, 0];
          } else if (rank === 2) {
            data.cell.styles.fillColor = [192, 192, 192];
            data.cell.styles.textColor = [0, 0, 0];
          } else if (rank === 3) {
            data.cell.styles.fillColor = [205, 127, 50];
            data.cell.styles.textColor = [255, 255, 255];
          }
        }
      }
    });

    // Footer
    const footerY = doc.internal.pageSize.getHeight() - 15;
    doc.setFontSize(9);
    doc.setTextColor(156, 163, 175);
    doc.setFont('helvetica', 'italic');
    doc.text('This is a computer-generated document.', pageWidth / 2, footerY, { align: 'center' });

    doc.save(`${selectedTest.title.replace(/\s+/g, '_')}_Leaderboard.pdf`);
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="h-5 w-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />;
    if (rank === 3) return <Medal className="h-5 w-5 text-orange-600" />;
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-xl font-bold">Mock Test Leaderboard</h2>
            <p className="text-sm text-muted-foreground">{examType} Class Rankings with Percentiles</p>
          </div>
        </div>
        {leaderboard.length > 0 && (
          <Button type="button" onClick={downloadLeaderboardPDF} className="gap-2">
            <Download className="h-4 w-4" />
            Download PDF
          </Button>
        )}
      </div>

      {/* Test Selector */}
      {mockTests.length > 0 && (
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">Select Test:</span>
          <Select value={selectedTestId || ''} onValueChange={(v) => {
            setSelectedTestId(v);
            setSelectedTest(mockTests.find(t => t.id === v) || null);
          }}>
            <SelectTrigger className="w-80">
              <SelectValue placeholder="Select a mock test" />
            </SelectTrigger>
            <SelectContent>
              {mockTests.map(test => (
                <SelectItem key={test.id} value={test.id}>
                  {test.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {mockTests.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="pt-6">
            <div className="text-center py-12 text-muted-foreground">
              <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No Mock Tests Found</p>
              <p className="text-sm mt-2">No mock tests are available for this exam type</p>
            </div>
          </CardContent>
        </Card>
      ) : leaderboardLoading ? (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : leaderboard.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="pt-6">
            <div className="text-center py-12 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No Attempts Yet</p>
              <p className="text-sm mt-2">No students have completed this mock test</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="bg-primary text-primary-foreground border-0">
              <CardContent className="p-4">
                <Users className="h-5 w-5 mb-2" />
                <div className="text-2xl font-bold">{leaderboard.length}</div>
                <p className="text-xs opacity-80">Total Students</p>
              </CardContent>
            </Card>
            <Card className="bg-accent text-accent-foreground border-0">
              <CardContent className="p-4">
                <Target className="h-5 w-5 mb-2" />
                <div className="text-2xl font-bold">
                  {(leaderboard.reduce((sum, e) => sum + e.marks, 0) / leaderboard.length).toFixed(1)}
                </div>
                <p className="text-xs opacity-80">Avg Marks</p>
              </CardContent>
            </Card>
            <Card className="bg-success text-success-foreground border-0">
              <CardContent className="p-4">
                <TrendingUp className="h-5 w-5 mb-2" />
                <div className="text-2xl font-bold">{leaderboard[0]?.marks.toFixed(1)}</div>
                <p className="text-xs opacity-80">Top Score</p>
              </CardContent>
            </Card>
            <Card className="gradient-primary text-white border-0">
              <CardContent className="p-4">
                <Award className="h-5 w-5 mb-2 text-white/90" />
                <div className="text-2xl font-bold">{leaderboard[0]?.maxMarks}</div>
                <p className="text-xs text-white/80">Max Marks</p>
              </CardContent>
            </Card>
          </div>

          {/* Leaderboard Table */}
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-primary" />
                Class Rankings
              </CardTitle>
              <CardDescription>Ranked by total marks with percentile scores</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-20">Rank</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead className="text-center">Marks</TableHead>
                      <TableHead className="text-center">Accuracy</TableHead>
                      <TableHead className="text-center">Percentile</TableHead>
                      <TableHead className="text-right">Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leaderboard.map((entry) => (
                      <TableRow 
                        key={entry.studentId} 
                        className={`cursor-pointer hover:bg-muted/50 ${entry.rank <= 3 ? 'bg-muted/30' : ''}`}
                        onClick={() => {
                          setDrillDownStudent({ id: entry.studentId, name: entry.studentName, rank: entry.rank });
                          setDrillDownOpen(true);
                        }}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getRankIcon(entry.rank)}
                            {entry.rank <= 3 ? (
                              <Badge className={
                                entry.rank === 1 ? 'bg-yellow-500' :
                                entry.rank === 2 ? 'bg-gray-400' : 'bg-orange-600'
                              }>
                                #{entry.rank}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">#{entry.rank}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div>
                              <div className="font-medium">{entry.studentName}</div>
                              <div className="text-xs text-muted-foreground">{entry.visibleStudentId}</div>
                            </div>
                            <Eye className="h-3 w-3 text-muted-foreground ml-auto" />
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="font-semibold">{entry.marks.toFixed(1)}</span>
                          <span className="text-muted-foreground">/{entry.maxMarks}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className={
                            entry.percentage >= 80 ? 'bg-green-600' :
                            entry.percentage >= 60 ? 'bg-yellow-600' : 'bg-red-600'
                          }>
                            {entry.percentage.toFixed(1)}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="font-bold">
                            {entry.percentile.toFixed(1)}%ile
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {formatTime(entry.timeTaken)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </>
      )}

      {/* Student Drill-Down Modal */}
      {drillDownStudent && selectedTestId && (
        <StudentTestDrillDown
          open={drillDownOpen}
          onOpenChange={setDrillDownOpen}
          studentId={drillDownStudent.id}
          testId={selectedTestId}
          studentName={drillDownStudent.name}
          rank={drillDownStudent.rank}
        />
      )}
    </motion.div>
  );
};
