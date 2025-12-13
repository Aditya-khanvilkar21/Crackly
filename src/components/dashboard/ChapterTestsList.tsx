import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ArrowLeft, BookOpen, Clock, PlayCircle, ChevronRight } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

type ExamType = 'JEE' | 'NEET' | 'CET';
type Subject = 'physics' | 'chemistry' | 'mathematics' | 'biology';

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

interface ChapterTestsListProps {
  examType: ExamType;
  subject: Subject;
  studentId: string;
  onBack: () => void;
}

export const ChapterTestsList = ({ examType, subject, studentId, onBack }: ChapterTestsListProps) => {
  const navigate = useNavigate();
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTests();
  }, [examType, subject, studentId]);

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

      if (availabilityData && availabilityData.length > 0) {
        const testIds = availabilityData.map(a => a.test_id);

        const { data: testsData } = await supabase
          .from("tests")
          .select("*")
          .in("id", testIds)
          .eq("is_active", true)
          .eq("exam_type", examType)
          .eq("subject", subject)
          .eq("test_type", "chapter_test")
          .order("chapter", { ascending: true });

        if (testsData) {
          setTests(testsData as unknown as Test[]);
        }
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

  // Group tests by chapter
  const testsByChapter = tests.reduce((acc, test) => {
    const chapter = test.chapter || "General";
    if (!acc[chapter]) acc[chapter] = [];
    acc[chapter].push(test);
    return acc;
  }, {} as Record<string, Test[]>);

  const subjectTitle = subject.charAt(0).toUpperCase() + subject.slice(1);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse text-muted-foreground">Loading tests...</div>
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
          <h2 className="text-xl font-bold">{subjectTitle}</h2>
          <p className="text-sm text-muted-foreground">{examType} Chapter Tests</p>
        </div>
      </div>

      {Object.keys(testsByChapter).length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <BookOpen className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-50" />
            <p className="font-medium mb-1">No tests available</p>
            <p className="text-sm text-muted-foreground">
              Tests will appear once unlocked by your admin
            </p>
          </CardContent>
        </Card>
      ) : (
        <Accordion type="multiple" className="space-y-2">
          {Object.entries(testsByChapter).map(([chapter, chapterTests], index) => (
            <motion.div
              key={chapter}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <AccordionItem value={chapter} className="border rounded-lg bg-card overflow-hidden">
                <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50">
                  <div className="flex items-center gap-3 text-left">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <BookOpen className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{chapter}</p>
                      <p className="text-xs text-muted-foreground">{chapterTests.length} test(s)</p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-3 pt-1">
                  <div className="space-y-2">
                    {chapterTests.map((test) => (
                      <Card 
                        key={test.id} 
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => navigate(`/take-test/${test.id}`)}
                      >
                        <CardContent className="p-3 flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{test.title}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="secondary" className={`text-xs ${getDifficultyColor(test.difficulty)}`}>
                                {test.difficulty}
                              </Badge>
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {test.duration_minutes}m
                              </span>
                            </div>
                          </div>
                          <Button size="sm" className="shrink-0">
                            <PlayCircle className="w-4 h-4" />
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </motion.div>
          ))}
        </Accordion>
      )}
    </div>
  );
};
