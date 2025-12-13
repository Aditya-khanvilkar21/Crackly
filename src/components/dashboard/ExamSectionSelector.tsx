import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Atom, Stethoscope, BookOpen, ChevronRight } from "lucide-react";

type ExamType = 'JEE' | 'NEET' | 'CET';

interface ExamSectionSelectorProps {
  selectedExam: ExamType | null;
  onSelect: (exam: ExamType) => void;
}

const examDetails = {
  JEE: {
    title: "JEE",
    subtitle: "Joint Entrance Examination",
    icon: Atom,
    gradient: "from-blue-500 to-indigo-600",
    bgGradient: "from-blue-500/10 to-indigo-500/10",
    subjects: ["Physics", "Chemistry", "Maths"],
  },
  NEET: {
    title: "NEET",
    subtitle: "National Eligibility cum Entrance Test",
    icon: Stethoscope,
    gradient: "from-green-500 to-emerald-600",
    bgGradient: "from-green-500/10 to-emerald-500/10",
    subjects: ["Physics", "Chemistry", "Biology"],
  },
  CET: {
    title: "CET",
    subtitle: "Common Entrance Test",
    icon: BookOpen,
    gradient: "from-purple-500 to-pink-600",
    bgGradient: "from-purple-500/10 to-pink-500/10",
    subjects: ["Physics", "Chemistry", "Maths"],
  },
};

export const ExamSectionSelector = ({ selectedExam, onSelect }: ExamSectionSelectorProps) => {
  return (
    <div className="space-y-3">
      {(Object.keys(examDetails) as ExamType[]).map((exam, index) => {
        const details = examDetails[exam];
        const Icon = details.icon;
        const isSelected = selectedExam === exam;

        return (
          <motion.div
            key={exam}
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
              onClick={() => onSelect(exam)}
            >
              <CardContent className="p-4 flex items-center gap-4">
                <div className={`p-3 rounded-xl bg-gradient-to-br ${details.gradient} shrink-0`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold">{details.title}</h3>
                  <p className="text-xs text-muted-foreground truncate">{details.subtitle}</p>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {details.subjects.map((subject) => (
                      <Badge key={subject} variant="secondary" className="text-[10px] px-1.5 py-0">
                        {subject}
                      </Badge>
                    ))}
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
};
