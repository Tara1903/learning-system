import Link from "next/link";
import { AlertCircle, Mail } from "lucide-react";
import { FormEvent, useState } from "react";


import { ThemeToggle } from "@/components/ThemeToggle";
import { apiFetch } from "@/utils/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [debugResetUrl, setDebugResetUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    setDebugResetUrl("");

    try {
      const result = await apiFetch<{ resetRequested: boolean; debugResetUrl?: string }>("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email })
      });
      setMessage("If the account exists, a password reset link has been prepared.");
      setDebugResetUrl(result.debugResetUrl ?? "");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to request a password reset.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col px-4 py-6 md:px-8">
      <div className="mx-auto flex w-full max-w-[1500px] justify-end pb-4">
        <ThemeToggle />
      </div>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center pb-12">
        <div className="mb-8 text-center">
          <h1 className="font-bold text-2xl tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] uppercase">
            ADHYAYAN BRILLIANT CLASSES
          </h1>
        </div>
        <div className="app-shell-card rounded-[2rem] p-6 md:p-8 w-full">
          <p className="text-xs uppercase tracking-[0.28em] text-muted">Recovery flow</p>
          <h1 className="heading-serif mt-4 text-4xl">Reset access</h1>
          <p className="mt-4 text-sm leading-7 text-muted">
            Enter the institutional email address associated with the account. The response stays privacy-safe even if the account does not exist.
          </p>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <label className="block">
              <span className="mb-2 block text-sm font-medium">Institute email</span>
              <span className="flex items-center gap-3 rounded-[1.4rem] border border-soft bg-surface-strong px-4 py-3">
                <Mail size={18} className="text-muted" />
                <input
                  className="w-full bg-transparent outline-none"
                  onChange={(event) => setEmail(event.target.value)}
                  type="email"
                  value={email}
                />
              </span>
            </label>

            {message ? (
              <div className="rounded-[1.4rem] border border-soft bg-surface-strong px-4 py-3 text-sm text-muted">
                <span className="flex items-center gap-2">
                  <AlertCircle size={16} />
                  {message}
                </span>
              </div>
            ) : null}

            {debugResetUrl ? (
              <div className="rounded-[1.4rem] border border-[rgba(212,175,55,0.25)] bg-[rgba(212,175,55,0.08)] px-4 py-3 text-sm text-[var(--text)]">
                Development reset link:
                <div className="mt-2 break-all text-[var(--primary)]">{debugResetUrl}</div>
              </div>
            ) : null}

            <button
              className="w-full rounded-[1.4rem] bg-[var(--primary)] px-4 py-4 text-sm font-semibold text-white"
              disabled={submitting}
              type="submit"
            >
              {submitting ? "Preparing reset..." : "Prepare reset link"}
            </button>
          </form>

          <div className="mt-6 text-sm text-muted">
            <Link className="font-medium text-[var(--primary)]" href="/login">
              Back to login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
