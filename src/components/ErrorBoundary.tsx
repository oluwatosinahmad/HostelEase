import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  title?: string;
  message?: string;
  isolated?: boolean;
  onRetry?: () => void;
  onReturnHome?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Preserve full developer-side logging in console and attached telemetry
    console.error('[HostelEase Application Error]:', error, errorInfo);
  }

  private handleRetry = () => {
    if (this.props.onRetry) {
      this.setState({ hasError: false, error: null });
      this.props.onRetry();
      return;
    }
    this.setState({ hasError: false, error: null });
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  private handleReturnHome = () => {
    try {
      localStorage.setItem('hostel_ease_current_view', 'home');
    } catch {}
    this.setState({ hasError: false, error: null });

    if (this.props.onReturnHome) {
      this.props.onReturnHome();
      return;
    }

    if (typeof window !== 'undefined') {
      window.location.href = window.location.origin + window.location.pathname;
    }
  };

  public render() {
    if (this.state.hasError) {
      const {
        title = 'Something went wrong',
        message = "We couldn't load this page right now. Please try again in a moment.",
        isolated = false
      } = this.props;

      const content = (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full text-center space-y-5 shadow-xl transition-all animate-in fade-in duration-200">
          {/* Friendly Branded Icon */}
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-xs">
            <AlertCircle className="w-7 h-7" />
          </div>

          {/* User-Friendly Clean Messaging */}
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              {title}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-sm mx-auto">
              {message}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
            <button
              type="button"
              onClick={this.handleRetry}
              className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-95"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Try Again</span>
            </button>
            <button
              type="button"
              onClick={this.handleReturnHome}
              className="flex-1 py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer border border-slate-200/60 dark:border-slate-700/60 active:scale-95"
            >
              <Home className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Return Home</span>
            </button>
          </div>
        </div>
      );

      if (isolated) {
        return (
          <div className="py-12 px-4 flex items-center justify-center w-full">
            {content}
          </div>
        );
      }

      return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white flex items-center justify-center p-4">
          {content}
        </div>
      );
    }

    return this.props.children;
  }
}
