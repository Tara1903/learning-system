import type { DoubtMode, SuggestedAction } from "../../types/domain.js";
import { buildFallbackWeakTopics, buildTeacherSystemPrompt, buildTeacherUserPrompt } from "./promptBuilder.js";
import type { AiAttachment } from "./aiClient.js";
import { maybeGenerateStructuredText, parseStructuredJson } from "./aiClient.js";

export interface TeacherGuideInput {
  question: string;
  subject: string;
  studentClass: string;
  mode: DoubtMode;
  voiceTranscript?: string;
  attachmentUrl?: string;
  attachment?: AiAttachment;
  previousMessages?: string[];
}

export interface TeacherGuideOutput {
  reply: string;
  followUpPrompt: string;
  weakTopicTags: string[];
  suggestedActions: SuggestedAction[];
  revealAvailable: boolean;
}

function buildSuggestedActions(mode: DoubtMode): SuggestedAction[] {
  const options: SuggestedAction[] = [
    { label: "Need a hint", mode: "hint" },
    { label: "Break it down", mode: "simplify" },
    { label: "Teach me step-by-step", mode: "step-by-step" },
    { label: "Reveal answer", mode: "reveal-answer" }
  ];

  return options.filter((option) => option.mode !== mode);
}

function fallbackTeacherGuide(input: TeacherGuideInput): TeacherGuideOutput {
  const weakTopicTags = buildFallbackWeakTopics(input.question, input.subject);
  const opening =
    input.mode === "hint"
      ? "Let's unlock this with a hint instead of jumping straight to the answer."
      : input.mode === "simplify"
        ? "Let's make this smaller and easier before we solve it."
        : input.mode === "step-by-step"
          ? "Let's solve this in clear stages so you can see the pattern."
          : "You asked for the answer, so I will reveal it after a quick recap of the thinking path.";

  return {
    reply: `${opening} Focus first on the key idea in ${input.subject}. Read the question once more, underline what is being asked, and identify the first fact or formula you already know. Based on your question, start by reasoning about ${weakTopicTags[0] ?? input.subject} before moving to the final conclusion.`,
    followUpPrompt:
      input.mode === "reveal-answer"
        ? "Can you now explain why that answer works in your own words?"
        : "What do you think the first step should be? Try it and I will guide the next step.",
    weakTopicTags,
    suggestedActions: buildSuggestedActions(input.mode),
    revealAvailable: true
  };
}

export async function generateTeacherGuidance(input: TeacherGuideInput): Promise<TeacherGuideOutput> {
  try {
    const result = await maybeGenerateStructuredText({
      systemPrompt: buildTeacherSystemPrompt(input.studentClass, input.mode, input.subject),
      userPrompt: buildTeacherUserPrompt(input),
      capability: input.attachment ? "multimodal" : "reasoning",
      feature: "teacher-guidance",
      attachment: input.attachment,
      expectJson: true
    });
    if (!result?.text) {
      return fallbackTeacherGuide(input);
    }

    const parsed = parseStructuredJson<Partial<TeacherGuideOutput>>(result.text);
    return {
      reply: parsed.reply ?? fallbackTeacherGuide(input).reply,
      followUpPrompt: parsed.followUpPrompt ?? "What do you want to try next?",
      weakTopicTags: parsed.weakTopicTags?.length ? parsed.weakTopicTags : buildFallbackWeakTopics(input.question, input.subject),
      suggestedActions:
        parsed.suggestedActions?.length
          ? parsed.suggestedActions
          : buildSuggestedActions(input.mode),
      revealAvailable: parsed.revealAvailable ?? true
    };
  } catch {
    return fallbackTeacherGuide(input);
  }
}
