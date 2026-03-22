import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, BookOpen, ChevronRight, CheckCircle2, Lightbulb, FileText, FolderOpen, ImageIcon } from "lucide-react";
import { LatexRenderer } from "@/components/LatexRenderer";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type ExamType = 'JEE' | 'NEET' | 'CET';
type TestType = 'chapter' | 'mock';

interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
  topic?: string;
}

interface Test {
  id: string;
  title: string;
  subject: string | null;
  chapter: string | null;
  test_type: string;
  questions: Question[];
}

interface ChapterGroup {
  chapter: string;
  tests: Test[];
  totalQuestions: number;
}

interface SubjectGroup {
  subject: string;
  chapters: ChapterGroup[];
  totalQuestions: number;
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
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<ChapterGroup | null>(null);
  const [selectedTest, setSelectedTest] = useState<Test | null>(null);
  const [subjectGroups, setSubjectGroups] = useState<SubjectGroup[]>([]);

  useEffect(() => {
    fetchTests();
  }, [examType, testType]);

  useEffect(() => {
    groupTestsBySubjectAndChapter();
  }, [tests]);

  const fetchTests = async () => {
    setLoading(true);
    setSelectedSubject(null);
    setSelectedChapter(null);
    setSelectedTest(null);
    
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

  const groupTestsBySubjectAndChapter = () => {
    const groups: Record<string, Record<string, Test[]>> = {};
    
    tests.forEach(test => {
      const subject = test.subject || 'general';
      const chapter = test.chapter || 'General';
      
      if (!groups[subject]) {
        groups[subject] = {};
      }
      if (!groups[subject][chapter]) {
        groups[subject][chapter] = [];
      }
      groups[subject][chapter].push(test);
    });

    const subjectGroupsArray: SubjectGroup[] = Object.entries(groups).map(([subject, chapters]) => {
      const chapterGroups: ChapterGroup[] = Object.entries(chapters).map(([chapter, chapterTests]) => ({
        chapter,
        tests: chapterTests,
        totalQuestions: chapterTests.reduce((sum, t) => sum + t.questions.length, 0)
      }));
      
      return {
        subject,
        chapters: chapterGroups,
        totalQuestions: chapterGroups.reduce((sum, c) => sum + c.totalQuestions, 0)
      };
    });

    setSubjectGroups(subjectGroupsArray);
  };

  const getSubjectColor = (subject: string | null) => {
    switch (subject) {
      case 'physics': return 'bg-blue-500/10 text-blue-600 border-blue-500/30';
      case 'chemistry': return 'bg-green-500/10 text-green-600 border-green-500/30';
      case 'mathematics': return 'bg-purple-500/10 text-purple-600 border-purple-500/30';
      case 'biology': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getSubjectIcon = (subject: string) => {
    return subject.charAt(0).toUpperCase() + subject.slice(1);
  };

  const getOptionLabel = (index: number) => {
    return String.fromCharCode(65 + index);
  };

  const handleBack = () => {
    if (selectedTest) {
      setSelectedTest(null);
    } else if (selectedChapter) {
      setSelectedChapter(null);
    } else if (selectedSubject) {
      setSelectedSubject(null);
    } else {
      onBack();
    }
  };

  const renderBreadcrumb = () => {
    const items = ['Subjects'];
    if (selectedSubject) items.push(getSubjectIcon(selectedSubject));
    if (selectedChapter) items.push(selectedChapter.chapter);
    if (selectedTest) items.push(selectedTest.title);

    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4 flex-wrap">
        {items.map((item, index) => (
          <span key={index} className="flex items-center gap-2">
            {index > 0 && <ChevronRight className="h-3 w-3" />}
            <span className={index === items.length - 1 ? 'text-foreground font-medium' : ''}>
              {item}
            </span>
          </span>
        ))}
      </div>
    );
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

  // Render Questions View
  if (selectedTest) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={handleBack} className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-xl font-bold">{selectedTest.title}</h2>
            <p className="text-sm text-muted-foreground">
              {selectedTest.questions.length} questions with explanations
            </p>
          </div>
        </div>

        {renderBreadcrumb()}

        <ScrollArea className="h-[calc(100vh-280px)]">
          <div className="space-y-6 pr-4">
            {selectedTest.questions.map((question, qIndex) => (
              <Card key={question.id || qIndex}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex gap-3">
                    <Badge className="shrink-0 bg-primary/10 text-primary border-primary/30">
                      Q{qIndex + 1}
                    </Badge>
                    <div className="flex-1">
                      <p className="text-sm font-medium leading-relaxed">{question.question}</p>
                      {question.topic && (
                        <Badge variant="outline" className="mt-2 text-xs bg-amber-500/10 text-amber-600 border-amber-500/30">
                          Topic: {question.topic}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="ml-8 space-y-2">
                    {question.options.map((option, oIndex) => (
                      <div
                        key={oIndex}
                        className={`flex items-start gap-2 p-3 rounded-lg text-sm ${
                          oIndex === question.correctAnswer
                            ? 'bg-green-500/10 border border-green-500/30'
                            : 'bg-muted/50'
                        }`}
                      >
                        <span className={`font-bold shrink-0 ${
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
                    <div className="ml-8 mt-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                      <div className="flex items-start gap-2">
                        <Lightbulb className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="text-xs font-bold text-amber-600 uppercase tracking-wide">
                            Explanation
                          </span>
                          <p className="text-sm mt-1 leading-relaxed">{question.explanation}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </div>
    );
  }

  // Render Chapter Tests View
  if (selectedChapter) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={handleBack} className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-xl font-bold">{selectedChapter.chapter}</h2>
            <p className="text-sm text-muted-foreground">
              {selectedChapter.tests.length} tests • {selectedChapter.totalQuestions} questions
            </p>
          </div>
        </div>

        {renderBreadcrumb()}

        <ScrollArea className="h-[calc(100vh-280px)]">
          <div className="grid gap-3 pr-4">
            {selectedChapter.tests.map((test) => (
              <Card 
                key={test.id} 
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => setSelectedTest(test)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-primary" />
                      <div>
                        <h3 className="font-semibold">{test.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {test.questions.length} questions
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </div>
    );
  }

  // Render Chapters View
  if (selectedSubject) {
    const subjectGroup = subjectGroups.find(s => s.subject === selectedSubject);
    
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={handleBack} className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-xl font-bold">{getSubjectIcon(selectedSubject)}</h2>
            <p className="text-sm text-muted-foreground">
              {subjectGroup?.chapters.length || 0} chapters • {subjectGroup?.totalQuestions || 0} questions
            </p>
          </div>
        </div>

        {renderBreadcrumb()}

        <ScrollArea className="h-[calc(100vh-280px)]">
          <div className="grid gap-3 pr-4">
            {subjectGroup?.chapters.map((chapter) => (
              <Card 
                key={chapter.chapter} 
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => setSelectedChapter(chapter)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${getSubjectColor(selectedSubject)}`}>
                        <FolderOpen className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{chapter.chapter}</h3>
                        <p className="text-sm text-muted-foreground">
                          {chapter.tests.length} tests • {chapter.totalQuestions} questions
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            ))}

            {(!subjectGroup || subjectGroup.chapters.length === 0) && (
              <Card>
                <CardContent className="p-8 text-center">
                  <BookOpen className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="text-muted-foreground">No chapters found for this subject</p>
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>
      </div>
    );
  }

  // Render Subjects View (Main)
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-xl font-bold">{examType} Post-Test Discussion</h2>
          <p className="text-sm text-muted-foreground">View chapter-wise question bank with explanations</p>
        </div>
      </div>

      {/* Test Type Tabs */}
      <Tabs value={testType} onValueChange={(v) => setTestType(v as TestType)}>
        <TabsList className="grid w-full max-w-xs grid-cols-2">
          <TabsTrigger value="chapter">Chapter Tests</TabsTrigger>
          <TabsTrigger value="mock">Mock Tests</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Summary */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <FileText className="h-4 w-4" />
        <span>
          {subjectGroups.length} subjects • {subjectGroups.reduce((sum, s) => sum + s.totalQuestions, 0)} total questions
        </span>
      </div>

      {/* Subjects Grid */}
      <ScrollArea className="h-[calc(100vh-320px)]">
        <div className="grid gap-4 pr-4 sm:grid-cols-2 lg:grid-cols-3">
          {subjectGroups.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="p-8 text-center">
                <BookOpen className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-muted-foreground">No tests found for this selection</p>
              </CardContent>
            </Card>
          ) : (
            subjectGroups.map((group) => (
              <Card 
                key={group.subject} 
                className="cursor-pointer hover:bg-muted/50 transition-colors group"
                onClick={() => setSelectedSubject(group.subject)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className={getSubjectColor(group.subject)}>
                      {getSubjectIcon(group.subject)}
                    </Badge>
                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    <p className="text-2xl font-bold">{group.chapters.length}</p>
                    <p className="text-sm text-muted-foreground">
                      Chapters • {group.totalQuestions} questions
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};