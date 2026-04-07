import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ArrowLeft, Clock, PlayCircle, FileText } from "lucide-react";

type ExamType = 'JEE' | 'NEET' | 'CET';

interface Test {
  id: string;
  title: string;
  difficulty: string;
  duration_minutes: number;
  exam_type: ExamType;
}

interface MockTestsListProps {
  examType: ExamType;
  studentId: string;
  onBack: () => void;
}

export const MockTestsList = ({ examType, studentId, onBack }: MockTestsListProps) => {
  const navigate = useNavigate();
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTests();
  }, [examType, studentId]);

  const fetchTests = async () => {
    setLoading(true);
    
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

      // Use secure RPC that excludes questions/answers
      const { data: testsData } = await supabase
        .rpc("get_student_available_tests", {
          _exam_type: examType,
          _test_type: "mock_test" as const,
        });

      if (testsData) {
        setTests(testsData as unknown as Test[]);
      }
    }
    setLoading(false);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "easy": return "bg-green-500/20 text-green-700 dark:text-green-400";
      case "medium": return "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400";
      case "hard": return "bg-red-500/20 text-red-700 dark:text-red-400";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getExamGradient = () => {
    switch (examType) {
      case 'JEE': return 'from-blue-500 to-indigo-600';
      case 'NEET': return 'from-green-500 to-emerald-600';
      case 'CET': return 'from-purple-500 to-pink-600';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse text-muted-foreground">Loading mock tests...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-xl font-bold">Mock Tests</h2>
          <p className="text-sm text-muted-foreground">{examType} Full Syllabus</p>
        </div>
      </div>

      {tests.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <FileText className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-50" />
            <p className="font-medium mb-1">No mock tests available</p>
            <p className="text-sm text-muted-foreground">
              Mock tests will appear once unlocked by your admin
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {tests.map((test, index) => (
            <motion.div
              key={test.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="overflow-hidden">
                <div className={`h-1 bg-gradient-to-r ${getExamGradient()}`} />
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-xl bg-gradient-to-br ${getExamGradient()} shrink-0`}>
                      <FileText className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-base mb-1 truncate">{test.title}</h3>
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <Badge variant="secondary" className={getDifficultyColor(test.difficulty)}>
                          {test.difficulty}
                        </Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {test.duration_minutes} min
                        </span>
                      </div>
                      <Button 
                        onClick={() => navigate(`/take-test/${test.id}`)} 
                        className="w-full"
                        size="sm"
                      >
                        <PlayCircle className="w-4 h-4 mr-2" />
                        Start Mock Test
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};
