import { supabase } from "../../config/db.js";
import { maybeGenerateStructuredText, parseStructuredJson } from "./aiClient.js";

type AnalyticsDocument = any;

function buildStudentRecommendations(analytics: AnalyticsDocument | null): string[] {
  if (!analytics) {
    return [
      "Start a doubt session after homework to build your learning profile.",
      "Keep your attendance strong this week to unlock reliable performance insights."
    ];
  }

  const recommendations: string[] = [];

  if ((analytics.attendance_percentage || analytics.attendancePercentage || 0) < 85) {
    recommendations.push("Improve attendance this week to avoid learning gaps in class continuity.");
  }

  const weakTopics = analytics.weak_topics || analytics.weakTopics || [];
  if (weakTopics.length > 0) {
    recommendations.push(`Revise ${weakTopics[0]?.topic} with one guided doubt session and one practice set.`);
  }

  const practiceAccuracy = analytics.practice_accuracy || analytics.practiceAccuracy || 0;
  if (practiceAccuracy === 0) {
    recommendations.push("Attempt your first focused practice round so the system can coach you with real answer patterns.");
  } else if (practiceAccuracy < 70) {
    recommendations.push("Attempt another practice round and review the explanation before checking the final answer.");
  }

  if (!recommendations.length) {
    recommendations.push("You are on track. Keep using guided doubts to deepen conceptual understanding.");
  }

  return recommendations;
}

function buildParentRecommendations(analytics: AnalyticsDocument | null): string[] {
  if (!analytics) {
    return [
      "Encourage your child to use the AI teacher after homework so the system can start building insights."
    ];
  }

  const recommendations: string[] = [];

  if ((analytics.attendance_percentage || analytics.attendancePercentage || 0) < 85) {
    recommendations.push("Monitor regular attendance and speak with the class teacher if absences continue.");
  }

  const weakTopics = analytics.weak_topics || analytics.weakTopics || [];
  if (weakTopics.length > 0) {
    recommendations.push(`Support revision time for ${weakTopics[0]?.topic} this week.`);
  }

  if ((analytics.doubt_count || analytics.doubtCount || 0) === 0) {
    recommendations.push("Encourage your child to ask doubts at home instead of waiting until the next class.");
  }

  if (!recommendations.length) {
    recommendations.push("Your child is showing steady engagement. Maintain the same study rhythm at home.");
  }

  return recommendations;
}

async function maybeEnhanceRecommendations(
  audience: "student" | "parent",
  analytics: AnalyticsDocument | null,
  baseRecommendations: string[]
): Promise<string[]> {
  try {
    const result = await maybeGenerateStructuredText({
      systemPrompt:
        "You improve institute learning recommendations. Return strict JSON with key recommendations as an array of up to 3 short, actionable sentences. Keep the tone practical and supportive.",
      userPrompt: JSON.stringify(
        {
          audience,
              analytics: analytics
            ? {
                attendancePercentage: analytics.attendance_percentage || analytics.attendancePercentage,
                doubtCount: analytics.doubt_count || analytics.doubtCount,
                weakTopics: analytics.weak_topics || analytics.weakTopics,
                practiceAccuracy: analytics.practice_accuracy || analytics.practiceAccuracy,
                lastActivityAt: analytics.last_activity_at || analytics.lastActivityAt
              }
            : null,
          baselineRecommendations: baseRecommendations
        },
        null,
        2
      ),
      capability: "reasoning",
      feature: `${audience}-recommendations`,
      expectJson: true
    });

    if (!result?.text) {
      return baseRecommendations;
    }

    const parsed = parseStructuredJson<{ recommendations?: string[] }>(result.text);
    const normalized = (parsed.recommendations ?? []).map((item) => item.trim()).filter(Boolean).slice(0, 3);

    return normalized.length ? normalized : baseRecommendations;
  } catch {
    return baseRecommendations;
  }
}

export async function generateStudentRecommendations(analytics: AnalyticsDocument | null): Promise<string[]> {
  const baseRecommendations = buildStudentRecommendations(analytics);
  return maybeEnhanceRecommendations("student", analytics, baseRecommendations);
}

export async function generateParentRecommendations(analytics: AnalyticsDocument | null): Promise<string[]> {
  const baseRecommendations = buildParentRecommendations(analytics);
  return maybeEnhanceRecommendations("parent", analytics, baseRecommendations);
}
