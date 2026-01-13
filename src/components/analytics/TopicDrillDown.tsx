import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, CheckCircle2, XCircle, Clock } from "lucide-react";

interface TopicDrillDownProps {
  topic: string;
  analytics: any;
  onBack: () => void;
}

export const TopicDrillDown = ({ topic, analytics, onBack }: TopicDrillDownProps) => {
  const topicData = analytics.topicMastery.find((t: any) => t.topic === topic);
  
  if (!topicData) {
    return (
      <div className="text-center py-8">
        <p>Topic not found</p>
        <Button onClick={onBack} className="mt-4">Go Back</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-lg font-bold">{topic}</h2>
          <Badge variant="outline">{topicData.subject}</Badge>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Topic Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Mastery Score</span>
                <span className="font-bold">{topicData.masteryScore}%</span>
              </div>
              <Progress value={topicData.masteryScore} className="h-3" />
            </div>
            
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/20">
                <CheckCircle2 className="h-5 w-5 text-green-600 mx-auto mb-1" />
                <p className="text-lg font-bold text-green-600">{topicData.correct}</p>
                <p className="text-xs text-muted-foreground">Correct</p>
              </div>
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20">
                <XCircle className="h-5 w-5 text-red-600 mx-auto mb-1" />
                <p className="text-lg font-bold text-red-600">{topicData.wrong}</p>
                <p className="text-xs text-muted-foreground">Wrong</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <Clock className="h-5 w-5 text-muted-foreground mx-auto mb-1" />
                <p className="text-lg font-bold">{Math.round(topicData.avgTimePerQuestion)}s</p>
                <p className="text-xs text-muted-foreground">Avg Time</p>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-950/20">
              <p className="text-sm font-medium">Recent Mistakes: {topicData.recentMistakes}</p>
              <p className="text-xs text-muted-foreground">In the last 7 days</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button onClick={onBack} className="w-full">Back to Analytics</Button>
    </div>
  );
};
