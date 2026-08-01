import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { LoadingPanel } from "@/components/LoadingPanel";
import { LoadFailurePanel } from "@/components/LoadFailurePanel";
import { SectionCard } from "@/components/SectionCard";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { useApi } from "@/hooks/useApi";
import { apiFetch } from "@/utils/api";
import type { PracticeSet, PracticeQuestion } from "@/utils/types";
import { useRequireAuth } from "@/hooks/useRequireAuth";

export default function PracticeSetPage() {
  const router = useRouter();
  const { setId } = router.query;
  const { user, status } = useRequireAuth(["student"]);

  const {
    data: practiceData,
    error: loadError,
    mutate
  } = useApi<{ practiceSet: PracticeSet }>(
    status === "authenticated" && setId ? `/student/practice/${setId}` : null
  );

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [studentAnswer, setStudentAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  if (status === "loading" || status === "idle" || !practiceData && !loadError) {
    return <LoadingPanel label="Loading practice set..." />;
  }

  if (loadError) {
    return (
      <DashboardLayout title="Practice Set" subtitle="Test your knowledge">
        <LoadFailurePanel message={loadError.message} onRetry={() => void mutate()} />
      </DashboardLayout>
    );
  }

  const set = practiceData?.practiceSet;
  if (!set) return null;

  const currentQuestion = set.questions[currentQuestionIndex];
  const isCompleted = currentQuestion?.status !== "pending";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentAnswer.trim()) return;

    setSubmitting(true);
    setSubmitError("");

    try {
      await apiFetch<{ success: boolean; feedback: string }>(`/student/practice/${setId}/submit`, {
        method: "POST",
        body: JSON.stringify({
          questionIndex: currentQuestionIndex,
          answer: studentAnswer
        })
      });
      setStudentAnswer("");
      await mutate();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to submit answer.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout
      title={`Practice: ${set.subject}`}
      subtitle={`Topics: ${set.topicTags.join(", ")}`}
      actions={
        <Link
          href="/student/practice"
          className="rounded-full border border-soft px-4 py-2 text-sm font-medium hover:bg-gray-50"
        >
          Back to Dashboard
        </Link>
      }
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Left Side: Navigation */}
        <div className="lg:col-span-1 space-y-4">
          <SectionCard title="Questions">
            <div className="grid grid-cols-5 gap-2">
              {set.questions.map((q, idx) => {
                let bgColor = "bg-[var(--surface-main)]";
                let borderColor = "border-soft";
                
                if (q.status === "correct") {
                  bgColor = "bg-green-100";
                  borderColor = "border-green-300";
                } else if (q.status === "incorrect") {
                  bgColor = "bg-red-100";
                  borderColor = "border-red-300";
                }

                const isActive = currentQuestionIndex === idx;

                return (
                  <button
                    key={idx}
                    onClick={() => setCurrentQuestionIndex(idx)}
                    className={`flex h-10 w-10 items-center justify-center rounded-md border ${bgColor} ${borderColor} ${
                      isActive ? "ring-2 ring-[var(--primary)]" : ""
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
            
            <div className="mt-6 pt-4 border-t border-soft">
              <p className="text-sm text-text-light mb-1">
                Accuracy: <span className="font-semibold text-text-main">{Math.round(set.accuracyPercentage)}%</span>
              </p>
              <p className="text-sm text-text-light">
                Completed: <span className="font-semibold text-text-main">{set.completedQuestions} / {set.questions.length}</span>
              </p>
            </div>
          </SectionCard>
        </div>

        {/* Right Side: Quiz Area */}
        <div className="lg:col-span-3 space-y-6">
          <SectionCard title={`Question ${currentQuestionIndex + 1}`}>
            <div className="mb-6">
              <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                currentQuestion.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                currentQuestion.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-700'
              }`}>
                {currentQuestion.difficulty}
              </span>
            </div>
            
            <p className="text-lg font-medium text-text-main whitespace-pre-wrap mb-8">
              {currentQuestion.prompt}
            </p>

            {isCompleted ? (
              <div className="space-y-4 rounded-lg border border-soft p-4 bg-gray-50">
                <h4 className="font-semibold text-text-main">Your Answer:</h4>
                <p className="text-text-main whitespace-pre-wrap">{currentQuestion.studentAnswer}</p>
                
                <div className={`mt-4 p-4 rounded-md ${currentQuestion.status === 'correct' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                  <p className="font-semibold mb-2">
                    {currentQuestion.status === 'correct' ? '✅ Correct' : '❌ Incorrect'}
                  </p>
                  <p className="text-sm text-text-light">{currentQuestion.feedback}</p>
                </div>
                
                <div className="mt-4">
                  <h4 className="font-semibold text-text-main mb-2">Detailed Explanation:</h4>
                  <p className="text-sm text-text-light whitespace-pre-wrap">{currentQuestion.explanation}</p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <label className="block text-sm font-medium text-text-main">Your Answer</label>
                <textarea
                  value={studentAnswer}
                  onChange={(e) => setStudentAnswer(e.target.value)}
                  className="h-32 w-full rounded-md border border-soft bg-[var(--surface-main)] p-3 text-text-main focus:border-[var(--primary)] focus:outline-none"
                  placeholder="Type your answer here..."
                  required
                />
                
                {submitError && (
                  <div className="text-sm text-[var(--danger)]">{submitError}</div>
                )}
                
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-md bg-[var(--primary)] px-6 py-2 text-sm font-medium text-white transition hover:bg-[var(--primary-dark)] disabled:opacity-50"
                >
                  {submitting ? "Submitting..." : "Submit Answer"}
                </button>
              </form>
            )}

            <div className="flex items-center justify-between mt-8 border-t border-soft pt-4">
              <button
                disabled={currentQuestionIndex === 0}
                onClick={() => setCurrentQuestionIndex(i => i - 1)}
                className="rounded-full border border-soft px-4 py-2 text-sm disabled:opacity-50 hover:bg-gray-50"
              >
                Previous Question
              </button>
              <button
                disabled={currentQuestionIndex === set.questions.length - 1}
                onClick={() => setCurrentQuestionIndex(i => i + 1)}
                className="rounded-full border border-soft px-4 py-2 text-sm disabled:opacity-50 hover:bg-gray-50"
              >
                Next Question
              </button>
            </div>
          </SectionCard>
        </div>
      </div>
    </DashboardLayout>
  );
}
