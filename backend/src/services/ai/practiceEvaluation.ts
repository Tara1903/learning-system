type PracticeQuestionStatus = "pending" | "correct" | "incorrect";

interface PracticeQuestionSnapshot {
  status: PracticeQuestionStatus;
  studentAnswer?: string;
}

export interface PracticeEvaluationResult {
  status: Extract<PracticeQuestionStatus, "correct" | "incorrect">;
  feedback: string;
}

export interface PracticeProgressSummary {
  completionRate: number;
  accuracyPercentage: number;
  completedQuestions: number;
  completedAt?: Date;
}

const stopWords = new Set([
  "about",
  "after",
  "before",
  "could",
  "every",
  "first",
  "other",
  "should",
  "their",
  "there",
  "these",
  "those",
  "through",
  "under",
  "which",
  "would"
]);

function normalizeFreeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractKeywords(value: string): string[] {
  return normalizeFreeText(value)
    .split(" ")
    .filter((word) => word.length > 3 && !stopWords.has(word));
}

export function evaluateFallbackPracticeAnswer(
  expectedAnswer: string,
  studentAnswer: string,
  explanation: string
): PracticeEvaluationResult {
  const normalizedExpected = normalizeFreeText(expectedAnswer);
  const normalizedStudent = normalizeFreeText(studentAnswer);

  if (!normalizedStudent) {
    return {
      status: "incorrect",
      feedback: "Add a fuller answer so the system can review your reasoning."
    };
  }

  if (
    normalizedStudent === normalizedExpected ||
    normalizedExpected.includes(normalizedStudent) ||
    normalizedStudent.includes(normalizedExpected)
  ) {
    return {
      status: "correct",
      feedback: `Correct. ${explanation}`
    };
  }

  const expectedKeywords = extractKeywords(expectedAnswer);
  const studentKeywords = new Set(extractKeywords(studentAnswer));
  const keywordMatches = expectedKeywords.filter((keyword) => studentKeywords.has(keyword)).length;
  const keywordCoverage = expectedKeywords.length ? keywordMatches / expectedKeywords.length : 0;

  if (keywordCoverage >= 0.6 && keywordMatches >= Math.min(2, expectedKeywords.length || 0)) {
    return {
      status: "correct",
      feedback: `Mostly correct. ${explanation}`
    };
  }

  return {
    status: "incorrect",
    feedback: `Review this once more. ${explanation}`
  };
}

export function summarizePracticeQuestions(
  questions: PracticeQuestionSnapshot[],
  completedAtSource: Date = new Date()
): PracticeProgressSummary {
  const totalQuestions = questions.length;
  const completedQuestions = questions.filter((question) => question.studentAnswer?.trim()).length;
  const evaluatedQuestions = questions.filter((question) => question.status !== "pending").length;
  const correctQuestions = questions.filter((question) => question.status === "correct").length;

  return {
    completionRate: totalQuestions ? Number(((completedQuestions / totalQuestions) * 100).toFixed(2)) : 0,
    accuracyPercentage: evaluatedQuestions ? Number(((correctQuestions / evaluatedQuestions) * 100).toFixed(2)) : 0,
    completedQuestions,
    completedAt: completedQuestions === totalQuestions && totalQuestions > 0 ? completedAtSource : undefined
  };
}
