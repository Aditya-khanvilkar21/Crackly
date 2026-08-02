/**
 * SINGLE SOURCE OF TRUTH for all Crackly marking / scoring rules.
 *
 * This file is imported by BOTH:
 *  - the `submit-test` edge function (Deno)  -> `../_shared/marking.ts`
 *  - the React app (Vite)                    -> `src/lib/marking.ts` re-exports it
 *
 * Never duplicate marks-per-question or subject-section rules anywhere else.
 */

export type ExamType = "JEE" | "NEET" | "CET";
export type TestType = "chapter_test" | "mock_test";

export interface MarkingQuestion {
  correctAnswer: number;
  subject?: string | null;
  marksPerQuestion?: number | null;
}

export interface MarkingTest {
  title?: string | null;
  subject?: string | null;
  chapter?: string | null;
  test_type?: TestType | string | null;
  exam_type?: ExamType | string | null;
  negative_marking?: number | null;
  questions: MarkingQuestion[];
}

export interface SubjectSection {
  subject: string;
  start: number;
  count: number;
  marksPerQuestion: number;
}

export interface MarkingScheme {
  key: "chapter" | "JEE" | "NEET" | "CET-PCM" | "CET-PCB";
  label: string;
  sections: SubjectSection[];
  totalQuestions: number;
  totalMarks: number;
  negativeMarking: number;
}

export interface SubjectScore {
  subject: string;
  total: number;
  attempted: number;
  correct: number;
  wrong: number;
  unanswered: number;
  marks: number;
  maxMarks: number;
  /** correct / total */
  percentage: number;
  /** correct / attempted */
  accuracy: number;
}

export interface TestScore {
  correct: number;
  wrong: number;
  unanswered: number;
  totalQuestions: number;
  totalMarks: number;
  maxMarks: number;
  negativeMarksDeducted: number;
  accuracy: number;
  subjects: SubjectScore[];
  scheme: MarkingScheme;
}

const norm = (s?: string | null) => (s || "").toLowerCase();

const canonicalSubject = (raw?: string | null): string => {
  const s = norm(raw);
  if (s.includes("phys")) return "Physics";
  if (s.includes("chem")) return "Chemistry";
  if (s.includes("math")) return "Mathematics";
  if (s.includes("bio") || s.includes("bot") || s.includes("zoo")) return "Biology";
  if (!s) return "General";
  return raw!.charAt(0).toUpperCase() + raw!.slice(1);
};

/** Detect exam type from explicit column, title marker, or question shape. */
export const detectExamType = (test: MarkingTest): ExamType => {
  const title = norm(test.title);
  if (test.exam_type === "CET" || title.includes("[cet-")) return "CET";
  if (test.exam_type === "NEET") return "NEET";
  if (test.exam_type === "JEE") return "JEE";
  if (norm(test.chapter) === "neet" || test.questions?.length === 180) return "NEET";
  if (norm(test.chapter) === "cet") return "CET";
  return "JEE";
};

const hasBiology = (test: MarkingTest) =>
  (test.questions || []).some((q) => norm(q.subject).includes("bio"));

/** Canonical marking scheme for a test. */
export const getMarkingScheme = (test: MarkingTest): MarkingScheme => {
  const negativeMarking = Number(test.negative_marking) || 0;
  const questions = test.questions || [];
  const isMock = test.test_type === "mock_test";

  if (!isMock) {
    const count = questions.length;
    const sections: SubjectSection[] = [
      {
        subject: canonicalSubject(test.subject) ,
        start: 0,
        count,
        marksPerQuestion: 1,
      },
    ];
    return {
      key: "chapter",
      label: "Chapter Test",
      sections,
      totalQuestions: count,
      totalMarks: count,
      negativeMarking,
    };
  }

  const examType = detectExamType(test);
  const title = norm(test.title);

  let key: MarkingScheme["key"];
  let label: string;
  let blueprint: { subject: string; count: number; marksPerQuestion: number }[];

  if (examType === "CET") {
    const pcb =
      title.includes("[cet-pcb]") || questions.length === 200 || (hasBiology(test) && !title.includes("[cet-pcm]"));
    if (pcb) {
      key = "CET-PCB";
      label = "CET PCB Mock Test";
      blueprint = [
        { subject: "Physics", count: 50, marksPerQuestion: 1 },
        { subject: "Chemistry", count: 50, marksPerQuestion: 1 },
        { subject: "Biology", count: 100, marksPerQuestion: 1 },
      ];
    } else {
      key = "CET-PCM";
      label = "CET PCM Mock Test";
      blueprint = [
        { subject: "Physics", count: 50, marksPerQuestion: 1 },
        { subject: "Chemistry", count: 50, marksPerQuestion: 1 },
        { subject: "Mathematics", count: 50, marksPerQuestion: 2 },
      ];
    }
  } else if (examType === "NEET") {
    key = "NEET";
    label = "NEET Mock Test";
    blueprint = [
      { subject: "Physics", count: 45, marksPerQuestion: 4 },
      { subject: "Chemistry", count: 45, marksPerQuestion: 4 },
      { subject: "Biology", count: 90, marksPerQuestion: 4 },
    ];
  } else {
    key = "JEE";
    label = "JEE Mock Test";
    blueprint = [
      { subject: "Physics", count: 25, marksPerQuestion: 4 },
      { subject: "Chemistry", count: 25, marksPerQuestion: 4 },
      { subject: "Mathematics", count: 25, marksPerQuestion: 4 },
    ];
  }

  const blueprintTotal = blueprint.reduce((s, b) => s + b.count, 0);

  // If the stored questions carry subject tags and the count deviates from the
  // blueprint, derive the real section sizes from the questions themselves so
  // marks never drift from what the student actually attempted.
  let sections: SubjectSection[];
  const tagged = questions.filter((q) => !!q.subject).length === questions.length && questions.length > 0;

  if (tagged && questions.length !== blueprintTotal) {
    sections = [];
    let start = 0;
    questions.forEach((q, idx) => {
      const subject = canonicalSubject(q.subject);
      const last = sections[sections.length - 1];
      if (last && last.subject === subject) {
        last.count++;
      } else {
        const bp = blueprint.find((b) => b.subject === subject);
        sections.push({
          subject,
          start: idx,
          count: 1,
          marksPerQuestion: bp ? bp.marksPerQuestion : blueprint[0].marksPerQuestion,
        });
      }
      start = idx;
    });
    void start;
  } else {
    sections = [];
    let cursor = 0;
    blueprint.forEach((b) => {
      sections.push({ subject: b.subject, start: cursor, count: b.count, marksPerQuestion: b.marksPerQuestion });
      cursor += b.count;
    });
  }

  const totalQuestions = questions.length || blueprintTotal;
  let totalMarks = 0;
  for (let i = 0; i < totalQuestions; i++) totalMarks += marksForIndex(questions, sections, i);

  return { key, label, sections, totalQuestions, totalMarks, negativeMarking };
};

const marksForIndex = (
  questions: MarkingQuestion[],
  sections: SubjectSection[],
  index: number
): number => {
  const q = questions[index];
  const explicit = q && q.marksPerQuestion != null ? Number(q.marksPerQuestion) : NaN;
  if (Number.isFinite(explicit) && explicit > 0) return explicit;

  // Prefer subject match, then index range.
  if (q && q.subject) {
    const bySubject = sections.find((s) => s.subject === canonicalSubject(q.subject));
    if (bySubject) return bySubject.marksPerQuestion;
  }
  const byRange = sections.find((s) => index >= s.start && index < s.start + s.count);
  return byRange ? byRange.marksPerQuestion : 1;
};

/** Marks a single question is worth (question override wins, else scheme rule). */
export const getQuestionMarks = (test: MarkingTest, index: number): number =>
  marksForIndex(test.questions || [], getMarkingScheme(test).sections, index);

/** Canonical scoring for a submitted answer map. Used by server AND UI. */
export const scoreTest = (
  test: MarkingTest,
  answers: Record<string | number, number>
): TestScore => {
  const scheme = getMarkingScheme(test);
  const questions = test.questions || [];
  const negativeMarking = scheme.negativeMarking;

  let correct = 0;
  let wrong = 0;
  let totalMarks = 0;
  let maxMarks = 0;
  let negativeMarksDeducted = 0;

  const bucket = new Map<string, SubjectScore>();
  const sectionFor = (idx: number): SubjectSection | undefined => {
    const q = questions[idx];
    if (q && q.subject) {
      const bySubject = scheme.sections.find((s) => s.subject === canonicalSubject(q.subject));
      if (bySubject) return bySubject;
    }
    return scheme.sections.find((s) => idx >= s.start && idx < s.start + s.count);
  };

  questions.forEach((q, idx) => {
    const marksPerQ = marksForIndex(questions, scheme.sections, idx);
    maxMarks += marksPerQ;

    const subject = sectionFor(idx)?.subject || canonicalSubject(q.subject) || "General";
    const entry =
      bucket.get(subject) ||
      ({
        subject,
        total: 0,
        attempted: 0,
        correct: 0,
        wrong: 0,
        unanswered: 0,
        marks: 0,
        maxMarks: 0,
        percentage: 0,
        accuracy: 0,
      } as SubjectScore);
    entry.total++;
    entry.maxMarks += marksPerQ;

    const given = answers ? (answers as any)[idx] ?? (answers as any)[String(idx)] : undefined;
    if (given !== undefined && given !== null) {
      entry.attempted++;
      if (given === q.correctAnswer) {
        correct++;
        entry.correct++;
        totalMarks += marksPerQ;
        entry.marks += marksPerQ;
      } else {
        wrong++;
        entry.wrong++;
        if (negativeMarking > 0) {
          const deduction = negativeMarking * marksPerQ;
          totalMarks -= deduction;
          entry.marks -= deduction;
          negativeMarksDeducted += deduction;
        }
      }
    } else {
      entry.unanswered++;
    }

    bucket.set(subject, entry);
  });

  totalMarks = Math.max(0, totalMarks);

  const subjects = Array.from(bucket.values()).map((s) => ({
    ...s,
    marks: Math.max(0, s.marks),
    percentage: s.total > 0 ? (s.correct / s.total) * 100 : 0,
    accuracy: s.attempted > 0 ? (s.correct / s.attempted) * 100 : 0,
  }));

  const attempted = correct + wrong;

  return {
    correct,
    wrong,
    unanswered: questions.length - attempted,
    totalQuestions: questions.length,
    totalMarks,
    maxMarks,
    negativeMarksDeducted,
    accuracy: attempted > 0 ? (correct / attempted) * 100 : 0,
    subjects,
    scheme,
  };
};
