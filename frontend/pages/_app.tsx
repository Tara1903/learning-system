import type { AppProps } from "next/app";
import { useEffect } from "react";

import { AppErrorBoundary } from "@/components/AppErrorBoundary";
import { useThemeStore } from "@/store/theme-store";
import { useAuthStore } from "@/store/auth-store";
import { SESSION_EXPIRED_EVENT } from "@/utils/auth-events";
import "@/styles/globals.css";

export default function App({ Component, pageProps }: AppProps) {
  const initializeTheme = useThemeStore((state) => state.initialize);
  const handleSessionExpired = useAuthStore((state) => state.handleSessionExpired);

  useEffect(() => {
    initializeTheme();
  }, [initializeTheme]);

  useEffect(() => {
    function onSessionExpired(event: Event) {
      const detail =
        event instanceof CustomEvent
          ? (event.detail as { message?: string } | undefined)
          : undefined;
      handleSessionExpired(detail?.message);
    }

    window.addEventListener(SESSION_EXPIRED_EVENT, onSessionExpired as EventListener);

    return () => {
      window.removeEventListener(SESSION_EXPIRED_EVENT, onSessionExpired as EventListener);
    };
  }, [handleSessionExpired]);

  return (
    <AppErrorBoundary>
      <Component {...pageProps} />
    </AppErrorBoundary>
  );
}
