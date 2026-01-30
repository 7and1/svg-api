"use client";

import { Component, type ReactNode } from "react";
import { motion } from "framer-motion";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return <ErrorState error={this.state.error} />;
    }

    return this.props.children;
  }
}

export const ErrorState = ({
  error,
  onRetry,
  title = "Something went wrong",
  description = "We encountered an error while loading this content. Please try again.",
}: {
  error?: Error;
  onRetry?: () => void;
  title?: string;
  description?: string;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center rounded-2xl border border-red-200 bg-red-50/50 p-8 text-center dark:border-red-900/30 dark:bg-red-900/10"
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
        <svg
          className="h-8 w-8 text-red-600 dark:text-red-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>
      <h3 className="mt-4 font-display text-lg font-semibold text-ink dark:text-sand">
        {title}
      </h3>
      <p className="mt-2 max-w-sm text-sm text-slate">{description}</p>
      {error && process.env.NODE_ENV === "development" && (
        <pre className="mt-4 max-w-sm overflow-auto rounded-lg bg-red-100/50 p-3 text-left text-xs text-red-800 dark:bg-red-900/20 dark:text-red-300">
          {error.message}
        </pre>
      )}
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-6 rounded-full bg-ink px-5 py-2 text-sm font-semibold text-sand transition hover:bg-ink/90 dark:bg-teal dark:text-white dark:hover:bg-teal/90"
        >
          Try Again
        </button>
      )}
    </motion.div>
  );
};

// Empty state component
export const EmptyState = ({
  title = "No results found",
  description = "Try adjusting your search or filters to find what you are looking for.",
  icon,
  action,
}: {
  title?: string;
  description?: string;
  icon?: ReactNode;
  action?: { label: string; onClick: () => void };
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center justify-center py-16 text-center"
    >
      {icon || (
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-black/5 dark:bg-white/5">
          <svg
            className="h-10 w-10 text-slate/50"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      )}
      <h3 className="mt-6 font-display text-lg font-semibold text-ink dark:text-sand">
        {title}
      </h3>
      <p className="mt-2 max-w-sm text-sm text-slate">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-6 rounded-full border border-ink/20 px-5 py-2 text-sm font-semibold text-ink transition hover:border-ink/40 dark:border-white/20 dark:text-sand dark:hover:border-white/40"
        >
          {action.label}
        </button>
      )}
    </motion.div>
  );
};
