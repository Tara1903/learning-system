import { describe, expect, it } from "vitest";

import { generateStudentRecommendations } from "../src/services/ai/recommendationService.js";

describe("generateStudentRecommendations", () => {
  it("returns attendance advice for low-attendance students", async () => {
    const recommendations = await generateStudentRecommendations({
      attendancePercentage: 60,
      weakTopics: [{ topic: "fractions", subject: "math", confidence: 0.8 }],
      doubtCount: 2,
      practiceAccuracy: 50
    } as any);

    expect(recommendations.join(" ")).toContain("attendance");
    expect(recommendations.join(" ")).toContain("fractions");
  });
});
