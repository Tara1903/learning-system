import { PracticeSetModel } from "../../models/PracticeSet.js";
import type { AnalyticsDocument } from "../../models/Analytics.js";
import type { DoubtDocument } from "../../models/Doubt.js";
import type { PracticeQuestion, PracticeSetDocument } from "../../models/PracticeSet.js";
import { ApiError } from "../../utils/http.js";
import { maybeGenerateStructuredText, parseStructuredJson } from "./aiClient.js";
import { evaluateFallbackPracticeAnswer, summarizePracticeQuestions } from "./practiceEvaluation.js";

interface PracticeInput {
  studentId: string;
  subject: string;
  studentClass: string;
  analytics: AnalyticsDocument | null;
  recentDoubts: DoubtDocument[];
}

export interface PracticeResponsePayload {
  questionIndex: number;
  answer: string;
}

function buildFallbackQuestions(subject: string, topics: string[]) {
  const focusTopics = topics.length ? topics : [subject.toLowerCase()];
  return focusTopics.slice(0, 5).map((topic, index) => ({
    prompt: `Question ${index + 1}: Explain or solve one core idea related to ${topic} in ${subject}.`,
    answer: `A correct answer should show understanding of ${topic} in ${subject}.`,
    explanation: `Start from the definition of ${topic}, identify the relevant rule, and then apply it carefully.`,
    difficulty: index < 2 ? "easy" : index < 4 ? "medium" : "hard",
    status: "pending" as const
  }));
}

export async function generatePracticeSet(input: PracticeInput) {
  const topics = input.analytics?.weakTopics.map((item) => item.topic) ?? [];
  let questions = buildFallbackQuestions(input.subject, topics);

  const prompt = JSON.stringify(
    {
      subject: input.subject,
      studentClass: input.studentClass,
      weakTopics: topics,
      recentQuestions: input.recentDoubts.slice(0, 3).map((doubt) => doubt.question)
    },
    null,
    2
  );

  try {
    const result = await maybeGenerateStructuredText({
      systemPrompt:
        "You create 5 school practice questions. Return strict JSON with key questions as an array of {prompt, answer, explanation, difficulty}.",
      userPrompt: prompt,
      capability: "reasoning",
      feature: "practice-generation",
      expectJson: true
    });

    if (result?.text) {
      const parsed = parseStructuredJson<{
        questions?: Array<{
          prompt: string;
          answer: string;
          explanation: string;
          difficulty: "easy" | "medium" | "hard";
        }>;
      }>(result.text);

      if (parsed.questions?.length) {
        questions = parsed.questions.map((question) => ({
          ...question,
          status: "pending" as const
        }));
      }
    }
  } catch {
    // Fall back to deterministic questions.
  }

  return PracticeSetModel.create({
    studentId: input.studentId,
    subject: input.subject,
    topicTags: topics,
    questions,
    completionRate: 0,
    accuracyPercentage: 0,
    completedQuestions: 0
  });
}

async function evaluatePracticeAnswerWithAi(input: {
  question: Pick<PracticeQuestion, "prompt" | "answer" | "explanation">;
  subject: string;
  studentClass: string;
  studentAnswer: string;
}) {
  try {
    const result = await maybeGenerateStructuredText({
      systemPrompt:
        "You are grading a school practice response. Return strict JSON with keys status and feedback. Status must be either correct or incorrect. Mark correct only when the student's answer is materially correct.",
      userPrompt: JSON.stringify(
        {
          subject: input.subject,
          studentClass: input.studentClass,
          prompt: input.question.prompt,
          expectedAnswer: input.question.answer,
          explanation: input.question.explanation,
          studentAnswer: input.studentAnswer
        },
        null,
        2
      ),
      capability: "reasoning",
      feature: "practice-grading",
      expectJson: true
    });

    if (result?.text) {
      const parsed = parseStructuredJson<{
        status?: "correct" | "incorrect";
        feedback?: string;
      }>(result.text);

      if (parsed.status === "correct" || parsed.status === "incorrect") {
        return {
          status: parsed.status,
          feedback: parsed.feedback?.trim() || input.question.explanation
        };
      }
    }
  } catch {
    // Fall back to deterministic grading.
  }

  return evaluateFallbackPracticeAnswer(input.question.answer, input.studentAnswer, input.question.explanation);
}

export async function listPracticeSetsForStudent(studentId: string) {
  return PracticeSetModel.find({ studentId }).sort({ updatedAt: -1, createdAt: -1 });
}

export async function submitPracticeResponses(input: {
  practiceSetId: string;
  studentId: string;
  subject: string;
  studentClass: string;
  responses: PracticeResponsePayload[];
}): Promise<PracticeSetDocument> {
  const practiceSet = await PracticeSetModel.findOne({ _id: input.practiceSetId, studentId: input.studentId });

  if (!practiceSet) {
    throw new ApiError(404, "Practice set not found.");
  }

  const responses = input.responses
    .map((response) => ({
      questionIndex: Number(response.questionIndex),
      answer: String(response.answer ?? "").trim()
    }))
    .filter((response) => response.answer);

  if (!responses.length) {
    throw new ApiError(400, "At least one practice response is required.");
  }

  const invalidResponse = responses.find(
    (response) =>
      Number.isNaN(response.questionIndex) ||
      response.questionIndex < 0 ||
      response.questionIndex >= practiceSet.questions.length
  );

  if (invalidResponse) {
    throw new ApiError(400, "One or more practice responses point to an invalid question.");
  }

  const gradedResponses = await Promise.all(
    responses.map(async (response) => {
      const question = practiceSet.questions[response.questionIndex];
      const evaluation = await evaluatePracticeAnswerWithAi({
        question,
        subject: input.subject,
        studentClass: input.studentClass,
        studentAnswer: response.answer
      });

      return {
        response,
        evaluation
      };
    })
  );

  const completedAtSource = new Date();

  gradedResponses.forEach(({ response, evaluation }) => {
    const question = practiceSet.questions[response.questionIndex];
    question.studentAnswer = response.answer;
    question.status = evaluation.status;
    question.feedback = evaluation.feedback;
    question.answeredAt = completedAtSource;
  });

  const summary = summarizePracticeQuestions(practiceSet.questions, completedAtSource);

  practiceSet.completionRate = summary.completionRate;
  practiceSet.accuracyPercentage = summary.accuracyPercentage;
  practiceSet.completedQuestions = summary.completedQuestions;
  practiceSet.completedAt = summary.completedAt;
  practiceSet.lastAttemptedAt = completedAtSource;

  await practiceSet.save();

  return practiceSet;
}
