import { describe, expect, it } from "vitest";

import { buildTeacherSystemPrompt } from "../src/services/ai/promptBuilder.js";

describe("buildTeacherSystemPrompt", () => {
  it("uses foundational prompt for early classes", () => {
    const prompt = buildTeacherSystemPrompt("4", "hint", "Mathematics");
    expect(prompt).toContain("Class 1 to 5");
    expect(prompt).toContain("hint");
  });

  it("uses senior-secondary prompt for higher classes", () => {
    const prompt = buildTeacherSystemPrompt("12", "step-by-step", "Physics");
    expect(prompt).toContain("Class 11 to 12");
    expect(prompt).toContain("Physics");
  });
});

