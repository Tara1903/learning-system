import type { ErrorInfo, PropsWithChildren, ReactNode } from "react";
import { Component } from "react";

interface AppErrorBoundaryProps extends PropsWithChildren {
  fallback?: ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = {
    hasError: false
  };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("Application render failed.", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="min-h-screen px-4 py-8">
            <div className="app-shell-card mx-auto max-w-3xl rounded-[2rem] p-8">
              <p className="text-xs uppercase tracking-[0.24em] text-muted">Adhyayan status</p>
              <h1 className="heading-serif mt-4 text-3xl">Something interrupted the interface</h1>
              <p className="mt-4 text-sm leading-7 text-muted">
                Refresh the page to try again. If this keeps happening, check the backend logs and browser console for the request that failed.
              </p>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
