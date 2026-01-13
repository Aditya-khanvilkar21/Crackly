import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, BookOpen, FileText, TrendingUp, ChevronRight } from "lucide-react";
import { SubjectSelector } from "./SubjectSelector";
import { ChapterTestsList } from "./ChapterTestsList";
import { MockTestsList } from "./MockTestsList";
import { NextGenStudentAnalytics } from "@/components/analytics/NextGenStudentAnalytics";

type ExamType = 'JEE' | 'NEET' | 'CET';
type Subject = 'physics' | 'chemistry' | 'mathematics' | 'biology';
type ViewMode = 'menu' | 'subjects' | 'chapters' | 'mocks' | 'analytics';

interface ExamDashboardProps {
  examType: ExamType;
  studentId: string;
  onBack: () => void;
}

const getExamGradient = (examType: ExamType) => {
  switch (examType) {
    case 'JEE': return 'from-blue-500 to-indigo-600';
    case 'NEET': return 'from-green-500 to-emerald-600';
    case 'CET': return 'from-purple-500 to-pink-600';
  }
};

export const ExamDashboard = ({ examType, studentId, onBack }: ExamDashboardProps) => {
  const [viewMode, setViewMode] = useState<ViewMode>('menu');
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);

  const gradient = getExamGradient(examType);

  const menuItems = [
    {
      id: 'subjects',
      title: 'Chapter Tests',
      description: 'Subject-wise chapter tests',
      icon: BookOpen,
    },
    {
      id: 'mocks',
      title: 'Mock Tests',
      description: 'Full syllabus mock tests',
      icon: FileText,
    },
    {
      id: 'analytics',
      title: 'Analytics',
      description: 'Your performance insights',
      icon: TrendingUp,
    },
  ];

  const handleSubjectSelect = (subject: Subject) => {
    setSelectedSubject(subject);
    setViewMode('chapters');
  };

  const handleBackFromChapters = () => {
    setSelectedSubject(null);
    setViewMode('subjects');
  };

  return (
    <AnimatePresence mode="wait">
      {viewMode === 'menu' && (
        <motion.div
          key="menu"
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
              <h2 className="text-xl font-bold">{examType} Dashboard</h2>
              <p className="text-sm text-muted-foreground">Choose an option</p>
            </div>
          </div>

          <div className="space-y-3">
            {menuItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card
                    className="cursor-pointer hover:shadow-md active:scale-[0.98] transition-all"
                    onClick={() => setViewMode(item.id as ViewMode)}
                  >
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className={`p-3 rounded-xl bg-gradient-to-br ${gradient} shrink-0`}>
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold">{item.title}</h3>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      {viewMode === 'subjects' && (
        <motion.div
          key="subjects"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
        >
          <SubjectSelector
            examType={examType}
            selectedSubject={selectedSubject}
            onSelect={handleSubjectSelect}
            onBack={() => setViewMode('menu')}
          />
        </motion.div>
      )}

      {viewMode === 'chapters' && selectedSubject && (
        <motion.div
          key="chapters"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
        >
          <ChapterTestsList
            examType={examType}
            subject={selectedSubject}
            studentId={studentId}
            onBack={handleBackFromChapters}
          />
        </motion.div>
      )}

      {viewMode === 'mocks' && (
        <motion.div
          key="mocks"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
        >
          <MockTestsList
            examType={examType}
            studentId={studentId}
            onBack={() => setViewMode('menu')}
          />
        </motion.div>
      )}

      {viewMode === 'analytics' && (
        <motion.div
          key="analytics"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="space-y-4"
        >
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setViewMode('menu')} className="shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h2 className="text-xl font-bold">Analytics</h2>
              <p className="text-sm text-muted-foreground">{examType} Performance</p>
            </div>
          </div>
          <NextGenStudentAnalytics examType={examType} />
        </motion.div>
      )}
    </AnimatePresence>
  );
};