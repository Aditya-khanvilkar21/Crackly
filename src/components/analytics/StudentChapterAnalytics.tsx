import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BookOpen, AlertTriangle, CheckCircle2, Target } from "lucide-react";

type ExamType = 'JEE' | 'NEET' | 'CET';
type Subject = 'physics' | 'chemistry' | 'mathematics' | 'biology';

interface ChapterStats {
  chapter: string;
  attempted: number;
  correct: number;
  total: number;
  accuracy: number;
}

interface StudentChapterAnalyticsProps {
  examType?: ExamType;
}

const getSubjects = (examType?: ExamType): Subject[] => {
  if (examType === 'NEET') return ['physics', 'chemistry', 'biology'];
  return ['physics', 'chemistry', 'mathematics'];
};

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const StudentChapterAnalytics = ({ examType }: StudentChapterAnalyticsProps) => {
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState<Subject>('physics');
  const [chapterStats, setChapterStats] = useState<ChapterStats[]>([]);

  const subjects = getSubjects(examType);

  useEffect(() => {
    fetchChapterData();
  }, [examType, selectedSubject]);

  const fetchChapterData = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Get student's test results
      const { data: results } = await supabase
        .from("test_results")
        .select("test_id, score, total_questions, answers")
        .eq("student_id", session.user.id);

      if (!results || results.length === 0) {
        setChapterStats([]);
        setLoading(false);
        return;
      }

      const testIds = [...new Set(results.map(r => r.test_id))];

      // Get chapter tests for selected subject
      let testsQuery = supabase
        .from("tests")
        .select("id, chapter, questions")
        .in("id", testIds)
        .eq("test_type", "chapter_test")
        .eq("subject", selectedSubject)
        .not("chapter", "is", null);

      if (examType) {
        testsQuery = testsQuery.eq("exam_type", examType);
      }

      const { data: tests } = await testsQuery;

      if (!tests || tests.length === 0) {
        setChapterStats([]);
        setLoading(false);
        return;
      }

      // Aggregate per chapter
      const chapterMap = new Map<string, { attempted: number; correct: number; total: number }>();

      tests.forEach((test: any) => {
        const questions = test.questions as any[];
        const result = results.find(r => r.test_id === test.id);
        if (!result) return;

        const answers = result.answers as Record<string, number>;
        const chapter = test.chapter as string;

        if (!chapterMap.has(chapter)) {
          chapterMap.set(chapter, { attempted: 0, correct: 0, total: 0 });
        }

        const stats = chapterMap.get(chapter)!;
        stats.total += questions.length;

        questions.forEach((q: any, idx: number) => {
          if (answers[idx.toString()] !== undefined) {
            stats.attempted++;
            if (answers[idx.toString()] === q.correctAnswer) {
              stats.correct++;
            }
          }
        });
      });

      const statsArr: ChapterStats[] = Array.from(chapterMap.entries())
        .map(([chapter, stats]) => ({
          chapter,
          ...stats,
          accuracy: stats.attempted > 0 ? Math.round((stats.correct / stats.attempted) * 100) : 0,
        }))
        .sort((a, b) => a.accuracy - b.accuracy);

      setChapterStats(statsArr);
    } catch (error) {
      console.error("Error fetching chapter analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const weakChapters = chapterStats.filter(c => c.accuracy < 50);
  const strongChapters = chapterStats.filter(c => c.accuracy >= 70);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Subject Selector */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <BookOpen className="h-5 w-5 text-primary" />
            <span className="font-medium text-sm">Select Subject:</span>
            <Select value={selectedSubject} onValueChange={(v) => setSelectedSubject(v as Subject)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {subjects.map(s => (
                  <SelectItem key={s} value={s}>{capitalize(s)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {chapterStats.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="pt-6">
            <div className="text-center py-8 text-muted-foreground">
              <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No chapter test data for {capitalize(selectedSubject)}</p>
              <p className="text-sm">Complete chapter tests to see analytics here</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Quick Summary */}
          <div className="grid grid-cols-3 gap-3">
            <Card className="border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20">
              <CardContent className="p-4 text-center">
                <AlertTriangle className="h-5 w-5 mx-auto mb-1 text-red-500" />
                <div className="text-2xl font-bold text-red-600">{weakChapters.length}</div>
                <p className="text-xs text-muted-foreground">Weak Chapters</p>
              </CardContent>
            </Card>
            <Card className="border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20">
              <CardContent className="p-4 text-center">
                <CheckCircle2 className="h-5 w-5 mx-auto mb-1 text-green-500" />
                <div className="text-2xl font-bold text-green-600">{strongChapters.length}</div>
                <p className="text-xs text-muted-foreground">Strong Chapters</p>
              </CardContent>
            </Card>
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-4 text-center">
                <Target className="h-5 w-5 mx-auto mb-1 text-primary" />
                <div className="text-2xl font-bold">
                  {chapterStats.length > 0
                    ? Math.round(chapterStats.reduce((s, c) => s + c.accuracy, 0) / chapterStats.length)
                    : 0}%
                </div>
                <p className="text-xs text-muted-foreground">Avg Accuracy</p>
              </CardContent>
            </Card>
          </div>

          {/* Chapter Table */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                {capitalize(selectedSubject)} — Chapter Performance
              </CardTitle>
              <CardDescription className="text-xs">
                Chapters sorted by accuracy (weakest first)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Chapter</TableHead>
                      <TableHead className="text-center">Attempted</TableHead>
                      <TableHead className="text-center">Correct</TableHead>
                      <TableHead className="text-center">Accuracy</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {chapterStats.map((ch) => (
                      <TableRow
                        key={ch.chapter}
                        className={
                          ch.accuracy < 50
                            ? 'bg-red-50/50 dark:bg-red-950/10'
                            : ch.accuracy >= 70
                            ? 'bg-green-50/50 dark:bg-green-950/10'
                            : ''
                        }
                      >
                        <TableCell className="font-medium text-sm max-w-[200px] truncate">
                          {ch.chapter}
                        </TableCell>
                        <TableCell className="text-center text-sm">
                          {ch.attempted}/{ch.total}
                        </TableCell>
                        <TableCell className="text-center text-sm">{ch.correct}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center gap-2 justify-center">
                            <Progress
                              value={ch.accuracy}
                              className={`h-2 w-16 ${
                                ch.accuracy < 50 ? '[&>div]:bg-red-500' :
                                ch.accuracy >= 70 ? '[&>div]:bg-green-500' :
                                '[&>div]:bg-yellow-500'
                              }`}
                            />
                            <span className={`text-xs font-bold ${
                              ch.accuracy < 50 ? 'text-red-600' :
                              ch.accuracy >= 70 ? 'text-green-600' :
                              'text-yellow-600'
                            }`}>
                              {ch.accuracy}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${
                              ch.accuracy < 50
                                ? 'border-red-500 text-red-700 dark:text-red-400'
                                : ch.accuracy >= 70
                                ? 'border-green-500 text-green-700 dark:text-green-400'
                                : 'border-yellow-500 text-yellow-700 dark:text-yellow-400'
                            }`}
                          >
                            {ch.accuracy < 50 ? 'Weak' : ch.accuracy >= 70 ? 'Strong' : 'Moderate'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Insights */}
          {(weakChapters.length > 0 || strongChapters.length > 0) && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  Chapter Insights
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {weakChapters.map(ch => (
                  <div key={ch.chapter} className="flex items-start gap-3 p-2 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 text-sm">
                    <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                    <span className="text-red-800 dark:text-red-200">
                      You are weak in <strong>{ch.chapter}</strong> ({ch.accuracy}% accuracy). Revise core concepts.
                    </span>
                  </div>
                ))}
                {strongChapters.slice(0, 3).map(ch => (
                  <div key={ch.chapter} className="flex items-start gap-3 p-2 rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                    <span className="text-green-800 dark:text-green-200">
                      Strong in <strong>{ch.chapter}</strong> ({ch.accuracy}% accuracy). Keep it up!
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};
