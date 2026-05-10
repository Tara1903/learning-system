import { describe, expect, it } from "vitest";

import {
  evaluateFallbackPracticeAnswer,
  summarizePracticeQuestions
} from "../src/services/ai/practiceEvaluation.js";

describe("evaluateFallbackPracticeAnswer", () => {
  it("marks an exact answer as correct", () => {
    const result = evaluateFallbackPracticeAnswer(
      "Photosynthesis converts sunlight into chemical energy.",
      "Photosynthesis converts sunlight into chemical energy.",
      "Review how sunlight helps the plant produce food."
    );

    expect(result.status).toBe("correct");
  });

  it("marks an unrelated answer as incorrect", () => {
    const result = evaluateFallbackPracticeAnswer(
      "The numerator is the top number in a fraction.",
      "Fractions are shapes with four sides.",
      "Check which number sits above the fraction bar."
    );

    expect(result.status).toBe("incorrect");
  });
});

describe("summarizePracticeQuestions", () => {
  it("calculates completion and accuracy from reviewed questions", () => {
    const summary = summarizePracticeQuestions([
      { status: "correct", studentAnswer: "Answer 1" },
      { status: "incorrect", studentAnswer: "Answer 2" },
      { status: "pending", studentAnswer: "" }
    ]);

    expect(summary.completedQuestions).toBe(2);
    expect(summary.completionRate).toBeCloseTo(66.67, 2);
    expect(summary.accuracyPercentage).toBe(50);
    expect(summary.completedAt).toBeUndefined();
  });
});
