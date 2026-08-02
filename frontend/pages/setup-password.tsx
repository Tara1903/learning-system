import Link from "next/link";
import { AlertCircle, LockKeyhole } from "lucide-react";
import { useRouter } from "next/router";
import { FormEvent, useMemo, useState } from "react";


import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuthStore } from "@/store/auth-store";
import { apiFetch } from "@/utils/api";
import { routeForRole } from "@/utils/routes";
import type { CurrentUser } from "@/utils/types";

export default function SetupPasswordPage() {
  const router = useRouter();
  const setUser = useAuthStore((state) => state.setUser);
  const token = useMemo(() => {
    const raw = router.query.token;
    return typeof raw === "string" ? raw : "";
  }, [router.query.token]);
  const [form, setForm] = useState({ password: "", confirmPassword: "" });
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");

    try {
      const result = await apiFetch<{ user: CurrentUser }>("/auth/setup-password", {
        method: "POST",
        body: JSON.stringify({
          token,
          password: form.password,
          confirmPassword: form.confirmPassword
        })
      });
      setUser(result.user);
      void router.replace(routeForRole(result.user.role));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to complete password setup.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen px-4 py-6 md:px-8">
      <div className="mx-auto flex max-w-[1500px] justify-end pb-4">
        <ThemeToggle />
      </div>

      <div className="mx-auto flex max-w-md flex-col justify-center pt-8 md:pt-16">
        <div className="mb-8 text-center">
          <h1 className="font-bold text-2xl tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] uppercase">
            ADHYAYAN BRILLIANT CLASSES
          </h1>
        </div>
        <div className="app-shell-card rounded-[2rem] p-6 md:p-8 w-full">
          <p className="text-xs uppercase tracking-[0.28em] text-muted">Account activation</p>
          <h1 className="heading-serif mt-4 text-4xl">Set your password</h1>
          <p className="mt-4 text-sm leading-7 text-muted">
            Finish your invite setup to activate institutional access to Adhyayan Brilliant Classes.
          </p>

          {token ? (
            <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
              <label className="block">
                <span className="mb-2 block text-sm font-medium">New password</span>
                <span className="flex items-center gap-3 rounded-[1.4rem] border border-soft bg-surface-strong px-4 py-3">
                  <LockKeyhole size={18} className="text-muted" />
                  <input
                    className="w-full bg-transparent outline-none"
                    onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                    type="password"
                    value={form.password}
                  />
                </span>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium">Confirm password</span>
                <span className="flex items-center gap-3 rounded-[1.4rem] border border-soft bg-surface-strong px-4 py-3">
                  <LockKeyhole size={18} className="text-muted" />
                  <input
                    className="w-full bg-transparent outline-none"
                    onChange={(event) => setForm((current) => ({ ...current, confirmPassword: event.target.value }))}
                    type="password"
                    value={form.confirmPassword}
                  />
                </span>
              </label>

              {message ? (
                <div className="rounded-[1.4rem] border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-700">
                  <span className="flex items-center gap-2">
                    <AlertCircle size={16} />
                    {message}
                  </span>
                </div>
              ) : null}

              <button
                className="w-full rounded-[1.4rem] bg-[var(--primary)] px-4 py-4 text-sm font-semibold text-white"
                disabled={submitting}
                type="submit"
              >
                {submitting ? "Activating..." : "Activate account"}
              </button>
            </form>
          ) : (
            <div className="mt-8 rounded-[1.4rem] border border-soft px-4 py-4 text-sm text-muted">
              This invite link is missing a valid token. Ask your institute admin to generate a fresh account setup link.
            </div>
          )}

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
