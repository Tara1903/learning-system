import { supabase } from "../../config/db.js";
type AnalyticsDocument = any;
type DoubtDocument = any;
type PracticeSetDocument = any;
export interface PracticeQuestion {
  prompt: string;
  answer: string;
  explanation: string;
  difficulty: "easy" | "medium" | "hard";
  status: "pending" | "correct" | "incorrect";
  studentAnswer?: string;
  feedback?: string;
  answeredAt?: Date | string;
}
import { ApiError } from "../../utils/http.js";
import { maybeGenerateStructuredText, parseStructuredJson } from "./aiClient.js";
import { evaluateFallbackPracticeAnswer, summarizePracticeQuestions } from "./practiceEvaluation.js";

interface PracticeInput {
  studentId: string;
  subject: string;
  studentClass: string;
  analytics: AnalyticsDocument | null;
  recentDoubts: DoubtDocument[];
  profileWeakSubjects?: string;
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
  const topics = (input.analytics?.weak_topics || input.analytics?.weakTopics || []).map((item: any) => item.topic);
  
  if (input.profileWeakSubjects) {
    topics.push(...input.profileWeakSubjects.split(',').map(s => s.trim()));
  }
  
  let questions = buildFallbackQuestions(input.subject, topics);

  const prompt = JSON.stringify(
    {
      subject: input.subject,
      studentClass: input.studentClass,
      weakTopics: Array.from(new Set(topics)),
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

  const { data, error } = await supabase.from('practice_sets').insert({
    student_id: input.studentId,
    subject: input.subject,
    topic_tags: topics,
    questions,
    completion_rate: 0,
    accuracy_percentage: 0,
    completed_questions: 0
  }).select().single();

  if (error) throw new ApiError(500, error.message);
  return data;
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
  const { data } = await supabase
    .from('practice_sets')
    .select('*')
    .eq('studentId', studentId)
    .order('updatedAt', { ascending: false });
  return data || [];
}

export async function submitPracticeResponses(input: {
  practiceSetId: string;
  studentId: string;
  subject: string;
  studentClass: string;
  responses: PracticeResponsePayload[];
}): Promise<PracticeSetDocument> {
  const { data: practiceSet, error: fetchErr } = await supabase
    .from('practice_sets')
    .select('*')
    .eq('id', input.practiceSetId)
    .eq('studentId', input.studentId)
    .single();

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

  const { data: updated, error } = await supabase.from('practice_sets').update({
    questions: practiceSet.questions,
    completion_rate: summary.completionRate,
    accuracy_percentage: summary.accuracyPercentage,
    completed_questions: summary.completedQuestions,
    completed_at: summary.completedAt?.toISOString(),
    last_attempted_at: completedAtSource.toISOString(),
    updated_at: new Date().toISOString()
  }).eq('id', practiceSet.id).select().single();

  if (error) throw new ApiError(500, error.message);

  return updated;
}
