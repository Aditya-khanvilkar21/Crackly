import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Brain,
  Flame,
  Target,
  HelpCircle,
  CalendarClock,
  BookOpen,
  Zap,
} from "lucide-react";
import {
  RevisionReminder,
  generateRevisionReminders,
  getRevisionSummary,
  formatDueDate,
} from "@/lib/spacedRepetition";
import { TopicMastery } from "@/lib/analyticsCalculations";

interface SpacedRepetitionRemindersProps {
  topicMastery: TopicMastery[];
  onTopicClick?: (topic: string) => void;
  compact?: boolean;
}

export const SpacedRepetitionReminders = ({
  topicMastery,
  onTopicClick,
  compact = false,
}: SpacedRepetitionRemindersProps) => {
  const [showAll, setShowAll] = useState(false);

  // Convert TopicMastery to the format expected by generateRevisionReminders
  const formattedMastery = topicMastery.map(tm => ({
    topic: tm.topic,
    subject: tm.subject,
    masteryScore: tm.masteryScore,
    wrong: tm.wrong,
    lastAttempted: tm.lastAttempted,
    recentMistakes: tm.recentMistakes,
  }));

  const reminders = generateRevisionReminders(formattedMastery);
  const summary = getRevisionSummary(reminders);

  const getUrgencyColor = (urgency: RevisionReminder['urgency']) => {
    switch (urgency) {
      case 'overdue':
        return 'text-destructive bg-destructive/10 border-destructive/30';
      case 'today':
        return 'text-orange-600 bg-orange-500/10 border-orange-500/30';
      case 'upcoming':
        return 'text-yellow-600 bg-yellow-500/10 border-yellow-500/30';
      case 'scheduled':
        return 'text-muted-foreground bg-muted/50 border-border';
    }
  };

  const getUrgencyIcon = (urgency: RevisionReminder['urgency']) => {
    switch (urgency) {
      case 'overdue':
        return <AlertTriangle className="h-4 w-4" />;
      case 'today':
        return <Flame className="h-4 w-4" />;
      case 'upcoming':
        return <Clock className="h-4 w-4" />;
      case 'scheduled':
        return <Calendar className="h-4 w-4" />;
    }
  };

  const getUrgencyBadge = (urgency: RevisionReminder['urgency']) => {
    switch (urgency) {
      case 'overdue':
        return 'destructive';
      case 'today':
        return 'default';
      case 'upcoming':
        return 'secondary';
      case 'scheduled':
        return 'outline';
    }
  };

  if (reminders.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="pt-6">
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-green-500" />
            <p className="font-medium text-foreground mb-1">All caught up!</p>
            <p className="text-sm">No revisions due. Keep practicing to maintain your skills.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <TooltipProvider>
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Smart Revision</CardTitle>
              </div>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-[250px]">
                  <p className="text-xs">
                    Based on spaced repetition science. Topics are scheduled for review at optimal intervals to maximize retention.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
          </CardHeader>
          <CardContent>
            {/* Summary badges */}
            <div className="flex flex-wrap gap-2 mb-4">
              {summary.overdue > 0 && (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {summary.overdue} overdue
                </Badge>
              )}
              {summary.dueToday > 0 && (
                <Badge variant="default" className="gap-1">
                  <Flame className="h-3 w-3" />
                  {summary.dueToday} today
                </Badge>
              )}
              {summary.upcoming > 0 && (
                <Badge variant="secondary" className="gap-1">
                  <Clock className="h-3 w-3" />
                  {summary.upcoming} upcoming
                </Badge>
              )}
            </div>

            {/* Next session topics */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Priority Topics for Today:
              </p>
              {summary.nextSessionTopics.slice(0, 3).map((reminder, idx) => (
                <motion.div
                  key={reminder.topic}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer hover:bg-accent/50 transition-colors ${getUrgencyColor(reminder.urgency)}`}
                  onClick={() => onTopicClick?.(reminder.topic)}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {getUrgencyIcon(reminder.urgency)}
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{reminder.topic}</p>
                      <p className="text-xs opacity-70">{reminder.subject}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={getUrgencyBadge(reminder.urgency)} className="text-xs">
                      {formatDueDate(reminder)}
                    </Badge>
                    <ChevronRight className="h-4 w-4 opacity-50" />
                  </div>
                </motion.div>
              ))}
            </div>

            {reminders.length > 3 && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-3"
                onClick={() => setShowAll(true)}
              >
                View all {reminders.length} topics
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </CardContent>
        </Card>
      </TooltipProvider>
    );
  }

  // Full view
  const displayReminders = showAll ? reminders : reminders.slice(0, 8);

  return (
    <TooltipProvider>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CalendarClock className="h-5 w-5 text-primary" />
                Smart Revision Schedule
              </CardTitle>
              <CardDescription>
                Spaced repetition reminders for optimal long-term retention
              </CardDescription>
            </div>
            <Tooltip>
              <TooltipTrigger>
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-[300px]">
                <p className="text-xs">
                  This uses the SM-2 spaced repetition algorithm. Topics are scheduled for review at scientifically optimal intervals - just before you're likely to forget them. This maximizes retention while minimizing study time.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
        </CardHeader>
        <CardContent>
          {/* Summary stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <div className={`p-3 rounded-lg border ${summary.overdue > 0 ? 'bg-destructive/10 border-destructive/30' : 'bg-muted/30'}`}>
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className={`h-4 w-4 ${summary.overdue > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
                <span className="text-xs text-muted-foreground">Overdue</span>
              </div>
              <p className={`text-2xl font-bold ${summary.overdue > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                {summary.overdue}
              </p>
            </div>
            <div className={`p-3 rounded-lg border ${summary.dueToday > 0 ? 'bg-orange-500/10 border-orange-500/30' : 'bg-muted/30'}`}>
              <div className="flex items-center gap-2 mb-1">
                <Flame className={`h-4 w-4 ${summary.dueToday > 0 ? 'text-orange-500' : 'text-muted-foreground'}`} />
                <span className="text-xs text-muted-foreground">Due Today</span>
              </div>
              <p className={`text-2xl font-bold ${summary.dueToday > 0 ? 'text-orange-600' : 'text-muted-foreground'}`}>
                {summary.dueToday}
              </p>
            </div>
            <div className="p-3 rounded-lg border bg-muted/30">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">This Week</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{summary.upcoming}</p>
            </div>
            <div className="p-3 rounded-lg border bg-muted/30">
              <div className="flex items-center gap-2 mb-1">
                <Target className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Avg Mastery</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{summary.avgMastery}%</p>
            </div>
          </div>

          {/* Next study session */}
          {summary.nextSessionTopics.length > 0 && (
            <div className="mb-6 p-4 rounded-xl bg-primary/5 border border-primary/20">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-sm">Recommended Study Session</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {summary.nextSessionTopics.map((r, idx) => (
                  <Badge
                    key={r.topic}
                    variant={getUrgencyBadge(r.urgency)}
                    className="cursor-pointer hover:opacity-80"
                    onClick={() => onTopicClick?.(r.topic)}
                  >
                    {idx + 1}. {r.topic}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                ~{summary.nextSessionTopics.reduce((sum, r) => {
                  const mins = parseInt(r.practiceRecommendation.match(/~(\d+) min/)?.[1] || '15');
                  return sum + mins;
                }, 0)} minutes total
              </p>
            </div>
          )}

          {/* Reminders list */}
          <ScrollArea className={showAll ? "h-[400px]" : ""}>
            <div className="space-y-2">
              <AnimatePresence>
                {displayReminders.map((reminder, idx) => (
                  <motion.div
                    key={reminder.topic}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ delay: idx * 0.05 }}
                    className={`p-3 rounded-lg border cursor-pointer hover:shadow-md transition-all ${getUrgencyColor(reminder.urgency)}`}
                    onClick={() => onTopicClick?.(reminder.topic)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="mt-0.5">
                          {getUrgencyIcon(reminder.urgency)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-sm">{reminder.topic}</p>
                            <Badge variant="outline" className="text-xs px-1.5 py-0">
                              {reminder.subject}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 mt-1.5">
                            <div className="flex items-center gap-1.5">
                              <Target className="h-3 w-3 opacity-50" />
                              <span className="text-xs">
                                {reminder.masteryScore}% mastery
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Brain className="h-3 w-3 opacity-50" />
                              <span className="text-xs">
                                Review #{reminder.repetitionNumber + 1}
                              </span>
                            </div>
                          </div>
                          <p className="text-xs opacity-70 mt-2">
                            <BookOpen className="h-3 w-3 inline mr-1" />
                            {reminder.practiceRecommendation}
                          </p>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <Badge variant={getUrgencyBadge(reminder.urgency)} className="mb-1">
                          {formatDueDate(reminder)}
                        </Badge>
                        <Progress
                          value={reminder.masteryScore}
                          className="h-1.5 w-16 mt-2"
                        />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </ScrollArea>

          {!showAll && reminders.length > 8 && (
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-4"
              onClick={() => setShowAll(true)}
            >
              Show all {reminders.length} topics
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}

          {showAll && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-4"
              onClick={() => setShowAll(false)}
            >
              Show less
            </Button>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};
