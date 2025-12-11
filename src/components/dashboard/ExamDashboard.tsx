import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, Clock, PlayCircle, TrendingUp, ArrowLeft } from "lucide-react";
import { StudentAnalytics } from "@/components/analytics/StudentAnalytics";
import { motion } from "framer-motion";

type ExamType = 'JEE' | 'NEET' | 'CET';

interface Test {
  id: string;
  title: string;
  subject: string | null;
  chapter: string | null;
  difficulty: string;
  duration_minutes: number;
  test_type: 'chapter_test' | 'mock_test';
  exam_type: ExamType;
}

interface TestResult {
  score: number;
  total_questions: number;
  test_id: string;
  completed_at: string;
}

interface ExamDashboardProps {
  examType: ExamType;
  studentId: string;
  onBack: () => void;
}

export const ExamDashboard = ({ examType, studentId, onBack }: ExamDashboardProps) => {
  const navigate = useNavigate();
  const [tests, setTests] = useState<Test[]>([]);
  const [results, setResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [examType, studentId]);

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch tests for this exam type
    const { data: classData } = await supabase
      .from("class_students")
      .select("class_id")
      .eq("student_id", studentId);

    if (classData && classData.length > 0) {
      const classIds = classData.map(c => c.class_id);

      const { data: availabilityData } = await supabase
        .from("test_availability")
        .select("test_id")
        .in("class_id", classIds)
        .eq("is_locked", false);

      if (availabilityData && availabilityData.length > 0) {
        const testIds = availabilityData.map(a => a.test_id);

        const { data: testsData } = await supabase
          .from("tests")
          .select("*")
          .in("id", testIds)
          .eq("is_active", true)
          .eq("exam_type", examType)
          .order("created_at", { ascending: false });

        if (testsData) {
          setTests(testsData as unknown as Test[]);
        }
      }
    }

    // Fetch results for this exam type
    const { data: resultsData } = await supabase
      .from("test_results")
      .select("*, tests!inner(exam_type)")
      .eq("student_id", studentId);

    if (resultsData) {
      const filteredResults = resultsData.filter(
        (r: any) => r.tests?.exam_type === examType
      );
      setResults(filteredResults as TestResult[]);
    }

    setLoading(false);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "easy": return "bg-green-500 hover:bg-green-600";
      case "medium": return "bg-yellow-500 hover:bg-yellow-600";
      case "hard": return "bg-red-500 hover:bg-red-600";
      default: return "bg-gray-500 hover:bg-gray-600";
    }
  };

  const getExamColors = () => {
    switch (examType) {
      case 'JEE': return { primary: 'blue', gradient: 'from-blue-500 to-indigo-600' };
      case 'NEET': return { primary: 'green', gradient: 'from-green-500 to-emerald-600' };
      case 'CET': return { primary: 'purple', gradient: 'from-purple-500 to-pink-600' };
    }
  };

  const colors = getExamColors();
  const chapterTests = tests.filter(t => t.test_type === 'chapter_test');
  const mockTests = tests.filter(t => t.test_type === 'mock_test');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse text-muted-foreground">Loading {examType} tests...</div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-6"
    >
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Exams
        </Button>
        <div>
          <h2 className="text-2xl font-bold">{examType} Dashboard</h2>
          <p className="text-muted-foreground">
            {examType === 'JEE' && 'Physics, Chemistry, Mathematics'}
            {examType === 'NEET' && 'Physics, Chemistry, Biology'}
            {examType === 'CET' && 'State Level Engineering Tests'}
          </p>
        </div>
      </div>

      <Tabs defaultValue="tests" className="space-y-6">
        <TabsList>
          <TabsTrigger value="tests">Available Tests</TabsTrigger>
          <TabsTrigger value="analytics">
            <TrendingUp className="w-4 h-4 mr-2" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tests" className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Chapter Tests</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{chapterTests.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Mock Tests</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{mockTests.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Tests Completed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{results.length}</div>
              </CardContent>
            </Card>
          </div>

          {tests.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <BookOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="font-semibold mb-2">No {examType} tests available yet</p>
                <p className="text-sm text-muted-foreground">
                  Tests will appear here once your admin unlocks them for your class.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-8">
              {/* Mock Tests */}
              {mockTests.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <div className={`w-1 h-6 bg-gradient-to-b ${colors.gradient} rounded-full`}></div>
                    {examType} Mock Tests (Full Syllabus)
                  </h3>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {mockTests.map((test) => (
                      <Card key={test.id} className={`hover:shadow-lg transition-shadow border-l-4 border-l-${colors.primary}-500`}>
                        <CardHeader>
                          <div className="flex items-start justify-between mb-2">
                            <Badge className={getDifficultyColor(test.difficulty)}>
                              {test.difficulty}
                            </Badge>
                            <Badge variant="outline">{examType}</Badge>
                          </div>
                          <CardTitle className="text-lg">{test.title}</CardTitle>
                          <CardDescription>Full Syllabus Mock Test</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {test.duration_minutes} min
                            </span>
                          </div>
                          <Button onClick={() => navigate(`/take-test/${test.id}`)} className="w-full">
                            <PlayCircle className="w-4 h-4 mr-2" />
                            Start Mock Test
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Chapter Tests by Subject */}
              {chapterTests.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <div className={`w-1 h-6 bg-gradient-to-b ${colors.gradient} rounded-full`}></div>
                    Chapter-wise Tests
                  </h3>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {chapterTests.map((test) => (
                      <Card key={test.id} className="hover:shadow-lg transition-shadow">
                        <CardHeader>
                          <div className="flex items-start justify-between mb-2">
                            <Badge className={getDifficultyColor(test.difficulty)}>
                              {test.difficulty}
                            </Badge>
                            {test.subject && (
                              <Badge variant="secondary">{test.subject}</Badge>
                            )}
                          </div>
                          <CardTitle className="text-lg">{test.title}</CardTitle>
                          <CardDescription>{test.chapter}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                            <span className="flex items-center gap-1">
                              <BookOpen className="w-4 h-4" />
                              25 Questions
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {test.duration_minutes} min
                            </span>
                          </div>
                          <Button onClick={() => navigate(`/take-test/${test.id}`)} className="w-full">
                            <PlayCircle className="w-4 h-4 mr-2" />
                            Start Test
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="analytics">
          <StudentAnalytics examType={examType} />
        </TabsContent>
      </Tabs>
    </motion.div>
  );
};
