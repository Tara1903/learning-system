import { ImagePlus, Mic, SendHorizonal, Sparkle, Undo2 } from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

import { BrandSceneSurface } from "@/components/BrandSceneSurface";
import { LoadFailurePanel } from "@/components/LoadFailurePanel";
import { LoadingPanel } from "@/components/LoadingPanel";
import { SectionCard } from "@/components/SectionCard";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { useChatStore } from "@/store/chat-store";
import { apiFetch, uploadFile } from "@/utils/api";
import type { DoubtThread, SuggestedAction, UploadAssetSummary } from "@/utils/types";

const modes = [
  { label: "Hint", value: "hint" as const },
  { label: "Simplify", value: "simplify" as const },
  { label: "Try Yourself", value: "step-by-step" as const },
  { label: "Reveal Answer", value: "reveal-answer" as const }
];

export default function StudentChatPage() {
  const { user, features, status, error } = useRequireAuth(["student"]);
  const { activeThreadId, mode, setMode, setThreadId, attachmentAssetId, attachmentDownloadUrl, setAttachmentAsset } =
    useChatStore();
  const [threads, setThreads] = useState<DoubtThread[]>([]);
  const [loadError, setLoadError] = useState("");
  const [question, setQuestion] = useState("");
  const [subject, setSubject] = useState("Mathematics");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [selectedAudioFile, setSelectedAudioFile] = useState<File | null>(null);
  const [voiceBlob, setVoiceBlob] = useState<Blob | null>(null);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [recording, setRecording] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [lastActions, setLastActions] = useState<SuggestedAction[]>([]);
  const [coachPrompt, setCoachPrompt] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaChunksRef = useRef<Blob[]>([]);

  async function loadThreads() {
    const result = await apiFetch<{ doubts: DoubtThread[] }>("/student/doubts");
    setThreads(result.doubts);
    setLoadError("");
    if (!activeThreadId && result.doubts[0]) {
      setThreadId(result.doubts[0]._id);
    }
  }

  useEffect(() => {
    if (status === "authenticated") {
      void loadThreads().catch((loadThreadsError) => {
        setThreads([]);
        setLoadError(loadThreadsError instanceof Error ? loadThreadsError.message : "Unable to load learning threads.");
      });
    }
  }, [status]);

  const activeThread = useMemo(
    () => threads.find((thread) => thread._id === activeThreadId) ?? threads[0] ?? null,
    [activeThreadId, threads]
  );
  const imageDoubtUploadsEnabled = features?.imageDoubtUploadsEnabled ?? true;
  const voiceDoubtUploadsEnabled = features?.voiceDoubtUploadsEnabled ?? true;

  async function toggleRecording() {
    if (recording && mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setRecording(false);
      return;
    }

    if (typeof window === "undefined" || !navigator.mediaDevices || typeof MediaRecorder === "undefined") {
      setCoachPrompt("Voice recording is not supported in this browser. You can still upload an audio file from your device.");
      return;
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream);
    mediaChunksRef.current = [];
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        mediaChunksRef.current.push(event.data);
      }
    };
    mediaRecorder.onstop = () => {
      const blob = new Blob(mediaChunksRef.current, { type: "audio/webm" });
      setVoiceBlob(blob);
      stream.getTracks().forEach((track) => track.stop());
    };

    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start();
    setRecording(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user?.class || !question.trim()) {
      return;
    }

    setSubmitting(true);
    try {
      let uploadedAttachmentAssetId = attachmentAssetId;
      let transcript = voiceTranscript;

      if (selectedImage && imageDoubtUploadsEnabled) {
        const upload = await uploadFile<UploadAssetSummary>("/uploads/doubt-image", selectedImage);
        uploadedAttachmentAssetId = upload.assetId;
        setAttachmentAsset(upload.assetId, upload.downloadUrl);
      }

      if ((voiceBlob || selectedAudioFile) && voiceDoubtUploadsEnabled) {
        const file =
          selectedAudioFile ?? new File([voiceBlob as Blob], "voice-note.webm", { type: voiceBlob?.type || "audio/webm" });
        const upload = await uploadFile<UploadAssetSummary>("/uploads/voice", file);
        transcript = upload.transcript ?? transcript;
        if (!uploadedAttachmentAssetId) {
          uploadedAttachmentAssetId = upload.assetId;
          setAttachmentAsset(upload.assetId, upload.downloadUrl);
        }
      }

      const result = await apiFetch<{
        threadId: string;
        guidedReply: string;
        followUpPrompt: string;
        suggestedActions: SuggestedAction[];
      }>("/ask-doubt", {
        method: "POST",
        body: JSON.stringify({
          question,
          studentClass: user.class,
          subject,
          mode,
          threadId: activeThread?._id,
          attachmentAssetId: uploadedAttachmentAssetId,
          voiceTranscript: transcript
        })
      });

      setThreadId(result.threadId);
      setLastActions(result.suggestedActions);
      setCoachPrompt(result.followUpPrompt);
      setQuestion("");
      setSelectedImage(null);
      setSelectedAudioFile(null);
      setVoiceBlob(null);
      setVoiceTranscript("");
      setAttachmentAsset(null, null);
      await loadThreads();
    } finally {
      setSubmitting(false);
    }
  }

  if (!user || status === "loading" || status === "idle") {
    return <LoadingPanel label="Opening AI teacher..." />;
  }

  if (status === "error") {
    return (
      <LoadFailurePanel
        title="Student access could not be verified"
        message={error || "The AI teacher could not confirm your current session."}
        onRetry={() => window.location.reload()}
      />
    );
  }

  return (
    <DashboardLayout
      title="AI teacher studio"
      subtitle="Guided teaching built to ask, simplify, and coach before revealing the answer. If live cloud AI is unavailable, the learning flow falls back safely."
    >
      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <SectionCard title="Learning threads" eyebrow="Student history">
          {loadError ? (
            <LoadFailurePanel message={loadError} onRetry={() => void loadThreads()} />
          ) : (
            <div className="space-y-3">
              {threads.map((thread) => (
                <button
                  key={thread._id}
                  className={`w-full rounded-[1.2rem] border p-4 text-left ${activeThread?._id === thread._id ? "border-[var(--accent)] bg-[rgba(212,175,55,0.08)]" : "border-soft"}`}
                  onClick={() => setThreadId(thread._id)}
                  type="button"
                >
                  <p className="font-semibold">{thread.subject}</p>
                  <p className="mt-1 text-sm text-muted">{thread.question}</p>
                </button>
              ))}
            </div>
          )}

          <div className="mt-6">
            <BrandSceneSurface
              sceneUrl={process.env.NEXT_PUBLIC_STUDENT_SCENE_URL}
              heightClassName="h-[220px]"
              eyebrow="Learning atmosphere"
              title="Branded visual companion"
              caption="This surface stays polished with no paid embed. You can still connect an optional hosted scene later if you want richer visual explainers."
            />
          </div>
        </SectionCard>

        <SectionCard title="Guided conversation" eyebrow="Teacher-first AI">
          <div className="rounded-[1.5rem] border border-soft bg-surface-strong p-4">
            <div className="space-y-4">
              {activeThread?.messages.length ? (
                activeThread.messages.map((message, index) => (
                  <div
                    key={`${message.createdAt}-${index}`}
                    className={`max-w-[85%] rounded-[1.4rem] px-4 py-3 text-sm leading-7 ${message.role === "assistant" ? "bg-[rgba(15,61,46,0.08)] text-[var(--text)]" : "ml-auto bg-[rgba(212,175,55,0.16)] text-[var(--text)]"}`}
                  >
                    {message.content}
                  </div>
                ))
              ) : (
                <div className="rounded-[1.4rem] border border-dashed border-soft p-5 text-sm text-muted">
                  Ask your first doubt. The AI teacher will guide your thinking instead of jumping straight to the answer.
                </div>
              )}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            {modes.map((item) => (
              <button
                key={item.value}
                className={`rounded-full border px-4 py-2 text-sm ${mode === item.value ? "border-[var(--accent)] text-[var(--accent)]" : "border-soft"}`}
                onClick={() => setMode(item.value)}
                type="button"
              >
                {item.label}
              </button>
            ))}
          </div>

          {lastActions.length ? (
            <div className="mt-4 flex flex-wrap gap-3">
              {lastActions.map((action) => (
                <button
                  key={action.mode}
                  className="rounded-full bg-[rgba(15,61,46,0.08)] px-3 py-2 text-xs"
                  onClick={() => setMode(action.mode)}
                  type="button"
                >
                  {action.label}
                </button>
              ))}
            </div>
          ) : null}

          {coachPrompt ? (
            <div className="mt-4 rounded-[1.2rem] border border-soft bg-surface-strong px-4 py-3 text-sm text-muted">
              <span className="font-medium text-[var(--text)]">Teacher prompt:</span> {coachPrompt}
            </div>
          ) : null}

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-[180px_1fr]">
              <input
                className="rounded-[1.2rem] border border-soft bg-surface-strong px-4 py-3 outline-none"
                onChange={(event) => setSubject(event.target.value)}
                placeholder="Subject"
                value={subject}
              />
              <textarea
                className="min-h-[140px] rounded-[1.2rem] border border-soft bg-surface-strong px-4 py-3 outline-none"
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="Describe where you got stuck. The AI teacher will guide you step by step."
                value={question}
              />
            </div>

            <div className="flex flex-wrap gap-3">
              {imageDoubtUploadsEnabled ? (
                <label className="rounded-full border border-soft px-4 py-2 text-sm">
                  <span className="flex cursor-pointer items-center gap-2">
                    <ImagePlus size={16} />
                    {selectedImage ? selectedImage.name : "Attach image"}
                  </span>
                  <input
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => setSelectedImage(event.target.files?.[0] ?? null)}
                    type="file"
                  />
                </label>
              ) : null}

              {voiceDoubtUploadsEnabled ? (
                <>
                  <label className="rounded-full border border-soft px-4 py-2 text-sm">
                    <span className="flex cursor-pointer items-center gap-2">
                      <Mic size={16} />
                      {selectedAudioFile ? selectedAudioFile.name : "Upload audio"}
                    </span>
                    <input
                      accept="audio/*"
                      className="hidden"
                      onChange={(event) => setSelectedAudioFile(event.target.files?.[0] ?? null)}
                      type="file"
                    />
                  </label>

                  <button
                    className={`rounded-full border px-4 py-2 text-sm ${recording ? "border-rose-500 text-rose-600" : "border-soft"}`}
                    onClick={() => void toggleRecording()}
                    type="button"
                  >
                    <span className="flex items-center gap-2">
                      <Mic size={16} />
                      {recording ? "Stop recording" : voiceBlob ? "Voice note ready" : "Record voice"}
                    </span>
                  </button>

                  {voiceBlob || selectedAudioFile ? (
                    <button
                      className="rounded-full border border-soft px-4 py-2 text-sm"
                      onClick={() => {
                        setSelectedAudioFile(null);
                        setVoiceBlob(null);
                        setVoiceTranscript("");
                        setAttachmentAsset(null, null);
                      }}
                      type="button"
                    >
                      <span className="flex items-center gap-2">
                        <Undo2 size={16} />
                        Clear voice
                      </span>
                    </button>
                  ) : null}
                </>
              ) : null}
            </div>

            {!imageDoubtUploadsEnabled || !voiceDoubtUploadsEnabled ? (
              <div className="rounded-[1.2rem] border border-soft bg-surface-strong px-4 py-3 text-sm text-muted">
                {imageDoubtUploadsEnabled && !voiceDoubtUploadsEnabled
                  ? "Voice uploads are currently disabled for this deployment."
                  : !imageDoubtUploadsEnabled && voiceDoubtUploadsEnabled
                    ? "Image uploads are currently disabled for this deployment."
                    : "Image and voice uploads are currently disabled for this deployment."}
              </div>
            ) : null}

            {attachmentDownloadUrl ? (
              <div className="rounded-[1.2rem] border border-soft bg-surface-strong px-4 py-3 text-sm text-muted">
                Attachment ready for the doubt thread. It will stay protected behind your signed-in session.
              </div>
            ) : null}

            {voiceTranscript ? (
              <div className="rounded-[1.2rem] border border-soft bg-surface-strong px-4 py-3 text-sm text-muted">
                <span className="flex items-center gap-2">
                  <Sparkle size={16} />
                  Transcript: {voiceTranscript}
                </span>
              </div>
            ) : null}

            <button
              className="rounded-full bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white"
              disabled={submitting}
              type="submit"
            >
              <span className="flex items-center gap-2">
                <SendHorizonal size={16} />
                {submitting ? "Guiding..." : "Send to AI teacher"}
              </span>
            </button>
          </form>
        </SectionCard>
      </div>
    </DashboardLayout>
  );
}
