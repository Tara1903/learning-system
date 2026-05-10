import { create } from "zustand";

import { ApiClientError, apiFetch } from "@/utils/api";
import type { AppFeatures, AuthSessionPayload, CurrentUser } from "@/utils/types";

type AuthStatus = "idle" | "loading" | "authenticated" | "anonymous" | "error";

interface AuthStore {
  user: CurrentUser | null;
  features: AppFeatures | null;
  status: AuthStatus;
  error: string | null;
  sessionMessage: string | null;
  bootstrap: () => Promise<CurrentUser | null>;
  login: (email: string, password: string) => Promise<CurrentUser>;
  logout: () => Promise<void>;
  setUser: (user: CurrentUser | null) => void;
  handleSessionExpired: (message?: string) => void;
  clearSessionMessage: () => void;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  features: null,
  status: "idle",
  error: null,
  sessionMessage: null,
  setUser: (user) =>
    set({
      user,
      features: user ? get().features : null,
      status: user ? "authenticated" : "anonymous",
      error: null
    }),
  bootstrap: async () => {
    const currentStatus = get().status;
    if (currentStatus === "loading") {
      return get().user;
    }

    set({ status: "loading", error: null });
    try {
      const result = await apiFetch<AuthSessionPayload>("/me");
      set({ user: result.user, features: result.features, status: "authenticated", error: null });
      return result.user;
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 401) {
        set({ user: null, features: null, status: "anonymous", error: null });
        return null;
      }

      set({
        user: null,
        features: null,
        status: "error",
        error: error instanceof Error ? error.message : "Unable to verify your session right now."
      });
      return null;
    }
  },
  login: async (email, password) => {
    set({ status: "loading", error: null, sessionMessage: null });
    try {
      const result = await apiFetch<AuthSessionPayload>("/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
      set({ user: result.user, features: result.features, status: "authenticated", error: null });
      return result.user;
    } catch (error) {
      set({
        user: null,
        features: null,
        status: "anonymous",
        error: error instanceof Error ? error.message : "Login failed."
      });
      throw error;
    }
  },
  logout: async () => {
    try {
      await apiFetch("/logout", { method: "POST" });
    } finally {
      set({ user: null, features: null, status: "anonymous", error: null, sessionMessage: null });
    }
  },
  handleSessionExpired: (message) =>
    set({
      user: null,
      features: null,
      status: "anonymous",
      error: null,
      sessionMessage: message || "Your session expired. Please sign in again."
    }),
  clearSessionMessage: () => set({ sessionMessage: null })
}));
