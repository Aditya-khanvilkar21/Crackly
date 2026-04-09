import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
  LineChart, Line, BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend,
  ResponsiveContainer, Cell, Area, AreaChart,
} from "recharts";
import {
  TrendingUp, TrendingDown, Target, Award, Clock, Brain, Zap, AlertTriangle, BookOpen,
  ChevronRight, Download, HelpCircle, Flame, BarChart3, PieChart, Activity, Lightbulb, Bell,
} from "lucide-react";
import { useStudentAnalytics } from "@/hooks/useStudentAnalytics";
import { motion, AnimatePresence } from "framer-motion";
import { TopicDrillDown } from "./TopicDrillDown";
import { TestDrillDown } from "./TestDrillDown";
import { SpacedRepetitionReminders } from "./SpacedRepetitionReminders";
import { MockTestAnalytics } from "./MockTestAnalytics";
import { jsPDF } from "jspdf";

type ExamType = 'JEE' | 'NEET' | 'CET';

interface NextGenStudentAnalyticsProps {
  examType?: ExamType;
}

export const NextGenStudentAnalytics = ({ examType }: NextGenStudentAnalyticsProps) => {
  const analytics = useStudentAnalytics(examType);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [selectedTest, setSelectedTest] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  if (analytics.loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (analytics.results.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="pt-6">
          <div className="text-center py-12 text-muted-foreground">
            <Brain className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-xl font-semibold mb-2">No Analytics Yet</p>
            <p className="text-sm">Complete some tests to unlock your personalized insights</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { performanceMetrics, studyRecommendations, batchComparison, speedAccuracyAnalysis } = analytics;
  const topRecommendation = studyRecommendations[0];

  // Get predicted score details based on exam type
  const getExamMaxScore = () => {
    switch (examType) {
      case 'JEE': return 300;
      case 'NEET': return 720;
      case 'CET': return 200;
      default: return 300;
    }
  };

  // Speed vs Accuracy scatter data
  const speedAccuracyData = analytics.subjectPerformance.map(s => ({
    name: s.subject,
    accuracy: s.accuracy,
    speed: s.avgSpeed,
    size: s.total,
  }));

  // Download analytics report as PDF
  const downloadReport = () => {
    const doc = new jsPDF();
    const examName = examType || 'Overall';
    
    doc.setFontSize(20);
    doc.text(`${examName} Performance Report`, 20, 20);
    doc.setFontSize(12);
    doc.text(`Generated on ${new Date().toLocaleDateString()}`, 20, 30);
    
    doc.setFontSize(14);
    doc.text('Key Metrics', 20, 50);
    doc.setFontSize(11);
    doc.text(`Predicted Score: ${performanceMetrics.predictedScore}/${getExamMaxScore()}`, 25, 60);
    doc.text(`Overall Accuracy: ${performanceMetrics.overallAccuracy}%`, 25, 68);
    doc.text(`Tests Completed: ${performanceMetrics.totalTestsTaken}`, 25, 76);
    doc.text(`Learning Velocity: ${performanceMetrics.learningVelocity > 0 ? '+' : ''}${performanceMetrics.learningVelocity}%/week`, 25, 84);
    
    if (batchComparison) {
      doc.text(`Batch Rank: ${batchComparison.rank}/${batchComparison.totalStudents}`, 25, 92);
    }

    doc.setFontSize(14);
    doc.text('Priority Focus Areas', 20, 110);
    doc.setFontSize(11);
    studyRecommendations.slice(0, 3).forEach((rec, idx) => {
      doc.text(`${idx + 1}. ${rec.topic} (${rec.subject}) - ${rec.reason}`, 25, 120 + idx * 8);
    });

    doc.save(`${examName.toLowerCase()}_performance_report.pdf`);
  };

  // Drill-down views
  if (selectedTopic) {
    return (
      <TopicDrillDown
        topic={selectedTopic}
        analytics={analytics}
        onBack={() => setSelectedTopic(null)}
      />
    );
  }

  if (selectedTest) {
    return (
      <TestDrillDown
        testId={selectedTest}
        analytics={analytics}
        onBack={() => setSelectedTest(null)}
      />
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* NEXT ACTION - Always visible at top */}
        {topRecommendation && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="border-2 border-primary bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-primary text-primary-foreground shrink-0">
                    <Lightbulb className="h-6 w-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="default" className="text-xs">NEXT ACTION</Badge>
                      <Badge variant={topRecommendation.priority === 'high' ? 'destructive' : 'secondary'} className="text-xs">
                        {topRecommendation.priority.toUpperCase()} PRIORITY
                      </Badge>
                    </div>
                    <p className="font-semibold text-sm mb-1">
                      Revise {topRecommendation.topic}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {topRecommendation.reason} Practice {topRecommendation.practiceQuestions} questions (~{topRecommendation.estimatedTime} min)
                    </p>
                  </div>
                  <Button 
                    size="sm" 
                    className="shrink-0"
                    onClick={() => setSelectedTopic(topRecommendation.topic)}
                  >
                    View Details
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Hero Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Predicted Score */}
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">Predicted Score</span>
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle className="h-3 w-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs max-w-[200px]">
                      Based on your recent test performance, weighted by recency and difficulty.
                      Confidence: {performanceMetrics.confidenceLevel}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold">{performanceMetrics.predictedScore}</span>
                <span className="text-sm text-muted-foreground">/ {getExamMaxScore()}</span>
              </div>
              <Badge variant="outline" className="mt-2 text-xs">
                ~{performanceMetrics.predictedPercentile}th percentile
              </Badge>
            </CardContent>
          </Card>

          {/* Batch Rank */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">Batch Rank</span>
                <Award className="h-4 w-4 text-yellow-500" />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold">
                  {batchComparison?.rank || '-'}
                </span>
                <span className="text-sm text-muted-foreground">
                  / {batchComparison?.totalStudents || '-'}
                </span>
              </div>
              {batchComparison && (
                <p className="text-xs text-muted-foreground mt-2">
                  Top {Math.round((batchComparison.rank / batchComparison.totalStudents) * 100)}% of class
                </p>
              )}
            </CardContent>
          </Card>

          {/* Accuracy */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">Accuracy</span>
                <Target className="h-4 w-4 text-green-500" />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold">{performanceMetrics.overallAccuracy}%</span>
              </div>
              <Progress value={performanceMetrics.overallAccuracy} className="h-1.5 mt-2" />
            </CardContent>
          </Card>

          {/* Learning Velocity */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">Weekly Progress</span>
                {performanceMetrics.learningVelocity >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )}
              </div>
              <div className="flex items-baseline gap-1">
                <span className={`text-2xl font-bold ${performanceMetrics.learningVelocity >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {performanceMetrics.learningVelocity > 0 ? '+' : ''}{performanceMetrics.learningVelocity}%
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                per week improvement
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabbed Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-6 mb-4">
            <TabsTrigger value="overview" className="text-xs">
              <BarChart3 className="h-3 w-3 mr-1" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="mock-insights" className="text-xs">
              <Brain className="h-3 w-3 mr-1" />
              Mock
            </TabsTrigger>
            <TabsTrigger value="revision" className="text-xs">
              <Bell className="h-3 w-3 mr-1" />
              Revision
            </TabsTrigger>
            <TabsTrigger value="topics" className="text-xs">
              <BookOpen className="h-3 w-3 mr-1" />
              Topics
            </TabsTrigger>
            <TabsTrigger value="analysis" className="text-xs">
              <Activity className="h-3 w-3 mr-1" />
              Analysis
            </TabsTrigger>
            <TabsTrigger value="actions" className="text-xs">
              <Flame className="h-3 w-3 mr-1" />
              Actions
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4 mt-0">
            {/* Performance Trend */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Performance Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={analytics.performanceTrend}>
                    <defs>
                      <linearGradient id="colorPercentage" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} domain={[0, 100]} />
                    <RechartsTooltip 
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--card))", 
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px"
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="percentage" 
                      stroke="hsl(var(--primary))" 
                      fillOpacity={1}
                      fill="url(#colorPercentage)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Subject-wise Radar + Bar */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Subject Mastery</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <RadarChart data={analytics.subjectPerformance}>
                      <PolarGrid stroke="hsl(var(--border))" />
                      <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 8 }} />
                      <Radar
                        name="Mastery"
                        dataKey="masteryScore"
                        stroke="hsl(var(--primary))"
                        fill="hsl(var(--primary))"
                        fillOpacity={0.5}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Subject Accuracy</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={analytics.subjectPerformance} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" domain={[0, 100]} fontSize={10} />
                      <YAxis dataKey="subject" type="category" fontSize={10} width={70} />
                      <RechartsTooltip 
                        contentStyle={{ 
                          backgroundColor: "hsl(var(--card))", 
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          fontSize: "12px"
                        }}
                      />
                      <Bar dataKey="accuracy" radius={[0, 4, 4, 0]}>
                        {analytics.subjectPerformance.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={entry.accuracy >= 70 ? 'hsl(var(--success))' : entry.accuracy >= 50 ? 'hsl(var(--warning))' : 'hsl(var(--destructive))'}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Batch Comparison */}
            {batchComparison && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Award className="h-4 w-4" />
                    Batch Comparison
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span>Your Average</span>
                        <span className="font-medium">{batchComparison.studentAvg.toFixed(1)}%</span>
                      </div>
                      <Progress value={batchComparison.studentAvg} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span>Batch Average</span>
                        <span className="font-medium">{batchComparison.batchAvg.toFixed(1)}%</span>
                      </div>
                      <Progress value={batchComparison.batchAvg} className="h-2 [&>div]:bg-muted-foreground" />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span>Top 10% Average</span>
                        <span className="font-medium">{batchComparison.top10Avg.toFixed(1)}%</span>
                      </div>
                      <Progress value={batchComparison.top10Avg} className="h-2 [&>div]:bg-yellow-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Compact Revision Reminders */}
            <SpacedRepetitionReminders
              topicMastery={analytics.topicMastery}
              onTopicClick={(topic) => setSelectedTopic(topic)}
              compact
            />
          </TabsContent>

          {/* Revision Tab - Spaced Repetition */}
          <TabsContent value="revision" className="space-y-4 mt-0">
            <SpacedRepetitionReminders
              topicMastery={analytics.topicMastery}
              onTopicClick={(topic) => setSelectedTopic(topic)}
            />
          </TabsContent>

          {/* Topics Tab */}
          <TabsContent value="topics" className="space-y-4 mt-0">
            {/* Weak Topics Heatmap */}
            <Card className="border-orange-500/20 bg-orange-50/50 dark:bg-orange-950/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  Weak Topics Heatmap
                </CardTitle>
                <CardDescription className="text-xs">
                  Topics needing immediate attention (below 70% mastery)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {analytics.weakTopicsHeatmap.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {analytics.weakTopicsHeatmap.map((topic, idx) => {
                      const intensity = Math.max(0.3, (70 - topic.masteryScore) / 70);
                      return (
                        <Button
                          key={topic.topic}
                          variant="outline"
                          size="sm"
                          className="text-xs h-auto py-2 px-3"
                          style={{ 
                            backgroundColor: `rgba(239, 68, 68, ${intensity})`,
                            borderColor: 'rgba(239, 68, 68, 0.5)',
                            color: intensity > 0.5 ? 'white' : 'inherit'
                          }}
                          onClick={() => setSelectedTopic(topic.topic)}
                        >
                          <div className="text-left">
                            <div className="font-medium">{topic.topic}</div>
                            <div className="text-[10px] opacity-80">
                              {topic.masteryScore}% • {topic.recentMistakes} recent errors
                            </div>
                          </div>
                        </Button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Great job! No weak topics detected 🎉
                  </p>
                )}
              </CardContent>
            </Card>

            {/* All Topics List */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Topic Mastery Scores</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {analytics.topicMastery.map((topic) => (
                      <div 
                        key={topic.topic}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => setSelectedTopic(topic.topic)}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium truncate">{topic.topic}</span>
                            <Badge variant="outline" className="text-[10px] shrink-0">
                              {topic.subject}
                            </Badge>
                          </div>
                          <Progress value={topic.masteryScore} className="h-1.5 mt-1" />
                        </div>
                        <div className="text-right shrink-0">
                          <span className={`text-sm font-bold ${
                            topic.masteryScore >= 70 ? 'text-green-600' :
                            topic.masteryScore >= 50 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {topic.masteryScore}%
                          </span>
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            {topic.trend === 'improving' && <TrendingUp className="h-3 w-3 text-green-500" />}
                            {topic.trend === 'declining' && <TrendingDown className="h-3 w-3 text-red-500" />}
                            <span>{topic.correct}/{topic.total}</span>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analysis Tab */}
          <TabsContent value="analysis" className="space-y-4 mt-0">
            {/* Speed vs Accuracy */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Speed vs Accuracy Analysis
                </CardTitle>
                <CardDescription className="text-xs">
                  Identify careless mistakes vs conceptual gaps
                </CardDescription>
              </CardHeader>
              <CardContent>
                {speedAccuracyAnalysis && (
                  <div className="mb-4 p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant={
                        speedAccuracyAnalysis.category === 'fast-accurate' ? 'default' :
                        speedAccuracyAnalysis.category === 'slow-accurate' ? 'secondary' :
                        'destructive'
                      }>
                        {speedAccuracyAnalysis.category.replace('-', ' & ').toUpperCase()}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-muted-foreground">Careless Mistakes:</span>
                        <span className="ml-2 font-medium text-orange-600">{speedAccuracyAnalysis.carelessMistakes}</span>
                        <p className="text-[10px] text-muted-foreground">Fast but wrong - slow down!</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Conceptual Gaps:</span>
                        <span className="ml-2 font-medium text-red-600">{speedAccuracyAnalysis.conceptualGaps}</span>
                        <p className="text-[10px] text-muted-foreground">Need more practice</p>
                      </div>
                    </div>
                  </div>
                )}

                <ResponsiveContainer width="100%" height={200}>
                  <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      type="number" 
                      dataKey="speed" 
                      name="Avg Time (s)" 
                      domain={['auto', 'auto']}
                      fontSize={10}
                      label={{ value: 'Time (slower →)', position: 'bottom', fontSize: 10 }}
                    />
                    <YAxis 
                      type="number" 
                      dataKey="accuracy" 
                      name="Accuracy %" 
                      domain={[0, 100]}
                      fontSize={10}
                      label={{ value: 'Accuracy %', angle: -90, position: 'insideLeft', fontSize: 10 }}
                    />
                    <RechartsTooltip 
                      cursor={{ strokeDasharray: '3 3' }}
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--card))", 
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px"
                      }}
                    />
                    <Scatter data={speedAccuracyData} fill="hsl(var(--primary))">
                      {speedAccuracyData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.accuracy >= 70 ? 'hsl(var(--success))' : entry.accuracy >= 50 ? 'hsl(var(--warning))' : 'hsl(var(--destructive))'}
                        />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Test History */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Recent Tests</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[200px]">
                  <div className="space-y-2">
                    {analytics.performanceTrend.slice(-10).reverse().map((test, idx) => (
                      <div 
                        key={idx}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 cursor-pointer"
                        onClick={() => {
                          const result = analytics.results.find(r => {
                            const t = analytics.testDetails.get(r.test_id);
                            return t?.title === test.testTitle;
                          });
                          if (result) setSelectedTest(result.test_id);
                        }}
                      >
                        <div>
                          <p className="text-sm font-medium truncate max-w-[200px]">{test.testTitle}</p>
                          <p className="text-xs text-muted-foreground">{test.date}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={test.testType === 'mock_test' ? 'default' : 'secondary'} className="text-xs">
                            {test.testType === 'mock_test' ? 'Mock' : 'Chapter'}
                          </Badge>
                          <span className={`font-bold ${
                            test.percentage >= 70 ? 'text-green-600' :
                            test.percentage >= 50 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {test.percentage}%
                          </span>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Actions Tab */}
          <TabsContent value="actions" className="space-y-4 mt-0">
            {/* Study Recommendations */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Flame className="h-4 w-4 text-orange-500" />
                  Priority Study Plan
                </CardTitle>
                <CardDescription className="text-xs">
                  AI-generated recommendations based on your performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {studyRecommendations.map((rec, idx) => (
                    <div 
                      key={rec.topic}
                      className={`p-3 rounded-lg border-l-4 ${
                        rec.priority === 'high' ? 'border-l-red-500 bg-red-50 dark:bg-red-950/20' :
                        rec.priority === 'medium' ? 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950/20' :
                        'border-l-green-500 bg-green-50 dark:bg-green-950/20'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-sm">#{idx + 1} {rec.topic}</span>
                            <Badge variant="outline" className="text-[10px]">{rec.subject}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">{rec.reason}</p>
                          <div className="flex items-center gap-3 text-xs">
                            <span className="flex items-center gap-1">
                              <BookOpen className="h-3 w-3" />
                              {rec.practiceQuestions} questions
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              ~{rec.estimatedTime} min
                            </span>
                          </div>
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => setSelectedTopic(rec.topic)}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Performance Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="p-3 rounded-lg bg-muted/50">
                    <span className="text-muted-foreground text-xs">Tests Completed</span>
                    <p className="text-2xl font-bold">{performanceMetrics.totalTestsTaken}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <span className="text-muted-foreground text-xs">Attempt Rate</span>
                    <p className="text-2xl font-bold">{performanceMetrics.attemptRate}%</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <span className="text-muted-foreground text-xs">Avg Time/Question</span>
                    <p className="text-2xl font-bold">{performanceMetrics.avgTimePerQuestion}s</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <span className="text-muted-foreground text-xs">Weak Topics</span>
                    <p className="text-2xl font-bold">{analytics.weakTopicsHeatmap.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Download Report */}
            <Button onClick={downloadReport} className="w-full">
              <Download className="h-4 w-4 mr-2" />
              Download Performance Report (PDF)
            </Button>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
};
