import { FormEvent, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { LoadingPanel } from "@/components/LoadingPanel";
import { LoadFailurePanel } from "@/components/LoadFailurePanel";
import { SectionCard } from "@/components/SectionCard";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { useApi } from "@/hooks/useApi";
import { apiFetch } from "@/utils/api";
import type { PracticeSet, PaginationMeta } from "@/utils/types";
import { useRequireAuth } from "@/hooks/useRequireAuth";

export default function PracticeDashboardPage() {
  const router = useRouter();
  const { user, status } = useRequireAuth(["student"]);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState("");
  const [subject, setSubject] = useState("Math");
  const [topics, setTopics] = useState("");
  const [page, setPage] = useState(1);

  const {
    data: practiceData,
    error: loadError,
    mutate
  } = useApi<{ practiceSets: PracticeSet[]; pagination: PaginationMeta }>(
    status === "authenticated" ? `/student/practice?page=${page}&pageSize=10` : null
  );

  const handleGenerate = async (e: FormEvent) => {
    e.preventDefault();
    if (!subject || !topics) return;

    setGenerating(true);
    setGenerateError("");

    try {
      const topicTags = topics.split(",").map((t) => t.trim()).filter(Boolean);
      const res = await apiFetch<{ practiceSet: { id: string } }>("/student/practice/generate", {
        method: "POST",
        body: JSON.stringify({ subject, topicTags })
      });
      router.push(`/student/practice/${res.practiceSet.id}`);
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : "Failed to generate practice set.");
      setGenerating(false);
    }
  };

  if (status === "loading" || status === "idle") {
    return <LoadingPanel label="Loading practice dashboard..." />;
  }

  if (loadError) {
    return (
      <DashboardLayout title="Practice Sets" subtitle="Test your knowledge">
        <LoadFailurePanel message={loadError.message} onRetry={() => void mutate()} />
      </DashboardLayout>
    );
  }

  const sets = practiceData?.practiceSets || [];
  const pagination = practiceData?.pagination;

  return (
    <DashboardLayout
      title="Practice Sets"
      subtitle="AI-generated quizzes tailored to your weak topics."
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column: List of Practice Sets */}
        <div className="lg:col-span-2 space-y-6">
          <SectionCard title="Your Practice History">
            {sets.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-soft p-12 text-center">
                <div className="mb-4 text-4xl">📝</div>
                <h3 className="mb-1 text-lg font-medium text-text-main">No Practice Sets Yet</h3>
                <p className="text-sm text-text-light">
                  Generate a practice set to start testing your knowledge.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {sets.map((set) => {
                  const id = (set as any).id || (set as any)._id;
                  return (
                    <div
                      key={id}
                      className="flex items-center justify-between rounded-lg border border-soft p-4 shadow-sm"
                    >
                      <div>
                        <h4 className="font-semibold text-text-main">{set.subject}</h4>
                        <p className="text-sm text-text-light">
                          Topics: {set.topicTags.join(", ")}
                        </p>
                        <p className="text-sm text-text-light mt-1">
                          {set.completedQuestions} / {set.questions.length} questions completed
                        </p>
                      </div>
                      <div className="text-right flex flex-col items-end gap-2">
                        <span className="inline-flex items-center rounded-full bg-[var(--surface-accent)] px-2.5 py-0.5 text-xs font-semibold text-[var(--primary)]">
                          {Math.round(set.accuracyPercentage)}% Accuracy
                        </span>
                        <Link
                          href={`/student/practice/${id}`}
                          className="text-sm font-medium text-[var(--primary)] hover:underline"
                        >
                          {set.completedQuestions < set.questions.length ? "Continue" : "Review"} &rarr;
                        </Link>
                      </div>
                    </div>
                  );
                })}

                {/* Pagination */}
                {pagination && pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between pt-4">
                    <button
                      disabled={!pagination.hasPreviousPage}
                      onClick={() => setPage((p) => p - 1)}
                      className="rounded-full border border-soft px-4 py-2 text-sm disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <span className="text-sm text-text-light">
                      Page {pagination.page} of {pagination.totalPages}
                    </span>
                    <button
                      disabled={!pagination.hasNextPage}
                      onClick={() => setPage((p) => p + 1)}
                      className="rounded-full border border-soft px-4 py-2 text-sm disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            )}
          </SectionCard>
        </div>

        {/* Right Column: Generate New Set */}
        <div>
          <SectionCard title="Generate New Set">
            <form onSubmit={handleGenerate} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-text-main">
                  Subject
                </label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full rounded-md border border-soft bg-[var(--surface-main)] p-2 text-text-main focus:border-[var(--primary)] focus:outline-none"
                  required
                >
                  <option value="Math">Math</option>
                  <option value="Science">Science</option>
                  <option value="Physics">Physics</option>
                  <option value="Chemistry">Chemistry</option>
                  <option value="Biology">Biology</option>
                  <option value="English">English</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-text-main">
                  Topics (comma separated)
                </label>
                <input
                  type="text"
                  value={topics}
                  onChange={(e) => setTopics(e.target.value)}
                  placeholder="e.g. Algebra, Fractions"
                  className="w-full rounded-md border border-soft bg-[var(--surface-main)] p-2 text-text-main focus:border-[var(--primary)] focus:outline-none"
                  required
                />
              </div>

              {generateError && (
                <div className="text-sm text-[var(--danger)]">{generateError}</div>
              )}

              <button
                type="submit"
                disabled={generating}
                className="w-full rounded-md bg-[var(--primary)] py-2 text-sm font-medium text-white transition hover:bg-[var(--primary-dark)] disabled:opacity-50"
              >
                {generating ? "Generating via AI..." : "Generate Practice Set"}
              </button>
            </form>
          </SectionCard>
        </div>
      </div>
    </DashboardLayout>
  );
}
