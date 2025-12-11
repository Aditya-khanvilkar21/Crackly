import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { GraduationCap, Atom, Stethoscope, BookOpen } from "lucide-react";

type ExamType = 'JEE' | 'NEET' | 'CET';

interface ExamSectionSelectorProps {
  selectedExam: ExamType | null;
  onSelect: (exam: ExamType) => void;
}

const examDetails = {
  JEE: {
    title: "JEE",
    subtitle: "Joint Entrance Examination",
    description: "Physics, Chemistry, Mathematics",
    icon: Atom,
    gradient: "from-blue-500 to-indigo-600",
    bgGradient: "from-blue-500/10 to-indigo-500/10",
    borderColor: "border-blue-500",
    subjects: ["Physics", "Chemistry", "Mathematics"],
  },
  NEET: {
    title: "NEET",
    subtitle: "National Eligibility cum Entrance Test",
    description: "Physics, Chemistry, Biology",
    icon: Stethoscope,
    gradient: "from-green-500 to-emerald-600",
    bgGradient: "from-green-500/10 to-emerald-500/10",
    borderColor: "border-green-500",
    subjects: ["Physics", "Chemistry", "Biology"],
  },
  CET: {
    title: "CET",
    subtitle: "Common Entrance Test",
    description: "State Level Engineering Entrance",
    icon: BookOpen,
    gradient: "from-purple-500 to-pink-600",
    bgGradient: "from-purple-500/10 to-pink-500/10",
    borderColor: "border-purple-500",
    subjects: ["Physics", "Chemistry", "Mathematics"],
  },
};

export const ExamSectionSelector = ({ selectedExam, onSelect }: ExamSectionSelectorProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {(Object.keys(examDetails) as ExamType[]).map((exam, index) => {
        const details = examDetails[exam];
        const Icon = details.icon;
        const isSelected = selectedExam === exam;

        return (
          <motion.div
            key={exam}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card
              className={`cursor-pointer transition-all duration-300 hover:shadow-xl ${
                isSelected 
                  ? `ring-2 ring-offset-2 ring-offset-background ${details.borderColor} shadow-lg` 
                  : 'hover:scale-[1.02]'
              } bg-gradient-to-br ${details.bgGradient}`}
              onClick={() => onSelect(exam)}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 rounded-xl bg-gradient-to-br ${details.gradient}`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  {isSelected && (
                    <Badge className={`bg-gradient-to-r ${details.gradient} text-white border-0`}>
                      Selected
                    </Badge>
                  )}
                </div>
                <h3 className="text-2xl font-bold mb-1">{details.title}</h3>
                <p className="text-sm text-muted-foreground mb-3">{details.subtitle}</p>
                <div className="flex flex-wrap gap-1.5">
                  {details.subjects.map((subject) => (
                    <Badge key={subject} variant="secondary" className="text-xs">
                      {subject}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
};
