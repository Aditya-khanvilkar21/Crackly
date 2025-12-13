import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Atom, FlaskConical, Calculator, Leaf, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

type ExamType = 'JEE' | 'NEET' | 'CET';
type Subject = 'physics' | 'chemistry' | 'mathematics' | 'biology';

interface SubjectSelectorProps {
  examType: ExamType;
  selectedSubject: Subject | null;
  onSelect: (subject: Subject) => void;
  onBack: () => void;
}

const getSubjectsForExam = (examType: ExamType): Subject[] => {
  switch (examType) {
    case 'JEE':
    case 'CET':
      return ['physics', 'chemistry', 'mathematics'];
    case 'NEET':
      return ['physics', 'chemistry', 'biology'];
  }
};

const subjectDetails = {
  physics: {
    title: "Physics",
    icon: Atom,
    gradient: "from-orange-500 to-red-500",
    bgGradient: "from-orange-500/10 to-red-500/10",
  },
  chemistry: {
    title: "Chemistry",
    icon: FlaskConical,
    gradient: "from-cyan-500 to-blue-500",
    bgGradient: "from-cyan-500/10 to-blue-500/10",
  },
  mathematics: {
    title: "Mathematics",
    icon: Calculator,
    gradient: "from-purple-500 to-pink-500",
    bgGradient: "from-purple-500/10 to-pink-500/10",
  },
  biology: {
    title: "Biology",
    icon: Leaf,
    gradient: "from-green-500 to-emerald-500",
    bgGradient: "from-green-500/10 to-emerald-500/10",
  },
};

export const SubjectSelector = ({ examType, selectedSubject, onSelect, onBack }: SubjectSelectorProps) => {
  const subjects = getSubjectsForExam(examType);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-xl font-bold">{examType}</h2>
          <p className="text-sm text-muted-foreground">Select a subject</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {subjects.map((subject, index) => {
          const details = subjectDetails[subject];
          const Icon = details.icon;
          const isSelected = selectedSubject === subject;

          return (
            <motion.div
              key={subject}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card
                className={`cursor-pointer transition-all duration-300 active:scale-[0.98] ${
                  isSelected 
                    ? 'ring-2 ring-primary shadow-lg' 
                    : 'hover:shadow-md'
                } bg-gradient-to-r ${details.bgGradient}`}
                onClick={() => onSelect(subject)}
              >
                <CardContent className="p-4 flex items-center gap-4">
                  <div className={`p-3 rounded-xl bg-gradient-to-br ${details.gradient} shrink-0`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold">{details.title}</h3>
                    <p className="text-sm text-muted-foreground truncate">
                      Chapters & Tests
                    </p>
                  </div>
                  {isSelected && (
                    <Badge className={`bg-gradient-to-r ${details.gradient} text-white border-0 shrink-0`}>
                      Selected
                    </Badge>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
