import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, BookOpen, ChevronDown, ChevronUp, CheckCircle2, Lightbulb, FileText } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ExamType = 'JEE' | 'NEET' | 'CET';
type TestType = 'chapter' | 'mock';

interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
}

interface Test {
  id: string;
  title: string;
  subject: string | null;
  chapter: string | null;
  test_type: string;
  questions: Question[];
}

interface PostTestDiscussionProps {
  examType: ExamType;
  userRole: string;
  onBack: () => void;
}

const SUBJECTS: Record<ExamType, string[]> = {
  JEE: ['physics', 'chemistry', 'mathematics'],
  NEET: ['physics', 'chemistry', 'biology'],
  CET: ['physics', 'chemistry', 'mathematics'],
};

export const PostTestDiscussion = ({ examType, userRole, onBack }: PostTestDiscussionProps) => {
  const [loading, setLoading] = useState(true);
  const [tests, setTests] = useState<Test[]>([]);
  const [testType, setTestType] = useState<TestType>('chapter');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [expandedTest, setExpandedTest] = useState<string | null>(null);

  useEffect(() => {
    fetchTests();
  }, [examType, testType]);

  const fetchTests = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tests')
        .select('id, title, subject, chapter, test_type, questions')
        .eq('exam_type', examType)
        .eq('test_type', testType === 'chapter' ? 'chapter_test' : 'mock_test')
        .eq('is_active', true)
        .order('subject', { ascending: true })
        .order('chapter', { ascending: true });

      if (error) throw error;

      const formattedTests = (data || []).map(test => ({
        ...test,
        questions: Array.isArray(test.questions) 
          ? (test.questions as unknown as Question[])
          : JSON.parse(test.questions as string) as Question[]
      }));

      setTests(formattedTests);
    } catch (error) {
      console.error('Error fetching tests:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTests = selectedSubject === 'all' 
    ? tests 
    : tests.filter(test => test.subject === selectedSubject);

  const getSubjectColor = (subject: string | null) => {
    switch (subject) {
      case 'physics': return 'bg-blue-500/10 text-blue-600 border-blue-500/30';
      case 'chemistry': return 'bg-green-500/10 text-green-600 border-green-500/30';
      case 'mathematics': return 'bg-purple-500/10 text-purple-600 border-purple-500/30';
      case 'biology': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getOptionLabel = (index: number) => {
    return String.fromCharCode(65 + index);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Skeleton className="h-8 w-48" />
        </div>
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
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
          <h2 className="text-xl font-bold">{examType} Post-Test Discussion</h2>
          <p className="text-sm text-muted-foreground">Review questions with answers & explanations</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <Select value={testType} onValueChange={(value) => setTestType(value as TestType)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Test Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="chapter">Chapter Tests</SelectItem>
            <SelectItem value="mock">Mock Tests</SelectItem>
          </SelectContent>
        </Select>

        <Select value={selectedSubject} onValueChange={setSelectedSubject}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Subject" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Subjects</SelectItem>
            {SUBJECTS[examType].map(subject => (
              <SelectItem key={subject} value={subject}>
                {subject.charAt(0).toUpperCase() + subject.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <FileText className="h-4 w-4" />
        <span>{filteredTests.length} {testType === 'chapter' ? 'Chapter Tests' : 'Mock Tests'} found</span>
      </div>

      {/* Tests List */}
      <ScrollArea className="h-[calc(100vh-280px)]">
        <div className="space-y-3 pr-4">
          {filteredTests.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <BookOpen className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-muted-foreground">No tests found for this selection</p>
              </CardContent>
            </Card>
          ) : (
            filteredTests.map((test) => (
              <Card key={test.id} className="overflow-hidden">
                <div
                  className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setExpandedTest(expandedTest === test.id ? null : test.id)}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className={getSubjectColor(test.subject)}>
                          {test.subject || 'General'}
                        </Badge>
                        {test.chapter && (
                          <span className="text-xs text-muted-foreground truncate">
                            {test.chapter}
                          </span>
                        )}
                      </div>
                      <h3 className="font-semibold text-sm truncate">{test.title}</h3>
                      <p className="text-xs text-muted-foreground">
                        {test.questions.length} questions
                      </p>
                    </div>
                    {expandedTest === test.id ? (
                      <ChevronUp className="h-5 w-5 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0" />
                    )}
                  </div>
                </div>

                <AnimatePresence>
                  {expandedTest === test.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="border-t">
                        <ScrollArea className="max-h-[60vh]">
                          <div className="p-4 space-y-6">
                            {test.questions.map((question, qIndex) => (
                              <div key={question.id || qIndex} className="space-y-3">
                                <div className="flex gap-3">
                                  <span className="font-bold text-primary shrink-0">
                                    Q{qIndex + 1}.
                                  </span>
                                  <p className="text-sm font-medium">{question.question}</p>
                                </div>

                                <div className="ml-8 space-y-2">
                                  {question.options.map((option, oIndex) => (
                                    <div
                                      key={oIndex}
                                      className={`flex items-start gap-2 p-2 rounded-lg text-sm ${
                                        oIndex === question.correctAnswer
                                          ? 'bg-green-500/10 border border-green-500/30'
                                          : 'bg-muted/50'
                                      }`}
                                    >
                                      <span className={`font-semibold shrink-0 ${
                                        oIndex === question.correctAnswer ? 'text-green-600' : ''
                                      }`}>
                                        {getOptionLabel(oIndex)}.
                                      </span>
                                      <span className="flex-1">{option}</span>
                                      {oIndex === question.correctAnswer && (
                                        <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                                      )}
                                    </div>
                                  ))}
                                </div>

                                {question.explanation && (
                                  <div className="ml-8 mt-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                                    <div className="flex items-start gap-2">
                                      <Lightbulb className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                                      <div>
                                        <span className="text-xs font-semibold text-amber-600 uppercase">
                                          Explanation
                                        </span>
                                        <p className="text-sm mt-1">{question.explanation}</p>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {qIndex < test.questions.length - 1 && (
                                  <div className="border-b border-dashed pt-3" />
                                )}
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
