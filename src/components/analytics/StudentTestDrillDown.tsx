import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LatexRenderer } from "@/components/LatexRenderer";

import {
  CheckCircle, XCircle, MinusCircle, User, Target, Clock, AlertTriangle,
  Lightbulb, BookOpen, Filter, Brain, TrendingDown, TrendingUp
} from "lucide-react";

interface StudentTestDrillDownProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  testId: string;
  studentName: string;
  rank?: number;
}

interface QuestionAnalysis {
  index: number;
  question: string;
  questionImage?: string;
  options: string[];
  correctAnswer: number;
  studentAnswer: number | undefined;
  status: "correct" | "incorrect" | "unattempted";
  subject?: string;
  chapter?: string;
  topic?: string;
  explanation?: string;
  explanationImage?: string;
  marksPerQuestion?: number;
}

type QuestionFilter = "all" | "wrong" | "unattempted" | "correct";

export const StudentTestDrillDown = ({
  open, onOpenChange, studentId, testId, studentName, rank
}: StudentTestDrillDownProps) => {
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<QuestionAnalysis[]>([]);
  const [testTitle, setTestTitle] = useState("");
  const [timeTaken, setTimeTaken] = useState(0);
  const [filter, setFilter] = useState<QuestionFilter>("all");
  const [negativeMarking, setNegativeMarking] = useState(0);

  useEffect(() => {
    if (open && studentId && testId) {
      fetchData();
    }
  }, [open, studentId, testId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch test data and student result in parallel
      const [testRes, resultRes] = await Promise.all([
        supabase.from("tests").select("*").eq("id", testId).single(),
        supabase.from("test_results").select("*").eq("test_id", testId).eq("student_id", studentId).order("completed_at", { ascending: false }).limit(1).single(),
      ]);

      if (!testRes.data || !resultRes.data) {
        setLoading(false);
        return;
      }

      const test = testRes.data;
      const result = resultRes.data;
      const testQuestions = (test.questions as any[]) || [];
      const answers = (result.answers as Record<string, number>) || {};

      setTestTitle(test.title);
      setTimeTaken(result.time_taken_seconds || 0);
      setNegativeMarking(Number(test.negative_marking) || 0);

      const analyzed: QuestionAnalysis[] = testQuestions.map((q: any, idx: number) => {
        const studentAns = answers[idx];
        let status: "correct" | "incorrect" | "unattempted" = "unattempted";
        if (studentAns !== undefined && studentAns !== null && studentAns !== -1) {
          status = studentAns === q.correctAnswer ? "correct" : "incorrect";
        }

        return {
          index: idx,
          question: q.question || q.text || "",
          questionImage: q.questionImage || q.image,
          options: q.options || [],
          correctAnswer: q.correctAnswer,
          studentAnswer: studentAns !== undefined && studentAns !== -1 ? studentAns : undefined,
          status,
          subject: q.subject,
          chapter: q.chapter,
          topic: q.topic,
          explanation: q.explanation,
          explanationImage: q.explanationImage,
          marksPerQuestion: q.marksPerQuestion || 1,
        };
      });

      setQuestions(analyzed);
    } catch (err) {
      console.error("Error fetching drill-down data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Computed stats
  const stats = useMemo(() => {
    const total = questions.length;
    const correct = questions.filter(q => q.status === "correct").length;
    const incorrect = questions.filter(q => q.status === "incorrect").length;
    const unattempted = questions.filter(q => q.status === "unattempted").length;
    const attempted = correct + incorrect;
    const accuracy = attempted > 0 ? (correct / attempted) * 100 : 0;

    let marks = 0;
    let maxMarks = 0;
    questions.forEach(q => {
      const m = q.marksPerQuestion || 1;
      maxMarks += m;
      if (q.status === "correct") marks += m;
      else if (q.status === "incorrect") marks -= negativeMarking * m;
    });
    marks = Math.max(0, marks);

    return { total, correct, incorrect, unattempted, attempted, accuracy, marks, maxMarks };
  }, [questions, negativeMarking]);

  // Subject-wise breakdown
  const subjectBreakdown = useMemo(() => {
    const map = new Map<string, { correct: number; incorrect: number; unattempted: number; total: number }>();
    questions.forEach(q => {
      const subj = q.subject || "General";
      const existing = map.get(subj) || { correct: 0, incorrect: 0, unattempted: 0, total: 0 };
      existing.total++;
      if (q.status === "correct") existing.correct++;
      else if (q.status === "incorrect") existing.incorrect++;
      else existing.unattempted++;
      map.set(subj, existing);
    });
    return Array.from(map.entries()).map(([subject, data]) => ({
      subject,
      ...data,
      accuracy: (data.correct + data.incorrect) > 0 ? (data.correct / (data.correct + data.incorrect)) * 100 : 0,
    }));
  }, [questions]);

  // Chapter-wise breakdown
  const chapterBreakdown = useMemo(() => {
    const map = new Map<string, { correct: number; incorrect: number; total: number; subject: string }>();
    questions.forEach(q => {
      const ch = q.chapter || q.topic || "Unknown";
      const existing = map.get(ch) || { correct: 0, incorrect: 0, total: 0, subject: q.subject || "" };
      existing.total++;
      if (q.status === "correct") existing.correct++;
      else if (q.status === "incorrect") existing.incorrect++;
      map.set(ch, existing);
    });
    return Array.from(map.entries())
      .map(([chapter, data]) => ({
        chapter,
        ...data,
        accuracy: (data.correct + data.incorrect) > 0 ? (data.correct / (data.correct + data.incorrect)) * 100 : 0,
      }))
      .sort((a, b) => a.accuracy - b.accuracy);
  }, [questions]);

  // Smart insights
  const insights = useMemo(() => {
    const list: string[] = [];
    
    // Subject weaknesses
    const weakSubjects = subjectBreakdown.filter(s => s.accuracy < 50 && s.total > 0);
    weakSubjects.forEach(s => list.push(`Losing marks due to low accuracy in ${s.subject} (${s.accuracy.toFixed(0)}%).`));

    // Unattempted analysis
    const unattemptedBySubject = subjectBreakdown.filter(s => s.unattempted > s.total * 0.3);
    unattemptedBySubject.forEach(s => list.push(`Needs to attempt more questions in ${s.subject} (${s.unattempted} skipped).`));

    // Guessing detection
    subjectBreakdown.forEach(s => {
      const attempted = s.correct + s.incorrect;
      if (attempted > 3 && s.accuracy < 40) {
        list.push(`Possible guessing in ${s.subject} — high attempts but very low accuracy.`);
      }
    });

    // Time management
    if (timeTaken > 0 && stats.total > 0) {
      const avgTime = timeTaken / stats.total;
      if (avgTime > 120) list.push("Spending too much time per question. Needs better time management.");
      if (avgTime < 30 && stats.accuracy < 50) list.push("Rushing through questions — accuracy is suffering.");
    }

    // Chapter weaknesses
    const weakChapters = chapterBreakdown.filter(c => c.accuracy < 50 && c.total >= 2);
    if (weakChapters.length > 0) {
      list.push(`Weak in chapters: ${weakChapters.slice(0, 3).map(c => c.chapter).join(", ")}.`);
    }

    if (list.length === 0) list.push("Good overall performance! Keep practicing to maintain consistency.");

    return list;
  }, [subjectBreakdown, chapterBreakdown, timeTaken, stats]);

  // Filtered questions
  const filteredQuestions = useMemo(() => {
    if (filter === "all") return questions;
    return questions.filter(q => q.status === filter);
  }, [questions, filter]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getStatusIcon = (status: string) => {
    if (status === "correct") return <CheckCircle className="h-4 w-4 text-green-600" />;
    if (status === "incorrect") return <XCircle className="h-4 w-4 text-red-600" />;
    return <MinusCircle className="h-4 w-4 text-muted-foreground" />;
  };

  const optionLabels = ["A", "B", "C", "D"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Student Analysis — {studentName}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center p-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <ScrollArea className="flex-1 pr-2">
            <div className="space-y-4 pb-4">
              {/* Summary Card */}
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-lg">{studentName}</h3>
                      <p className="text-sm text-muted-foreground">{testTitle}</p>
                    </div>
                    {rank && (
                      <Badge className="text-lg px-3 py-1" variant="outline">Rank #{rank}</Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-2 text-center text-sm">
                    <div className="p-2 rounded-lg bg-background">
                      <div className="font-bold text-lg">{stats.marks}/{stats.maxMarks}</div>
                      <div className="text-xs text-muted-foreground">Score</div>
                    </div>
                    <div className="p-2 rounded-lg bg-background">
                      <div className="font-bold text-lg">{stats.accuracy.toFixed(0)}%</div>
                      <div className="text-xs text-muted-foreground">Accuracy</div>
                    </div>
                    <div className="p-2 rounded-lg bg-background">
                      <div className="font-bold text-lg text-green-600">{stats.correct}</div>
                      <div className="text-xs text-muted-foreground">Correct</div>
                    </div>
                    <div className="p-2 rounded-lg bg-background">
                      <div className="font-bold text-lg text-red-600">{stats.incorrect}</div>
                      <div className="text-xs text-muted-foreground">Wrong</div>
                    </div>
                    <div className="p-2 rounded-lg bg-background">
                      <div className="font-bold text-lg text-muted-foreground">{stats.unattempted}</div>
                      <div className="text-xs text-muted-foreground">Skipped</div>
                    </div>
                    <div className="p-2 rounded-lg bg-background">
                      <div className="font-bold text-lg">{formatTime(timeTaken)}</div>
                      <div className="text-xs text-muted-foreground">Time</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Subject Breakdown */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Target className="h-4 w-4" /> Subject Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {subjectBreakdown.map(s => {
                      const isWeak = s.accuracy < 50;
                      const isStrong = s.accuracy >= 70;
                      return (
                        <div key={s.subject} className={`p-3 rounded-lg border ${isWeak ? 'border-red-300 bg-red-50/50 dark:bg-red-950/20' : isStrong ? 'border-green-300 bg-green-50/50 dark:bg-green-950/20' : 'border-border'}`}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-sm capitalize">{s.subject}</span>
                            <Badge className={isWeak ? 'bg-red-600' : isStrong ? 'bg-green-600' : 'bg-yellow-600'}>
                              {s.accuracy.toFixed(0)}%
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {s.correct}✓ · {s.incorrect}✗ · {s.unattempted} skipped / {s.total}
                          </div>
                          <div className="w-full bg-muted rounded-full h-1.5 mt-2">
                            <div className={`h-1.5 rounded-full ${isWeak ? 'bg-red-600' : isStrong ? 'bg-green-600' : 'bg-yellow-600'}`}
                              style={{ width: `${Math.min(s.accuracy, 100)}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <Tabs defaultValue="questions" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="questions">Questions</TabsTrigger>
                  <TabsTrigger value="chapters">Chapters</TabsTrigger>
                  <TabsTrigger value="insights">Insights</TabsTrigger>
                </TabsList>

                {/* Question-wise Analysis */}
                <TabsContent value="questions">
                  <div className="flex gap-2 mb-3 flex-wrap">
                    {(["all", "wrong", "unattempted", "correct"] as QuestionFilter[]).map(f => (
                      <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)} className="capitalize">
                        {f === "all" ? `All (${questions.length})` :
                         f === "wrong" ? `Wrong (${stats.incorrect})` :
                         f === "unattempted" ? `Skipped (${stats.unattempted})` :
                         `Correct (${stats.correct})`}
                      </Button>
                    ))}
                  </div>
                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                    {filteredQuestions.map(q => (
                      <Card key={q.index} className={`p-3 ${q.status === 'incorrect' ? 'border-red-300' : q.status === 'correct' ? 'border-green-300' : 'border-dashed'}`}>
                        <div className="flex items-start gap-2 mb-2">
                          {getStatusIcon(q.status)}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm">Q{q.index + 1}</span>
                              {q.subject && <Badge variant="outline" className="text-xs capitalize">{q.subject}</Badge>}
                              {q.chapter && <Badge variant="outline" className="text-xs">{q.chapter}</Badge>}
                            </div>
                            <div className="text-sm">
                              <LatexRenderer content={q.question} />
                            </div>
                            {q.questionImage && (
                              <QuestionImageRenderer imageUrl={q.questionImage} alt={`Q${q.index + 1}`} className="max-h-32 mt-1" />
                            )}
                          </div>
                        </div>
                        
                        {/* Options */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 ml-6 text-sm">
                          {q.options.map((opt, oi) => {
                            const isCorrect = oi === q.correctAnswer;
                            const isStudent = oi === q.studentAnswer;
                            return (
                              <div key={oi} className={`p-1.5 rounded text-xs ${isCorrect ? 'bg-green-100 dark:bg-green-950/30 font-medium' : isStudent ? 'bg-red-100 dark:bg-red-950/30' : ''}`}>
                                <span className="font-medium mr-1">{optionLabels[oi]}.</span>
                                <LatexRenderer content={opt} />
                                {isCorrect && <span className="ml-1 text-green-600">✓</span>}
                                {isStudent && !isCorrect && <span className="ml-1 text-red-600">✗</span>}
                              </div>
                            );
                          })}
                        </div>

                        {/* Explanation */}
                        {q.explanation && (
                          <div className="mt-2 ml-6 p-2 bg-muted/50 rounded text-xs">
                            <span className="font-medium">Explanation: </span>
                            <LatexRenderer content={q.explanation} />
                            {q.explanationImage && (
                              <QuestionImageRenderer imageUrl={q.explanationImage} alt="Explanation" className="max-h-24 mt-1" />
                            )}
                          </div>
                        )}
                      </Card>
                    ))}
                    {filteredQuestions.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">No questions match this filter.</div>
                    )}
                  </div>
                </TabsContent>

                {/* Chapter Analysis */}
                <TabsContent value="chapters">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Chapter</TableHead>
                        <TableHead className="text-center">Questions</TableHead>
                        <TableHead className="text-center">Correct</TableHead>
                        <TableHead className="text-center">Accuracy</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {chapterBreakdown.map(ch => (
                        <TableRow key={ch.chapter}>
                          <TableCell>
                            <div>
                              <div className="font-medium text-sm">{ch.chapter}</div>
                              <div className="text-xs text-muted-foreground capitalize">{ch.subject}</div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">{ch.total}</TableCell>
                          <TableCell className="text-center">{ch.correct}/{ch.correct + ch.incorrect}</TableCell>
                          <TableCell className="text-center">
                            <Badge className={ch.accuracy >= 70 ? 'bg-green-600' : ch.accuracy >= 50 ? 'bg-yellow-600' : 'bg-red-600'}>
                              {ch.accuracy.toFixed(0)}%
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            {ch.accuracy >= 70 ? (
                              <TrendingUp className="h-4 w-4 text-green-600 inline" />
                            ) : ch.accuracy < 50 ? (
                              <TrendingDown className="h-4 w-4 text-red-600 inline" />
                            ) : (
                              <span className="text-yellow-600 text-xs">Average</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                      {chapterBreakdown.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            No chapter data available
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TabsContent>

                {/* Smart Insights */}
                <TabsContent value="insights">
                  <div className="space-y-2">
                    {insights.map((insight, idx) => (
                      <div key={idx} className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border">
                        <Lightbulb className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                        <p className="text-sm">{insight}</p>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
};
