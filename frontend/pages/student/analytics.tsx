import { FormEvent, useEffect, useMemo, useState } from "react";

import { AnalyticsCharts } from "@/components/AnalyticsCharts";
import { LoadFailurePanel } from "@/components/LoadFailurePanel";
import { LoadingPanel } from "@/components/LoadingPanel";
import { SectionCard } from "@/components/SectionCard";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { apiFetch } from "@/utils/api";
import type { AnalyticsSummary, AttendanceRecord, PracticeSet } from "@/utils/types";

interface DashboardData {
  analytics: AnalyticsSummary;
  attendance: AttendanceRecord[];
}

export default function StudentAnalyticsPage() {
  const { user, status, error } = useRequireAuth(["student"]);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [subject, setSubject] = useState("Mathematics");
  const [practiceSets, setPracticeSets] = useState<PracticeSet[]>([]);
  const [activePracticeId, setActivePracticeId] = useState<string | null>(null);
  const [draftAnswers, setDraftAnswers] = useState<Record<number, string>>({});
  const [message, setMessage] = useState("");
  const [loadError, setLoadError] = useState("");
  const [generatingPractice, setGeneratingPractice] = useState(false);
  const [submittingPractice, setSubmittingPractice] = useState(false);

  async function loadDashboardState() {
    const [dashboardResult, recommendationResult, practiceResult] = await Promise.all([
      apiFetch<any>("/student/dashboard"),
      apiFetch<{ recommendations: string[] }>("/student/recommendations"),
      apiFetch<{ practiceSets: PracticeSet[] }>("/student/practice")
    ]);

    setDashboard({
      analytics: dashboardResult.analytics,
      attendance: dashboardResult.attendance
    });
    setRecommendations(recommendationResult.recommendations);
    setPracticeSets(practiceResult.practiceSets);
    setActivePracticeId((current) => current ?? practiceResult.practiceSets[0]?._id ?? null);
    setLoadError("");
  }

  useEffect(() => {
    if (status === "authenticated") {
      void loadDashboardState().catch(() => {
        setDashboard(null);
        setRecommendations([]);
        setPracticeSets([]);
        setLoadError("Unable to load performance analytics right now.");
      });
    }
  }, [status]);

  const activePractice = useMemo(
    () => practiceSets.find((practiceSet) => practiceSet._id === activePracticeId) ?? practiceSets[0] ?? null,
    [activePracticeId, practiceSets]
  );

  useEffect(() => {
    if (!activePractice) {
      setDraftAnswers({});
      return;
    }

    setDraftAnswers(
      activePractice.questions.reduce<Record<number, string>>((acc, question, index) => {
        acc[index] = question.studentAnswer ?? "";
        return acc;
      }, {})
    );
  }, [activePractice?._id]);

  if (!user || status === "loading" || status === "idle") {
    return <LoadingPanel label="Loading analytics..." />;
  }

  if (status === "error") {
    return <LoadFailurePanel title="Student access could not be verified" message={error || "Performance analytics could not confirm your current session."} onRetry={() => window.location.reload()} />;
  }

  async function handlePracticeGeneration(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setGeneratingPractice(true);
    setMessage("");

    try {
      const result = await apiFetch<{ practiceSet: PracticeSet }>("/student/practice/generate", {
        method: "POST",
        body: JSON.stringify({ subject })
      });

      setPracticeSets((current) => [result.practiceSet, ...current.filter((item) => item._id !== result.practiceSet._id)]);
      setActivePracticeId(result.practiceSet._id);
      setMessage(`A new ${result.practiceSet.subject} practice set is ready.`);
      await loadDashboardState();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to generate practice right now.");
    } finally {
      setGeneratingPractice(false);
    }
  }

  async function handlePracticeSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!activePractice) {
      return;
    }

    setSubmittingPractice(true);
    setMessage("");

    try {
      const responses = Object.entries(draftAnswers)
        .map(([questionIndex, answer]) => ({
          questionIndex: Number(questionIndex),
          answer
        }))
        .filter((response) => response.answer.trim());

      const result = await apiFetch<{ practiceSet: PracticeSet }>(`/student/practice/${activePractice._id}/submit`, {
        method: "POST",
        body: JSON.stringify({ responses })
      });

      setPracticeSets((current) =>
        current.map((practiceSet) => (practiceSet._id === result.practiceSet._id ? result.practiceSet : practiceSet))
      );
      setActivePracticeId(result.practiceSet._id);
      setMessage(
        result.practiceSet.completedAt
          ? "Practice completed and reviewed."
          : "Practice answers saved and reviewed."
      );
      await loadDashboardState();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to review practice answers right now.");
    } finally {
      setSubmittingPractice(false);
    }
  }

  return (
    <DashboardLayout
      title="Performance analytics"
      subtitle="See where consistency, doubts, and practice are shaping your academic trajectory."
    >
      {dashboard ? (
        <>
          <SectionCard title="Analytics board" eyebrow="Learning intelligence">
            <AnalyticsCharts analytics={dashboard.analytics} attendance={dashboard.attendance} />
          </SectionCard>

          <div className="grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
            <SectionCard title="Recommendations" eyebrow="Personalized coaching">
              <div className="space-y-3">
                {recommendations.map((recommendation) => (
                  <div key={recommendation} className="rounded-[1.2rem] border border-soft p-4 text-sm leading-6 text-muted">
                    {recommendation}
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Generate practice" eyebrow="AI reinforcement">
              <form className="flex flex-col gap-4 md:flex-row" onSubmit={handlePracticeGeneration}>
                <input
                  className="flex-1 rounded-[1.2rem] border border-soft bg-surface-strong px-4 py-3 outline-none"
                  onChange={(event) => setSubject(event.target.value)}
                  placeholder="Subject"
                  value={subject}
                />
                <button
                  className="rounded-full bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white"
                  disabled={generatingPractice}
                  type="submit"
                >
                  {generatingPractice ? "Generating..." : "Generate practice"}
                </button>
              </form>

              {message ? <p className="mt-4 text-sm text-muted">{message}</p> : null}
            </SectionCard>
          </div>

          <div className="grid gap-6 xl:grid-cols-[0.7fr_1.3fr]">
            <SectionCard title="Practice library" eyebrow="Recent sets">
              <div className="space-y-3">
                {practiceSets.length ? (
                  practiceSets.map((practiceSet) => (
                    <button
                      key={practiceSet._id}
                      className={`w-full rounded-[1.2rem] border p-4 text-left transition ${
                        activePractice?._id === practiceSet._id
                          ? "border-[var(--accent)] bg-[rgba(212,175,55,0.08)]"
                          : "border-soft hover:bg-[rgba(15,61,46,0.04)]"
                      }`}
                      onClick={() => setActivePracticeId(practiceSet._id)}
                      type="button"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-semibold">{practiceSet.subject}</p>
                          <p className="mt-1 text-sm text-muted">
                            {practiceSet.topicTags.length
                              ? practiceSet.topicTags.slice(0, 3).join(", ")
                              : "Focused reinforcement set"}
                          </p>
                        </div>
                        <span className="rounded-full bg-[rgba(15,61,46,0.08)] px-3 py-1 text-xs text-[var(--primary)]">
                          {practiceSet.completionRate}%
                        </span>
                      </div>
                      <p className="mt-3 text-xs uppercase tracking-[0.2em] text-muted">
                        {practiceSet.completedQuestions}/{practiceSet.questions.length} answered · accuracy {practiceSet.accuracyPercentage}%
                      </p>
                    </button>
                  ))
                ) : (
                  <p className="text-sm text-muted">Generate a practice set to begin tracking answer-level progress.</p>
                )}
              </div>
            </SectionCard>

            <SectionCard title="Active practice workspace" eyebrow="Answer, review, improve">
              {activePractice ? (
                <>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-[1.2rem] border border-soft p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-muted">Completion</p>
                      <p className="mt-3 text-3xl font-semibold">{activePractice.completionRate}%</p>
                    </div>
                    <div className="rounded-[1.2rem] border border-soft p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-muted">Accuracy</p>
                      <p className="mt-3 text-3xl font-semibold">{activePractice.accuracyPercentage}%</p>
                    </div>
                    <div className="rounded-[1.2rem] border border-soft p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-muted">Answered</p>
                      <p className="mt-3 text-3xl font-semibold">
                        {activePractice.completedQuestions}/{activePractice.questions.length}
                      </p>
                    </div>
                  </div>

                  <form className="mt-6 space-y-4" onSubmit={handlePracticeSubmit}>
                    {activePractice.questions.map((question, index) => (
                      <div key={`${activePractice._id}-${index}`} className="rounded-[1.3rem] border border-soft p-4">
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div>
                            <p className="text-xs uppercase tracking-[0.2em] text-muted">Question {index + 1}</p>
                            <p className="mt-2 font-semibold">{question.prompt}</p>
                          </div>
                          <span
                            className={`rounded-full px-3 py-1 text-xs ${
                              question.status === "correct"
                                ? "bg-emerald-500/15 text-emerald-700"
                                : question.status === "incorrect"
                                  ? "bg-rose-500/15 text-rose-700"
                                  : "bg-[rgba(15,61,46,0.08)] text-[var(--primary)]"
                            }`}
                          >
                            {question.status}
                          </span>
                        </div>

                        <textarea
                          className="mt-4 min-h-[120px] w-full rounded-[1.2rem] border border-soft bg-surface-strong px-4 py-3 outline-none"
                          onChange={(event) =>
                            setDraftAnswers((current) => ({
                              ...current,
                              [index]: event.target.value
                            }))
                          }
                          placeholder="Write your answer here before checking the review."
                          value={draftAnswers[index] ?? ""}
                        />

                        <div className="mt-4 flex flex-wrap gap-3 text-xs uppercase tracking-[0.18em] text-muted">
                          <span>Difficulty {question.difficulty}</span>
                          {question.answeredAt ? <span>Reviewed</span> : <span>Pending review</span>}
                        </div>

                        {question.feedback ? (
                          <div className="mt-4 rounded-[1.1rem] border border-soft bg-surface-strong px-4 py-3 text-sm text-muted">
                            <span className="font-medium text-[var(--text)]">Feedback:</span> {question.feedback}
                          </div>
                        ) : null}

                        <div className="mt-4 rounded-[1.1rem] border border-dashed border-soft px-4 py-3 text-sm text-muted">
                          <span className="font-medium text-[var(--text)]">Answer key:</span> {question.answer}
                        </div>
                      </div>
                    ))}

                    <button
                      className="rounded-full bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white"
                      disabled={submittingPractice}
                      type="submit"
                    >
                      {submittingPractice ? "Reviewing answers..." : "Submit practice answers"}
                    </button>
                  </form>
                </>
              ) : (
                <p className="text-sm text-muted">Generate or open a practice set to start answer-level coaching.</p>
              )}
            </SectionCard>
          </div>
        </>
      ) : loadError ? (
        <LoadFailurePanel message={loadError} onRetry={() => window.location.reload()} />
      ) : (
        <LoadingPanel label="Collecting performance data..." />
      )}
    </DashboardLayout>
  );
}
