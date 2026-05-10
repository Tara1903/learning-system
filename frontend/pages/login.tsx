import Link from "next/link";
import { AlertCircle, LockKeyhole, Mail } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useRouter } from "next/router";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { BrandPanel } from "@/components/BrandPanel";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";
import { useAuthStore } from "@/store/auth-store";
import { routeForRole } from "@/utils/routes";

export default function LoginPage() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const { user, status, login, error } = useAuth();
  const sessionMessage = useAuthStore((state) => state.sessionMessage);
  const clearSessionMessage = useAuthStore((state) => state.clearSessionMessage);
  const [form, setForm] = useState({ email: "", password: "" });
  const [errorMessage, setErrorMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const routeMessage = useMemo(() => {
    if (router.query.reset === "success") {
      return "Password reset complete. Sign in with your new password.";
    }

    if (router.query.setup === "success") {
      return "Password setup complete. Your session is now active.";
    }

    return "";
  }, [router.query.reset, router.query.setup]);

  useEffect(() => {
    if (status === "authenticated" && user) {
      void router.replace(routeForRole(user.role));
    }
  }, [router, status, user]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setErrorMessage("");

    try {
      const loggedInUser = await login(form.email, form.password);
      clearSessionMessage();
      void router.push(routeForRole(loggedInUser.role));
    } catch (submitError) {
      setErrorMessage(submitError instanceof Error ? submitError.message : "Login failed.");
    } finally {
      setSubmitting(false);
    }
  }

  const bannerMessage = errorMessage || error || sessionMessage || routeMessage;

  return (
    <div className="min-h-screen px-4 py-6 md:px-8">
      <div className="mx-auto flex max-w-[1500px] justify-end pb-4">
        <ThemeToggle />
      </div>

      <div className="mx-auto grid max-w-[1500px] gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <BrandPanel />

        <motion.div
          className="app-shell-card rounded-[2rem] p-6 md:p-8"
          initial={reduceMotion ? false : { opacity: 0, x: 24 }}
          animate={reduceMotion ? undefined : { opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
        >
          <p className="text-xs uppercase tracking-[0.28em] text-muted">Institution access only</p>
          <h2 className="heading-serif mt-4 text-4xl">Secure sign in</h2>
          <p className="mt-4 max-w-md text-sm leading-7 text-muted">
            No public signup is available. Accounts are provisioned by the institute administrator through invite-based setup.
          </p>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <label className="block">
              <span className="mb-2 block text-sm font-medium">Institute email</span>
              <span className="flex items-center gap-3 rounded-[1.4rem] border border-soft bg-surface-strong px-4 py-3">
                <Mail size={18} className="text-muted" />
                <input
                  className="w-full bg-transparent outline-none"
                  onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                  placeholder="admin@adhyayan.local"
                  type="email"
                  value={form.email}
                />
              </span>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium">Password</span>
              <span className="flex items-center gap-3 rounded-[1.4rem] border border-soft bg-surface-strong px-4 py-3">
                <LockKeyhole size={18} className="text-muted" />
                <input
                  className="w-full bg-transparent outline-none"
                  onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                  placeholder="Enter your password"
                  type="password"
                  value={form.password}
                />
              </span>
            </label>

            {bannerMessage ? (
              <div className="rounded-[1.4rem] border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-700">
                <span className="flex items-center gap-2">
                  <AlertCircle size={16} />
                  {bannerMessage}
                </span>
              </div>
            ) : null}

            <button
              className="w-full rounded-[1.4rem] bg-[var(--primary)] px-4 py-4 text-sm font-semibold text-white transition hover:-translate-y-0.5"
              disabled={submitting}
              type="submit"
            >
              {submitting ? "Signing in..." : "Enter Adhyayan"}
            </button>
          </form>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
            <span>Need to activate an account or recover access?</span>
            <Link className="font-medium text-[var(--primary)]" href="/forgot-password">
              Forgot password
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
