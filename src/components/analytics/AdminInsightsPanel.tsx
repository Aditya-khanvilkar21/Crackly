import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Lightbulb, TrendingUp, TrendingDown, AlertTriangle,
  Target, Zap, Brain, BarChart3
} from "lucide-react";

interface StudentPerf {
  student_name: string;
  avg_score: number;
  physics_avg?: number;
  chemistry_avg?: number;
  mathematics_avg?: number;
  trend?: 'improving' | 'declining' | 'stable';
  mock_tests_taken?: number;
  weakest_subject?: string;
}

interface TestOverview {
  test_title: string;
  avg_score: number;
  physics_avg: number;
  chemistry_avg: number;
  mathematics_avg: number;
  students_attempted: number;
}

interface AdminInsightsPanelProps {
  studentPerformances: StudentPerf[];
  testOverviews?: TestOverview[];
  avgClassScore: number;
}

interface Insight {
  icon: React.ReactNode;
  text: string;
  type: 'danger' | 'warning' | 'success' | 'info';
  priority: number;
}

export const AdminInsightsPanel = ({ studentPerformances, testOverviews, avgClassScore }: AdminInsightsPanelProps) => {
  const insights = useMemo(() => {
    const list: Insight[] = [];
    if (studentPerformances.length === 0) return list;

    // 1. Subject weakness detection
    const subjects = ['physics', 'chemistry', 'mathematics'] as const;
    const subjectLabels: Record<string, string> = { physics: 'Physics', chemistry: 'Chemistry', mathematics: 'Mathematics' };
    
    subjects.forEach(subj => {
      const key = `${subj}_avg` as keyof StudentPerf;
      const vals = studentPerformances.filter(s => (s as any)[key] !== undefined).map(s => (s as any)[key] as number);
      if (vals.length === 0) return;
      const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
      
      if (avg < 40) {
        list.push({
          icon: <AlertTriangle className="w-4 h-4" />,
          text: `Class struggling in ${subjectLabels[subj]} — average only ${avg.toFixed(0)}%. Schedule revision sessions.`,
          type: 'danger',
          priority: 1,
        });
      } else if (avg < 55) {
        list.push({
          icon: <Target className="w-4 h-4" />,
          text: `${subjectLabels[subj]} needs attention — class average is ${avg.toFixed(0)}%. Consider extra practice.`,
          type: 'warning',
          priority: 2,
        });
      } else if (avg >= 75) {
        list.push({
          icon: <TrendingUp className="w-4 h-4" />,
          text: `${subjectLabels[subj]} performing well — class average ${avg.toFixed(0)}%. Maintain momentum!`,
          type: 'success',
          priority: 5,
        });
      }
    });

    // 2. Trend detection
    const improving = studentPerformances.filter(s => s.trend === 'improving').length;
    const declining = studentPerformances.filter(s => s.trend === 'declining').length;
    const total = studentPerformances.length;

    if (improving > total * 0.5) {
      list.push({
        icon: <TrendingUp className="w-4 h-4" />,
        text: `${improving} out of ${total} students are improving — great teaching impact!`,
        type: 'success',
        priority: 3,
      });
    }

    if (declining > total * 0.3) {
      list.push({
        icon: <TrendingDown className="w-4 h-4" />,
        text: `${declining} students showing declining performance. Consider one-on-one attention.`,
        type: 'danger',
        priority: 1,
      });
    }

    // 3. Common weak subject
    const weakSubjectCounts: Record<string, number> = {};
    studentPerformances.forEach(s => {
      if (s.weakest_subject) {
        weakSubjectCounts[s.weakest_subject] = (weakSubjectCounts[s.weakest_subject] || 0) + 1;
      }
    });
    const sortedWeak = Object.entries(weakSubjectCounts).sort((a, b) => b[1] - a[1]);
    if (sortedWeak.length > 0 && sortedWeak[0][1] >= Math.ceil(total * 0.4)) {
      list.push({
        icon: <Brain className="w-4 h-4" />,
        text: `Most students (${sortedWeak[0][1]}/${total}) are weakest in ${sortedWeak[0][0]}. Prioritize revision.`,
        type: 'warning',
        priority: 1,
      });
    }

    // 4. Low performers alert
    const weakStudents = studentPerformances.filter(s => s.avg_score < 40);
    if (weakStudents.length > 0) {
      list.push({
        icon: <AlertTriangle className="w-4 h-4" />,
        text: `${weakStudents.length} student${weakStudents.length > 1 ? 's' : ''} scoring below 40%. They need immediate support.`,
        type: 'danger',
        priority: 1,
      });
    }

    // 5. Top performer recognition
    const topStudents = studentPerformances.filter(s => s.avg_score >= 85);
    if (topStudents.length > 0) {
      list.push({
        icon: <Zap className="w-4 h-4" />,
        text: `${topStudents.length} student${topStudents.length > 1 ? 's' : ''} scoring above 85%. Consider giving them advanced challenges.`,
        type: 'info',
        priority: 4,
      });
    }

    // 6. Test-level insights
    if (testOverviews && testOverviews.length >= 2) {
      const latest = testOverviews[testOverviews.length - 1];
      const previous = testOverviews[testOverviews.length - 2];
      const diff = latest.avg_score - previous.avg_score;
      if (diff > 5) {
        list.push({
          icon: <TrendingUp className="w-4 h-4" />,
          text: `Class performance improved by +${diff.toFixed(1)}% from "${previous.test_title}" to "${latest.test_title}".`,
          type: 'success',
          priority: 2,
        });
      } else if (diff < -5) {
        list.push({
          icon: <TrendingDown className="w-4 h-4" />,
          text: `Class performance dropped by ${diff.toFixed(1)}% in "${latest.test_title}". Review difficulty level.`,
          type: 'warning',
          priority: 2,
        });
      }
    }

    // 7. Overall class health
    if (avgClassScore >= 70) {
      list.push({
        icon: <BarChart3 className="w-4 h-4" />,
        text: `Class average is ${avgClassScore.toFixed(0)}% — excellent! Keep up the current teaching approach.`,
        type: 'success',
        priority: 6,
      });
    }

    return list.sort((a, b) => a.priority - b.priority);
  }, [studentPerformances, testOverviews, avgClassScore]);

  const typeStyles: Record<string, string> = {
    success: 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200',
    warning: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200',
    info: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200',
    danger: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200',
  };

  if (insights.length === 0) return null;

  return (
    <Card className="shadow-md border-primary/10 hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <Lightbulb className="h-5 w-5 text-primary" />
          </div>
          <div>
            <span className="text-base">Smart Insights</span>
            <p className="text-xs text-muted-foreground font-normal mt-0.5">
              AI-powered class analysis • {insights.length} insight{insights.length !== 1 ? 's' : ''}
            </p>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {insights.slice(0, 8).map((insight, idx) => (
          <div key={idx} className={`flex items-start gap-3 p-3 rounded-xl border transition-all hover:scale-[1.01] ${typeStyles[insight.type]}`}>
            <span className="mt-0.5 flex-shrink-0">{insight.icon}</span>
            <p className="text-sm leading-relaxed">{insight.text}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
