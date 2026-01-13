import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  TestResultData,
  TestData,
  TopicMastery,
  SubjectPerformance,
  PerformanceMetrics,
  SpeedAccuracyAnalysis,
  StudyRecommendation,
  PerformanceTrend,
  QuestionData,
  calculateTopicMastery,
  calculateSpeedAccuracyAnalysis,
  generateStudyRecommendations,
  calculatePredictedScore,
  calculateLearningVelocity,
  calculateSubjectPerformance,
  getPerformanceTrend,
} from "@/lib/analyticsCalculations";

type ExamType = 'JEE' | 'NEET' | 'CET';

interface BatchComparison {
  studentAvg: number;
  batchAvg: number;
  top10Avg: number;
  rank: number | null;
  totalStudents: number;
}

interface StudentAnalyticsData {
  loading: boolean;
  error: string | null;
  topicMastery: TopicMastery[];
  subjectPerformance: SubjectPerformance[];
  performanceMetrics: PerformanceMetrics;
  speedAccuracyAnalysis: SpeedAccuracyAnalysis | null;
  studyRecommendations: StudyRecommendation[];
  performanceTrend: PerformanceTrend[];
  batchComparison: BatchComparison | null;
  weakTopicsHeatmap: TopicMastery[];
  testDetails: Map<string, TestData>;
  results: TestResultData[];
}

export const useStudentAnalytics = (examType?: ExamType) => {
  const [data, setData] = useState<StudentAnalyticsData>({
    loading: true,
    error: null,
    topicMastery: [],
    subjectPerformance: [],
    performanceMetrics: {
      overallAccuracy: 0,
      avgTimePerQuestion: 0,
      attemptRate: 0,
      totalTestsTaken: 0,
      predictedScore: 0,
      predictedPercentile: 0,
      confidenceLevel: 'low',
      learningVelocity: 0,
      currentRank: null,
      batchSize: 0,
    },
    speedAccuracyAnalysis: null,
    studyRecommendations: [],
    performanceTrend: [],
    batchComparison: null,
    weakTopicsHeatmap: [],
    testDetails: new Map(),
    results: [],
  });

  const fetchAnalytics = useCallback(async () => {
    try {
      setData(prev => ({ ...prev, loading: true, error: null }));

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setData(prev => ({ ...prev, loading: false, error: "Not authenticated" }));
        return;
      }

      // Fetch all test results for this student
      let resultsQuery = supabase
        .from("test_results")
        .select("*")
        .eq("student_id", session.user.id)
        .order("completed_at", { ascending: true });

      const { data: resultsData, error: resultsError } = await resultsQuery;

      if (resultsError) throw resultsError;
      if (!resultsData || resultsData.length === 0) {
        setData(prev => ({ 
          ...prev, 
          loading: false, 
          error: null,
          results: [],
        }));
        return;
      }

      // Get unique test IDs
      const testIds = [...new Set(resultsData.map(r => r.test_id))];

      // Fetch test details
      let testsQuery = supabase
        .from("tests")
        .select("*")
        .in("id", testIds);

      if (examType) {
        testsQuery = testsQuery.eq("exam_type", examType);
      }

      const { data: testsData, error: testsError } = await testsQuery;
      if (testsError) throw testsError;

      // Create tests map
      const testsMap = new Map<string, TestData>();
      (testsData || []).forEach(test => {
        testsMap.set(test.id, {
          ...test,
          questions: (test.questions as unknown as QuestionData[]) || [],
        } as TestData);
      });

      // Filter results to only include tests matching the exam type
      const filteredResults = examType 
        ? resultsData.filter(r => testsMap.has(r.test_id))
        : resultsData;

      if (filteredResults.length === 0) {
        setData(prev => ({ 
          ...prev, 
          loading: false, 
          error: null,
          results: [],
        }));
        return;
      }

      const typedResults: TestResultData[] = filteredResults.map(r => ({
        ...r,
        answers: r.answers as Record<number, number>,
      }));

      // Calculate all analytics
      const topicMastery = calculateTopicMastery(typedResults, testsMap);
      const subjectPerformance = calculateSubjectPerformance(typedResults, testsMap);
      const speedAccuracyAnalysis = calculateSpeedAccuracyAnalysis(typedResults, testsMap);
      const studyRecommendations = generateStudyRecommendations(topicMastery, 5);
      const performanceTrend = getPerformanceTrend(typedResults, testsMap);
      const learningVelocity = calculateLearningVelocity(typedResults, testsMap);
      const predictedScore = calculatePredictedScore(typedResults, testsMap, examType || 'JEE');

      // Calculate overall metrics
      let totalCorrect = 0;
      let totalQuestions = 0;
      let totalAttempted = 0;
      let totalTime = 0;

      typedResults.forEach(result => {
        const test = testsMap.get(result.test_id);
        if (!test) return;

        totalQuestions += test.questions.length;
        totalTime += result.time_taken_seconds || 0;

        test.questions.forEach((q, idx) => {
          if (result.answers[idx] !== undefined) {
            totalAttempted++;
            if (result.answers[idx] === q.correctAnswer) {
              totalCorrect++;
            }
          }
        });
      });

      // Fetch batch comparison data
      let batchComparison: BatchComparison | null = null;
      
      // Get student's class
      const { data: classData } = await supabase
        .from("class_students")
        .select("class_id")
        .eq("student_id", session.user.id)
        .limit(1)
        .maybeSingle();

      if (classData?.class_id) {
        // Get all students in the class
        const { data: classStudents } = await supabase
          .from("class_students")
          .select("student_id")
          .eq("class_id", classData.class_id);

        if (classStudents && classStudents.length > 0) {
          const studentIds = classStudents.map(s => s.student_id);

          // Get all results for class students
          const { data: allResults } = await supabase
            .from("test_results")
            .select("student_id, score, total_questions, test_id")
            .in("student_id", studentIds);

          if (allResults && allResults.length > 0) {
            // Filter by exam type if specified
            const relevantResults = examType
              ? allResults.filter(r => testsMap.has(r.test_id))
              : allResults;

            // Calculate averages per student
            const studentAverages = new Map<string, { total: number; count: number }>();
            
            relevantResults.forEach(r => {
              const existing = studentAverages.get(r.student_id) || { total: 0, count: 0 };
              existing.total += (r.score / r.total_questions) * 100;
              existing.count++;
              studentAverages.set(r.student_id, existing);
            });

            const averages = Array.from(studentAverages.entries())
              .map(([id, data]) => ({ id, avg: data.total / data.count }))
              .sort((a, b) => b.avg - a.avg);

            const myAvg = averages.find(a => a.id === session.user.id)?.avg || 0;
            const batchAvg = averages.reduce((sum, a) => sum + a.avg, 0) / averages.length;
            const top10Avg = averages.slice(0, Math.max(1, Math.ceil(averages.length * 0.1)))
              .reduce((sum, a) => sum + a.avg, 0) / Math.max(1, Math.ceil(averages.length * 0.1));
            const rank = averages.findIndex(a => a.id === session.user.id) + 1;

            batchComparison = {
              studentAvg: myAvg,
              batchAvg,
              top10Avg,
              rank: rank > 0 ? rank : null,
              totalStudents: averages.length,
            };
          }
        }
      }

      // Weak topics heatmap (bottom 10 topics)
      const weakTopicsHeatmap = topicMastery
        .filter(t => t.masteryScore < 70 && t.topic !== 'General')
        .slice(0, 10);

      const performanceMetrics: PerformanceMetrics = {
        overallAccuracy: totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0,
        avgTimePerQuestion: totalAttempted > 0 ? Math.round(totalTime / totalAttempted) : 0,
        attemptRate: totalQuestions > 0 ? Math.round((totalAttempted / totalQuestions) * 100) : 0,
        totalTestsTaken: typedResults.length,
        predictedScore: predictedScore.score,
        predictedPercentile: predictedScore.percentile,
        confidenceLevel: predictedScore.confidence,
        learningVelocity,
        currentRank: batchComparison?.rank || null,
        batchSize: batchComparison?.totalStudents || 0,
      };

      setData({
        loading: false,
        error: null,
        topicMastery,
        subjectPerformance,
        performanceMetrics,
        speedAccuracyAnalysis,
        studyRecommendations,
        performanceTrend,
        batchComparison,
        weakTopicsHeatmap,
        testDetails: testsMap,
        results: typedResults,
      });

    } catch (error: any) {
      console.error("Error fetching analytics:", error);
      setData(prev => ({ ...prev, loading: false, error: error.message }));
    }
  }, [examType]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return { ...data, refetch: fetchAnalytics };
};
