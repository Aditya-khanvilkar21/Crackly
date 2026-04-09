import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  AlertTriangle, TrendingUp, TrendingDown, Target, Brain, 
  Clock, Zap, ArrowUpRight, ArrowDownRight, Minus
} from "lucide-react";

interface SubjectInsight {
  subject: string;
  accuracy: number;
  attemptRate: number;
  correct: number;
  wrong: number;
  attempted: number;
  total: number;
}

interface TestSnapshot {
  testTitle: string;
  completedAt: string;
  subjects: SubjectInsight[];
}

interface MockTestInsightsProps {
  snapshots: TestSnapshot[];
}

export const MockTestInsights = ({ snapshots }: MockTestInsightsProps) => {
  if (snapshots.length === 0) return null;

  const latest = snapshots[snapshots.length - 1];
  const previous = snapshots.length > 1 ? snapshots[snapshots.length - 2] : null;
  const last3 = snapshots.slice(-3);

  // Find weakest subject
  const weakest = [...latest.subjects].sort((a, b) => a.accuracy - b.accuracy)[0];
  const strongest = [...latest.subjects].sort((a, b) => b.accuracy - a.accuracy)[0];

  const insights: { icon: React.ReactNode; text: string; type: 'warning' | 'success' | 'info' | 'danger' }[] = [];

  // 1. Subject Priority
  if (weakest && weakest.accuracy < 70) {
    insights.push({
      icon: <Target className="w-4 h-4" />,
      text: `Focus more on ${weakest.subject}. It's your weakest area with ${weakest.accuracy.toFixed(0)}% accuracy.`,
      type: 'danger'
    });
  }

  latest.subjects.forEach(sub => {
    // 2. Accuracy vs Attempt insight
    if (sub.attemptRate > 80 && sub.accuracy < 50) {
      insights.push({
        icon: <AlertTriangle className="w-4 h-4" />,
        text: `You are guessing too much in ${sub.subject}. High attempt rate (${sub.attemptRate.toFixed(0)}%) but low accuracy (${sub.accuracy.toFixed(0)}%).`,
        type: 'warning'
      });
    } else if (sub.attemptRate < 60 && sub.accuracy > 70) {
      insights.push({
        icon: <Zap className="w-4 h-4" />,
        text: `You are under-attempting in ${sub.subject}. Your accuracy is ${sub.accuracy.toFixed(0)}% — try attempting more questions!`,
        type: 'info'
      });
    }

    // 3. Improvement / Decline vs previous test
    if (previous) {
      const prevSub = previous.subjects.find(s => s.subject === sub.subject);
      if (prevSub) {
        const diff = sub.correct - prevSub.correct;
        if (diff > 0) {
          insights.push({
            icon: <ArrowUpRight className="w-4 h-4" />,
            text: `${sub.subject} improved by +${diff} marks compared to your previous test.`,
            type: 'success'
          });
        } else if (diff < 0) {
          insights.push({
            icon: <ArrowDownRight className="w-4 h-4" />,
            text: `${sub.subject} dropped by ${diff} marks compared to your previous test.`,
            type: 'danger'
          });
        }
      }
    }

    // 4. Consistency Score (last 3 tests)
    if (last3.length >= 3) {
      const scores = last3.map(s => {
        const match = s.subjects.find(x => x.subject === sub.subject);
        return match ? match.accuracy : 0;
      });
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      const variance = scores.reduce((sum, s) => sum + Math.pow(s - avg, 2), 0) / scores.length;
      const stdDev = Math.sqrt(variance);

      if (stdDev > 15) {
        insights.push({
          icon: <Brain className="w-4 h-4" />,
          text: `Your performance in ${sub.subject} is inconsistent. Focus on building steady fundamentals.`,
          type: 'warning'
        });
      } else if (stdDev <= 8 && avg > 60) {
        insights.push({
          icon: <Brain className="w-4 h-4" />,
          text: `Your performance in ${sub.subject} is consistent. Keep up the good work!`,
          type: 'success'
        });
      }
    }

    // 5. Next Action
    if (sub.accuracy < 50) {
      insights.push({
        icon: <Clock className="w-4 h-4" />,
        text: `Revise core concepts of ${sub.subject}. Your accuracy (${sub.accuracy.toFixed(0)}%) needs significant improvement.`,
        type: 'danger'
      });
    } else if (sub.attemptRate < 50) {
      insights.push({
        icon: <Zap className="w-4 h-4" />,
        text: `Attempt more questions in ${sub.subject}. You're leaving too many unanswered.`,
        type: 'info'
      });
    }
  });

  // Deduplicate insights by text
  const uniqueInsights = insights.filter((v, i, a) => a.findIndex(t => t.text === v.text) === i);

  const typeStyles = {
    success: 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200',
    warning: 'bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200',
    info: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200',
    danger: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200',
  };

  return (
    <Card className="shadow-md hover:shadow-lg transition-shadow">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          Smart Insights
        </CardTitle>
        <p className="text-sm text-muted-foreground">AI-powered analysis of your mock test performance</p>
      </CardHeader>
      <CardContent>
        {/* Subject Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
          {latest.subjects.map(sub => (
            <div key={sub.subject} className={`p-4 rounded-lg border ${
              sub.accuracy >= 70 ? 'border-green-300 bg-green-50/50 dark:bg-green-950/20' :
              sub.accuracy >= 50 ? 'border-yellow-300 bg-yellow-50/50 dark:bg-yellow-950/20' :
              'border-red-300 bg-red-50/50 dark:bg-red-950/20'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-sm">{sub.subject}</span>
                <Badge variant="outline" className={
                  sub.accuracy >= 70 ? 'border-green-500 text-green-700' :
                  sub.accuracy >= 50 ? 'border-yellow-500 text-yellow-700' :
                  'border-red-500 text-red-700'
                }>
                  {sub.accuracy >= 70 ? 'Strong' : sub.accuracy >= 50 ? 'Moderate' : 'Weak'}
                </Badge>
              </div>
              <div className="text-xs space-y-1 text-muted-foreground">
                <div className="flex justify-between">
                  <span>Accuracy:</span>
                  <span className="font-medium">{sub.accuracy.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Attempted:</span>
                  <span className="font-medium">{sub.attempted}/{sub.total}</span>
                </div>
                <div className="flex justify-between">
                  <span>Correct:</span>
                  <span className="font-medium text-green-600">{sub.correct}</span>
                </div>
                <div className="flex justify-between">
                  <span>Wrong:</span>
                  <span className="font-medium text-red-600">{sub.wrong}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Insight Cards */}
        <div className="space-y-3">
          {uniqueInsights.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Complete more mock tests to get personalized insights!
            </p>
          ) : (
            uniqueInsights.map((insight, idx) => (
              <div key={idx} className={`flex items-start gap-3 p-3 rounded-lg border ${typeStyles[insight.type]}`}>
                <span className="mt-0.5 flex-shrink-0">{insight.icon}</span>
                <p className="text-sm">{insight.text}</p>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};
