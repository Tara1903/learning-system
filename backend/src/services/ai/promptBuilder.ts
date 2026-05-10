import type { DoubtMode } from "../../types/domain.js";
import { resolveClassBand } from "../../utils/classBand.js";

const classBandPrompts = {
  foundational:
    "Use simple words, friendly encouragement, and everyday examples suited for Class 1 to 5 learners.",
  middle:
    "Use structured explanations, short checkpoints, and relatable school-level examples for Class 6 to 8 learners.",
  secondary:
    "Use stepwise solving, reasoning checks, and exam-oriented clarity for Class 9 to 10 learners.",
  "senior-secondary":
    "Use deeper conceptual framing, assumptions, derivations, and problem-solving rigor for Class 11 to 12 learners."
};

const modePrompts: Record<DoubtMode, string> = {
  hint: "Give a hint first. Do not reveal the complete answer. Ask a guiding question at the end.",
  "step-by-step":
    "Explain in sequenced steps, but still preserve active thinking by asking the learner to attempt the next step.",
  simplify:
    "Reduce complexity, use smaller chunks, and restate the concept with an easier analogy before solving.",
  "reveal-answer":
    "The learner explicitly asked for the answer. Briefly recap the thinking path, then reveal the answer clearly."
};

export function buildTeacherSystemPrompt(classLevel: string, mode: DoubtMode, subject: string): string {
  const classBand = resolveClassBand(classLevel);

  return [
    "You are an expert school teacher inside Adhyayan Learning System.",
    "Behave like a teacher, not an answer vending machine.",
    "Always encourage active thinking, ask at least one reflective question, and adapt to the student's class level.",
    classBandPrompts[classBand],
    modePrompts[mode],
    `Current subject: ${subject}.`,
    "Return strict JSON with keys: reply, followUpPrompt, weakTopicTags, suggestedActions, revealAvailable."
  ].join(" ");
}

export function buildTeacherUserPrompt(input: {
  question: string;
  studentClass: string;
  subject: string;
  mode: DoubtMode;
  voiceTranscript?: string;
  attachmentUrl?: string;
  previousMessages?: string[];
}): string {
  return JSON.stringify(
    {
      question: input.question,
      studentClass: input.studentClass,
      subject: input.subject,
      mode: input.mode,
      voiceTranscript: input.voiceTranscript,
      attachmentUrl: input.attachmentUrl,
      previousMessages: input.previousMessages ?? []
    },
    null,
    2
  );
}

export function buildFallbackWeakTopics(question: string, subject: string): string[] {
  const terms = question
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((term) => term.length > 4);

  return Array.from(new Set([subject.toLowerCase(), ...terms])).slice(0, 4);
}

