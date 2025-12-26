import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, BookOpen, FileText, ChevronRight } from "lucide-react";
import { AdminChapterAnalytics } from "@/components/analytics/AdminChapterAnalytics";
import { ExamMockAnalytics } from "@/components/analytics/ExamMockAnalytics";

type ExamType = 'JEE' | 'NEET' | 'CET';
type ViewMode = 'menu' | 'chapters' | 'mocks';

interface AdminExamDashboardProps {
  examType: ExamType;
  userRole: string;
  onBack: () => void;
}

const getExamGradient = (examType: ExamType) => {
  switch (examType) {
    case 'JEE': return 'from-blue-500 to-indigo-600';
    case 'NEET': return 'from-green-500 to-emerald-600';
    case 'CET': return 'from-purple-500 to-pink-600';
  }
};

export const AdminExamDashboard = ({ examType, userRole, onBack }: AdminExamDashboardProps) => {
  const [viewMode, setViewMode] = useState<ViewMode>('menu');

  const gradient = getExamGradient(examType);

  const menuItems = [
    {
      id: 'chapters',
      title: 'Chapter Analytics',
      description: 'Subject-wise chapter test analysis with student rankings',
      icon: BookOpen,
    },
    {
      id: 'mocks',
      title: 'Mock Test Analytics',
      description: 'Full mock test performance with subject breakdown',
      icon: FileText,
    },
  ];

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
              <h2 className="text-xl font-bold">{examType} Analytics</h2>
              <p className="text-sm text-muted-foreground">Choose analytics type</p>
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

      {viewMode === 'chapters' && (
        <motion.div
          key="chapters"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
        >
          <AdminChapterAnalytics
            examType={examType}
            userRole={userRole}
            onBack={() => setViewMode('menu')}
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
          <ExamMockAnalytics
            examType={examType}
            userRole={userRole}
            onBack={() => setViewMode('menu')}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};
