// Spaced Repetition Algorithm based on SM-2 (SuperMemo 2)
// Calculates optimal review times for weak topics

export interface RevisionReminder {
  topic: string;
  subject: string;
  dueDate: Date;
  daysDue: number; // Negative = overdue, 0 = today, positive = future
  urgency: 'overdue' | 'today' | 'upcoming' | 'scheduled';
  mistakeCount: number;
  masteryScore: number;
  lastReviewed: Date;
  nextInterval: number; // days until next review
  repetitionNumber: number;
  easeFactor: number; // 1.3 to 2.5, affects interval growth
  practiceRecommendation: string;
}

export interface TopicRevisionState {
  topic: string;
  subject: string;
  repetitionNumber: number; // How many times reviewed
  easeFactor: number; // Difficulty multiplier
  lastReviewDate: Date;
  nextReviewDate: Date;
  intervalDays: number;
  masteryScore: number;
  mistakeCount: number;
}

// SM-2 Algorithm constants
const MIN_EASE_FACTOR = 1.3;
const INITIAL_EASE_FACTOR = 2.5;

// Calculate quality of response based on mastery score (0-100 to 0-5 scale)
const getQuality = (masteryScore: number): number => {
  if (masteryScore >= 90) return 5; // Perfect
  if (masteryScore >= 80) return 4; // Correct with hesitation
  if (masteryScore >= 60) return 3; // Correct with difficulty
  if (masteryScore >= 40) return 2; // Incorrect but close
  if (masteryScore >= 20) return 1; // Incorrect
  return 0; // Complete blackout
};

// Calculate next interval based on SM-2
const calculateNextInterval = (
  repetitionNumber: number,
  easeFactor: number,
  quality: number,
  currentInterval: number
): { newInterval: number; newRepetition: number; newEaseFactor: number } => {
  let newInterval: number;
  let newRepetition: number;
  let newEaseFactor = easeFactor;

  // If quality < 3, reset (need more practice)
  if (quality < 3) {
    newRepetition = 0;
    newInterval = 1; // Review tomorrow
  } else {
    // First time: 1 day, second: 3 days, then multiply by ease factor
    if (repetitionNumber === 0) {
      newInterval = 1;
    } else if (repetitionNumber === 1) {
      newInterval = 3;
    } else {
      newInterval = Math.round(currentInterval * easeFactor);
    }
    newRepetition = repetitionNumber + 1;
  }

  // Update ease factor based on quality
  newEaseFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  newEaseFactor = Math.max(MIN_EASE_FACTOR, newEaseFactor);

  // Cap interval at 180 days for topics that need periodic review
  newInterval = Math.min(newInterval, 180);

  return {
    newInterval,
    newRepetition,
    newEaseFactor,
  };
};

// Calculate revision state for a topic based on its mastery and history
export const calculateTopicRevisionState = (
  topic: string,
  subject: string,
  masteryScore: number,
  mistakeCount: number,
  lastAttempted: string,
  existingState?: TopicRevisionState
): TopicRevisionState => {
  const lastDate = new Date(lastAttempted);
  const quality = getQuality(masteryScore);

  if (!existingState) {
    // New topic - calculate initial state
    const { newInterval, newRepetition, newEaseFactor } = calculateNextInterval(
      0,
      INITIAL_EASE_FACTOR,
      quality,
      0
    );

    const nextReviewDate = new Date(lastDate);
    nextReviewDate.setDate(nextReviewDate.getDate() + newInterval);

    return {
      topic,
      subject,
      repetitionNumber: newRepetition,
      easeFactor: newEaseFactor,
      lastReviewDate: lastDate,
      nextReviewDate,
      intervalDays: newInterval,
      masteryScore,
      mistakeCount,
    };
  }

  // Update existing state
  const { newInterval, newRepetition, newEaseFactor } = calculateNextInterval(
    existingState.repetitionNumber,
    existingState.easeFactor,
    quality,
    existingState.intervalDays
  );

  const nextReviewDate = new Date(lastDate);
  nextReviewDate.setDate(nextReviewDate.getDate() + newInterval);

  return {
    topic,
    subject,
    repetitionNumber: newRepetition,
    easeFactor: newEaseFactor,
    lastReviewDate: lastDate,
    nextReviewDate,
    intervalDays: newInterval,
    masteryScore,
    mistakeCount,
  };
};

// Generate revision reminders from topic mastery data
export const generateRevisionReminders = (
  topicMastery: Array<{
    topic: string;
    subject: string;
    masteryScore: number;
    wrong: number;
    lastAttempted: string;
    recentMistakes: number;
  }>
): RevisionReminder[] => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const reminders: RevisionReminder[] = [];

  topicMastery.forEach(tm => {
    // Only create reminders for topics with less than perfect mastery
    if (tm.masteryScore >= 95 && tm.wrong === 0) return;
    if (tm.topic === 'General') return;

    const state = calculateTopicRevisionState(
      tm.topic,
      tm.subject,
      tm.masteryScore,
      tm.wrong,
      tm.lastAttempted
    );

    const dueDate = state.nextReviewDate;
    dueDate.setHours(0, 0, 0, 0);

    const daysDiff = Math.floor(
      (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    let urgency: RevisionReminder['urgency'];
    if (daysDiff < 0) {
      urgency = 'overdue';
    } else if (daysDiff === 0) {
      urgency = 'today';
    } else if (daysDiff <= 3) {
      urgency = 'upcoming';
    } else {
      urgency = 'scheduled';
    }

    // Adjust urgency based on recent mistakes
    if (tm.recentMistakes >= 3 && urgency !== 'overdue') {
      urgency = 'today'; // Force immediate review for struggling topics
    }

    // Generate practice recommendation
    let practiceRecommendation: string;
    const practiceCount = Math.min(Math.max(5, tm.wrong * 2), 25);
    const practiceTime = practiceCount * 2;

    if (tm.masteryScore < 40) {
      practiceRecommendation = `Practice ${practiceCount} conceptual questions (~${practiceTime} min). Focus on fundamentals.`;
    } else if (tm.masteryScore < 60) {
      practiceRecommendation = `Solve ${practiceCount} medium-level problems (~${practiceTime} min). Build understanding.`;
    } else if (tm.masteryScore < 80) {
      practiceRecommendation = `Practice ${practiceCount - 5} questions (~${practiceTime - 10} min). Focus on weak areas.`;
    } else {
      practiceRecommendation = `Quick revision: ${Math.max(5, practiceCount - 10)} questions (~${Math.max(10, practiceTime - 20)} min).`;
    }

    reminders.push({
      topic: tm.topic,
      subject: tm.subject,
      dueDate,
      daysDue: daysDiff,
      urgency,
      mistakeCount: tm.wrong,
      masteryScore: tm.masteryScore,
      lastReviewed: state.lastReviewDate,
      nextInterval: state.intervalDays,
      repetitionNumber: state.repetitionNumber,
      easeFactor: state.easeFactor,
      practiceRecommendation,
    });
  });

  // Sort by urgency: overdue first, then today, then upcoming, then scheduled
  const urgencyOrder = { overdue: 0, today: 1, upcoming: 2, scheduled: 3 };
  return reminders.sort((a, b) => {
    const urgencyDiff = urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
    if (urgencyDiff !== 0) return urgencyDiff;
    // Within same urgency, sort by days due (most urgent first)
    return a.daysDue - b.daysDue;
  });
};

// Get summary statistics for revision reminders
export const getRevisionSummary = (
  reminders: RevisionReminder[]
): {
  overdue: number;
  dueToday: number;
  upcoming: number;
  scheduled: number;
  totalTopics: number;
  avgMastery: number;
  nextSessionTopics: RevisionReminder[];
} => {
  const overdue = reminders.filter(r => r.urgency === 'overdue').length;
  const dueToday = reminders.filter(r => r.urgency === 'today').length;
  const upcoming = reminders.filter(r => r.urgency === 'upcoming').length;
  const scheduled = reminders.filter(r => r.urgency === 'scheduled').length;

  const avgMastery = reminders.length > 0
    ? Math.round(reminders.reduce((sum, r) => sum + r.masteryScore, 0) / reminders.length)
    : 0;

  // Topics for next study session (overdue + today + first 3 upcoming)
  const nextSessionTopics = [
    ...reminders.filter(r => r.urgency === 'overdue'),
    ...reminders.filter(r => r.urgency === 'today'),
    ...reminders.filter(r => r.urgency === 'upcoming').slice(0, 3),
  ].slice(0, 5);

  return {
    overdue,
    dueToday,
    upcoming,
    scheduled,
    totalTopics: reminders.length,
    avgMastery,
    nextSessionTopics,
  };
};

// Format due date for display
export const formatDueDate = (reminder: RevisionReminder): string => {
  if (reminder.urgency === 'overdue') {
    const days = Math.abs(reminder.daysDue);
    return days === 1 ? 'Overdue by 1 day' : `Overdue by ${days} days`;
  }
  if (reminder.urgency === 'today') {
    return 'Due today';
  }
  if (reminder.daysDue === 1) {
    return 'Due tomorrow';
  }
  if (reminder.daysDue <= 7) {
    return `Due in ${reminder.daysDue} days`;
  }
  return reminder.dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};
