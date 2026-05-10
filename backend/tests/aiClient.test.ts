import { describe, expect, it } from "vitest";

import { buildProviderOrder, extractStructuredJsonText, parseStructuredJson } from "../src/services/ai/aiClient.js";

describe("extractStructuredJsonText", () => {
  it("unwraps fenced json payloads", () => {
    const text = "```json\n{\"reply\":\"hello\"}\n```";

    expect(extractStructuredJsonText(text)).toBe("{\"reply\":\"hello\"}");
  });

  it("extracts nested json objects from extra prose", () => {
    const text = "Here you go:\n{\"recommendations\":[\"Keep practicing\"]}\nThanks!";

    expect(parseStructuredJson<{ recommendations: string[] }>(text).recommendations).toEqual(["Keep practicing"]);
  });
});

describe("buildProviderOrder", () => {
  const status = {
    gemini: { configured: true, allowed: true, circuitOpen: false },
    nvidia: { configured: true, allowed: false, circuitOpen: false }
  } as const;

  it("prefers configured and allowed providers before deterministic fallback", () => {
    expect(buildProviderOrder("auto", "reasoning", status)).toEqual(["gemini", "deterministic"]);
  });

  it("returns deterministic only when the preferred provider is blocked", () => {
    expect(buildProviderOrder("nvidia", "transcription", status)).toEqual(["deterministic"]);
  });
});
