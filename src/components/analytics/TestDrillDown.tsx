import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, CheckCircle2, XCircle, Clock } from "lucide-react";

interface TestDrillDownProps {
  testId: string;
  analytics: any;
  onBack: () => void;
}

export const TestDrillDown = ({ testId, analytics, onBack }: TestDrillDownProps) => {
  const test = analytics.testDetails.get(testId);
  const result = analytics.results.find((r: any) => r.test_id === testId);

  if (!test || !result) {
    return (
      <div className="text-center py-8">
        <p>Test not found</p>
        <Button onClick={onBack} className="mt-4">Go Back</Button>
      </div>
    );
  }

  const percentage = ((result.score / result.total_questions) * 100).toFixed(1);
  let correct = 0, wrong = 0, skipped = 0;
  
  test.questions.forEach((q: any, idx: number) => {
    if (result.answers[idx] !== undefined) {
      if (result.answers[idx] === q.correctAnswer) correct++;
      else wrong++;
    } else {
      skipped++;
    }
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-lg font-bold">{test.title}</h2>
          <div className="flex gap-2">
            <Badge variant="outline">{test.subject || test.exam_type}</Badge>
            <Badge>{test.test_type === 'mock_test' ? 'Mock' : 'Chapter'}</Badge>
          </div>
        </div>
      </div>

      <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
        <CardContent className="p-6 text-center">
          <p className="text-4xl font-bold">{percentage}%</p>
          <p className="text-sm text-muted-foreground">{result.score}/{result.total_questions} correct</p>
          <Progress value={Number(percentage)} className="h-2 mt-3" />
        </CardContent>
      </Card>

      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-green-50 dark:bg-green-950/20">
          <CardContent className="p-4 text-center">
            <CheckCircle2 className="h-6 w-6 text-green-600 mx-auto mb-1" />
            <p className="text-xl font-bold text-green-600">{correct}</p>
            <p className="text-xs text-muted-foreground">Correct</p>
          </CardContent>
        </Card>
        <Card className="bg-red-50 dark:bg-red-950/20">
          <CardContent className="p-4 text-center">
            <XCircle className="h-6 w-6 text-red-600 mx-auto mb-1" />
            <p className="text-xl font-bold text-red-600">{wrong}</p>
            <p className="text-xs text-muted-foreground">Wrong</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="h-6 w-6 text-muted-foreground mx-auto mb-1" />
            <p className="text-xl font-bold">
              {result.time_taken_seconds ? Math.floor(result.time_taken_seconds / 60) : '-'}m
            </p>
            <p className="text-xs text-muted-foreground">Time</p>
          </CardContent>
        </Card>
      </div>

      <Button onClick={onBack} className="w-full">Back to Analytics</Button>
    </div>
  );
};
