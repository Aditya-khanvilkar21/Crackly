// Analytics calculation utilities for the next-gen student analytics system

export interface QuestionData {
  question: string;
  options: string[];
  correctAnswer: number;
  topic?: string;
  subject?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  marksPerQuestion?: number;
}

export interface TestResultData {
  id: string;
  test_id: string;
  score: number;
  total_questions: number;
  answers: Record<number, number>;
  time_taken_seconds: number | null;
  completed_at: string;
}

export interface TestData {
  id: string;
  title: string;
  subject: string | null;
  chapter: string | null;
  test_type: 'chapter_test' | 'mock_test';
  exam_type: 'JEE' | 'NEET' | 'CET';
  difficulty: 'easy' | 'medium' | 'hard';
  negative_marking: number | null;
  questions: QuestionData[];
  duration_minutes: number;
}

export interface TopicMastery {
  topic: string;
  subject: string;
  correct: number;
  wrong: number;
  skipped: number;
  total: number;
  masteryScore: number; // 0-100
  recentMistakes: number;
  trend: 'improving' | 'declining' | 'stable';
  avgTimePerQuestion: number;
  lastAttempted: string;
}

export interface SubjectPerformance {
  subject: string;
  correct: number;
  wrong: number;
  total: number;
  accuracy: number;
  avgSpeed: number;
  masteryScore: number;
}

export interface PerformanceMetrics {
  overallAccuracy: number;
  avgTimePerQuestion: number;
  attemptRate: number;
  totalTestsTaken: number;
  predictedScore: number;
  predictedPercentile: number;
  confidenceLevel: 'low' | 'medium' | 'high';
  learningVelocity: number; // % improvement per week
  currentRank: number | null;
  batchSize: number;
}

export interface SpeedAccuracyAnalysis {
  category: 'fast-accurate' | 'fast-inaccurate' | 'slow-accurate' | 'slow-inaccurate';
  avgCorrectTime: number;
  avgIncorrectTime: number;
  carelessMistakes: number; // Fast but wrong
  conceptualGaps: number; // Slow and wrong
}

export interface StudyRecommendation {
  topic: string;
  subject: string;
  priority: 'high' | 'medium' | 'low';
  reason: string;
  practiceQuestions: number;
  estimatedTime: number; // in minutes
  mistakeCount: number;
  lastAttempted: string;
}

export interface PerformanceTrend {
  date: string;
  percentage: number;
  testTitle: string;
  testType: string;
}

// Difficulty weights for adjusted scoring
const DIFFICULTY_WEIGHTS = {
  easy: 1,
  medium: 1.5,
  hard: 2,
};

// Calculate difficulty-adjusted score
export const calculateDifficultyAdjustedScore = (
  questions: QuestionData[],
  answers: Record<number, number>
): { rawScore: number; adjustedScore: number; maxAdjustedScore: number } => {
  let rawScore = 0;
  let adjustedScore = 0;
  let maxAdjustedScore = 0;

  questions.forEach((q, idx) => {
    const weight = DIFFICULTY_WEIGHTS[q.difficulty || 'medium'];
    maxAdjustedScore += weight;

    if (answers[idx] !== undefined) {
      if (answers[idx] === q.correctAnswer) {
        rawScore++;
        adjustedScore += weight;
      }
    }
  });

  return { rawScore, adjustedScore, maxAdjustedScore };
};

// Calculate topic mastery from all test results
export const calculateTopicMastery = (
  results: TestResultData[],
  tests: Map<string, TestData>
): TopicMastery[] => {
  const topicMap = new Map<string, {
    correct: number;
    wrong: number;
    skipped: number;
    total: number;
    totalTime: number;
    subject: string;
    recentMistakes: number;
    attempts: { date: string; correct: number; total: number }[];
    lastAttempted: string;
  }>();

  results.forEach(result => {
    const test = tests.get(result.test_id);
    if (!test) return;

    const avgTimePerQ = result.time_taken_seconds 
      ? result.time_taken_seconds / test.questions.length 
      : 60;

    test.questions.forEach((q, idx) => {
      const topic = q.topic || test.chapter || 'General';
      const subject = q.subject || test.subject || 'General';
      
      const existing = topicMap.get(topic) || {
        correct: 0,
        wrong: 0,
        skipped: 0,
        total: 0,
        totalTime: 0,
        subject,
        recentMistakes: 0,
        attempts: [],
        lastAttempted: result.completed_at,
      };

      existing.total++;
      existing.totalTime += avgTimePerQ;

      if (result.answers[idx] !== undefined) {
        if (result.answers[idx] === q.correctAnswer) {
          existing.correct++;
        } else {
          existing.wrong++;
          // Count as recent if within last 7 days
          const daysSinceAttempt = Math.floor(
            (Date.now() - new Date(result.completed_at).getTime()) / (1000 * 60 * 60 * 24)
          );
          if (daysSinceAttempt <= 7) {
            existing.recentMistakes++;
          }
        }
      } else {
        existing.skipped++;
      }

      if (new Date(result.completed_at) > new Date(existing.lastAttempted)) {
        existing.lastAttempted = result.completed_at;
      }

      topicMap.set(topic, existing);
    });
  });

  return Array.from(topicMap.entries()).map(([topic, data]) => {
    const masteryScore = data.total > 0 
      ? Math.round((data.correct / data.total) * 100) 
      : 0;

    // Calculate trend (simplified - would need historical data for accurate trend)
    const trend: 'improving' | 'declining' | 'stable' = 
      data.recentMistakes > 3 ? 'declining' : 
      masteryScore >= 70 ? 'stable' : 'improving';

    return {
      topic,
      subject: data.subject,
      correct: data.correct,
      wrong: data.wrong,
      skipped: data.skipped,
      total: data.total,
      masteryScore,
      recentMistakes: data.recentMistakes,
      trend,
      avgTimePerQuestion: data.totalTime / data.total,
      lastAttempted: data.lastAttempted,
    };
  }).sort((a, b) => a.masteryScore - b.masteryScore);
};

// Calculate speed vs accuracy analysis
export const calculateSpeedAccuracyAnalysis = (
  results: TestResultData[],
  tests: Map<string, TestData>
): SpeedAccuracyAnalysis => {
  let correctTimes: number[] = [];
  let incorrectTimes: number[] = [];
  let carelessMistakes = 0;
  let conceptualGaps = 0;

  results.forEach(result => {
    const test = tests.get(result.test_id);
    if (!test || !result.time_taken_seconds) return;

    const avgTimePerQ = result.time_taken_seconds / test.questions.length;
    const fastThreshold = avgTimePerQ * 0.7; // 30% below average is "fast"

    test.questions.forEach((q, idx) => {
      const timeForQ = avgTimePerQ; // Simplified - ideally per-question timing

      if (result.answers[idx] !== undefined) {
        if (result.answers[idx] === q.correctAnswer) {
          correctTimes.push(timeForQ);
        } else {
          incorrectTimes.push(timeForQ);
          if (timeForQ < fastThreshold) {
            carelessMistakes++;
          } else {
            conceptualGaps++;
          }
        }
      }
    });
  });

  const avgCorrectTime = correctTimes.length > 0 
    ? correctTimes.reduce((a, b) => a + b, 0) / correctTimes.length 
    : 0;
  const avgIncorrectTime = incorrectTimes.length > 0 
    ? incorrectTimes.reduce((a, b) => a + b, 0) / incorrectTimes.length 
    : 0;

  const overallAvg = (avgCorrectTime + avgIncorrectTime) / 2 || 60;
  const accuracy = correctTimes.length / (correctTimes.length + incorrectTimes.length) || 0;

  let category: SpeedAccuracyAnalysis['category'];
  if (avgCorrectTime < overallAvg * 0.8 && accuracy > 0.7) {
    category = 'fast-accurate';
  } else if (avgCorrectTime < overallAvg * 0.8 && accuracy <= 0.7) {
    category = 'fast-inaccurate';
  } else if (avgCorrectTime >= overallAvg * 0.8 && accuracy > 0.7) {
    category = 'slow-accurate';
  } else {
    category = 'slow-inaccurate';
  }

  return {
    category,
    avgCorrectTime,
    avgIncorrectTime,
    carelessMistakes,
    conceptualGaps,
  };
};

// Generate study recommendations
export const generateStudyRecommendations = (
  topicMastery: TopicMastery[],
  limit: number = 5
): StudyRecommendation[] => {
  const weakTopics = topicMastery
    .filter(t => t.masteryScore < 70 && t.topic !== 'General')
    .sort((a, b) => {
      // Priority: recent mistakes > low mastery > older attempts
      const aPriority = a.recentMistakes * 3 + (100 - a.masteryScore) * 0.5;
      const bPriority = b.recentMistakes * 3 + (100 - b.masteryScore) * 0.5;
      return bPriority - aPriority;
    })
    .slice(0, limit);

  return weakTopics.map(topic => {
    const practiceQuestions = Math.min(Math.max(10, topic.wrong * 2), 30);
    const estimatedTime = practiceQuestions * 2; // ~2 min per question

    let priority: 'high' | 'medium' | 'low';
    let reason: string;

    if (topic.recentMistakes >= 3 && topic.masteryScore < 40) {
      priority = 'high';
      reason = `Critical: ${topic.recentMistakes} recent mistakes and only ${topic.masteryScore}% mastery.`;
    } else if (topic.recentMistakes >= 2 || topic.masteryScore < 50) {
      priority = 'high';
      reason = `${topic.recentMistakes} mistakes in last week. Needs immediate revision.`;
    } else if (topic.masteryScore < 60) {
      priority = 'medium';
      reason = `Below target mastery (${topic.masteryScore}%). Practice recommended.`;
    } else {
      priority = 'low';
      reason = `Approaching target mastery. Quick revision suggested.`;
    }

    return {
      topic: topic.topic,
      subject: topic.subject,
      priority,
      reason,
      practiceQuestions,
      estimatedTime,
      mistakeCount: topic.wrong,
      lastAttempted: topic.lastAttempted,
    };
  });
};

// Calculate predicted exam score
export const calculatePredictedScore = (
  results: TestResultData[],
  tests: Map<string, TestData>,
  examType: 'JEE' | 'NEET' | 'CET'
): { score: number; maxScore: number; percentile: number; confidence: 'low' | 'medium' | 'high' } => {
  if (results.length === 0) {
    return { score: 0, maxScore: 0, percentile: 0, confidence: 'low' };
  }

  // Weight recent tests more heavily
  const weightedResults = results.map((r, idx) => {
    const recency = (idx + 1) / results.length; // More recent = higher weight
    const test = tests.get(r.test_id);
    const percentage = test ? (r.score / r.total_questions) * 100 : 0;
    return { percentage, weight: recency };
  });

  const totalWeight = weightedResults.reduce((sum, r) => sum + r.weight, 0);
  const weightedAvg = weightedResults.reduce((sum, r) => sum + r.percentage * r.weight, 0) / totalWeight;

  // Max scores by exam
  const maxScores = { JEE: 300, NEET: 720, CET: 200 };
  const maxScore = maxScores[examType];
  const predictedScore = Math.round((weightedAvg / 100) * maxScore);

  // Simplified percentile calculation (would need actual data in production)
  const percentile = Math.min(99, Math.round(weightedAvg * 0.95));

  // Confidence based on number of tests
  const confidence = results.length >= 10 ? 'high' : results.length >= 5 ? 'medium' : 'low';

  return { score: predictedScore, maxScore, percentile, confidence };
};

// Calculate learning velocity (% improvement per week)
export const calculateLearningVelocity = (
  results: TestResultData[],
  tests: Map<string, TestData>
): number => {
  if (results.length < 3) return 0;

  const sortedResults = [...results].sort(
    (a, b) => new Date(a.completed_at).getTime() - new Date(b.completed_at).getTime()
  );

  // Get first and last 3 results averages
  const firstThree = sortedResults.slice(0, 3);
  const lastThree = sortedResults.slice(-3);

  const avgFirst = firstThree.reduce((sum, r) => {
    const test = tests.get(r.test_id);
    return sum + (test ? (r.score / r.total_questions) * 100 : 0);
  }, 0) / firstThree.length;

  const avgLast = lastThree.reduce((sum, r) => {
    const test = tests.get(r.test_id);
    return sum + (test ? (r.score / r.total_questions) * 100 : 0);
  }, 0) / lastThree.length;

  // Calculate weeks between first and last test
  const firstDate = new Date(firstThree[0].completed_at);
  const lastDate = new Date(lastThree[lastThree.length - 1].completed_at);
  const weeks = Math.max(1, (lastDate.getTime() - firstDate.getTime()) / (7 * 24 * 60 * 60 * 1000));

  return Number(((avgLast - avgFirst) / weeks).toFixed(1));
};

// Calculate subject-wise performance
export const calculateSubjectPerformance = (
  results: TestResultData[],
  tests: Map<string, TestData>
): SubjectPerformance[] => {
  const subjectMap = new Map<string, { correct: number; wrong: number; total: number; totalTime: number }>();

  results.forEach(result => {
    const test = tests.get(result.test_id);
    if (!test) return;

    const avgTimePerQ = result.time_taken_seconds 
      ? result.time_taken_seconds / test.questions.length 
      : 60;

    test.questions.forEach((q, idx) => {
      const subject = q.subject || test.subject || 'General';
      const existing = subjectMap.get(subject) || { correct: 0, wrong: 0, total: 0, totalTime: 0 };
      
      existing.total++;
      existing.totalTime += avgTimePerQ;

      if (result.answers[idx] !== undefined) {
        if (result.answers[idx] === q.correctAnswer) {
          existing.correct++;
        } else {
          existing.wrong++;
        }
      }

      subjectMap.set(subject, existing);
    });
  });

  return Array.from(subjectMap.entries()).map(([subject, data]) => ({
    subject,
    correct: data.correct,
    wrong: data.wrong,
    total: data.total,
    accuracy: data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0,
    avgSpeed: data.total > 0 ? Math.round(data.totalTime / data.total) : 0,
    masteryScore: data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0,
  }));
};

// Get performance trend data
export const getPerformanceTrend = (
  results: TestResultData[],
  tests: Map<string, TestData>
): PerformanceTrend[] => {
  return results
    .sort((a, b) => new Date(a.completed_at).getTime() - new Date(b.completed_at).getTime())
    .map(result => {
      const test = tests.get(result.test_id);
      return {
        date: new Date(result.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        percentage: test ? Number(((result.score / result.total_questions) * 100).toFixed(1)) : 0,
        testTitle: test?.title || 'Unknown Test',
        testType: test?.test_type || 'chapter_test',
      };
    });
};
