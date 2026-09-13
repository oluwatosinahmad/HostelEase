import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ShieldAlert, RefreshCw, Home, AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    // In production, send to error monitoring (e.g. Sentry / Datadog)
    console.error('[Hostel Ease Production ErrorBoundary]:', error, errorInfo);
  }

  private handleReset = () => {
    try {
      localStorage.setItem('hostel_ease_current_view', 'home');
    } catch {}
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = window.location.origin + window.location.pathname;
  };

  private handleReload = () => {
    try {
      localStorage.setItem('hostel_ease_current_view', 'home');
    } catch {}
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4 selection:bg-emerald-500 selection:text-white">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-lg w-full text-center space-y-6 shadow-2xl animate-fadeIn">
            
            {/* Header Icon */}
            <div className="w-16 h-16 rounded-3xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto shadow-lg">
              <ShieldAlert className="w-8 h-8" />
            </div>

            {/* Error Messages */}
            <div className="space-y-2">
              <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest bg-rose-500/10 px-3 py-1 rounded-full border border-rose-500/20">
                System Resilience Protection
              </span>
              <h2 className="text-xl font-black text-white">Something went wrong</h2>
              <p className="text-xs text-slate-400 leading-relaxed max-w-md mx-auto">
                Hostel Ease encountered an unexpected UI state. Your data, active bookings, and saved hostels remain safely stored.
              </p>
            </div>

            {/* Recovery Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={this.handleReload}
                className="flex-1 py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-900/40"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reload Page</span>
              </button>
              <button
                onClick={this.handleReset}
                className="flex-1 py-3 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer border border-slate-700"
              >
                <Home className="w-4 h-4 text-emerald-400" />
                <span>Return to Home</span>
              </button>
            </div>

            {/* Diagnostic Technical Details (Expandable) */}
            {this.state.error && (
              <details className="text-left bg-slate-950/80 border border-slate-800 rounded-2xl p-3 text-xs group">
                <summary className="cursor-pointer text-slate-400 hover:text-emerald-400 font-mono text-[11px] select-none flex items-center justify-between">
                  <span>Diagnostic Details & Stack Trace</span>
                  <span className="text-[10px] text-slate-500 group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <div className="mt-3 space-y-2 font-mono text-[11px] overflow-x-auto">
                  <div className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-800/40 text-rose-300 break-words">
                    <strong>Error:</strong> {this.state.error.name}: {this.state.error.message}
                  </div>
                  {this.state.errorInfo?.componentStack && (
                    <div className="p-2.5 rounded-xl bg-slate-900 text-slate-400 text-[10px] whitespace-pre-wrap max-h-40 overflow-y-auto">
                      {this.state.errorInfo.componentStack}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      const text = `Error: ${this.state.error?.toString()}\nComponent Stack:\n${this.state.errorInfo?.componentStack || 'N/A'}`;
                      navigator.clipboard?.writeText(text);
                      alert('Error details copied to clipboard!');
                    }}
                    className="w-full py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-sans font-semibold transition"
                  >
                    📋 Copy Error Details
                  </button>
                </div>
              </details>
            )}

            {/* Security Notice */}
            <div className="border-t border-slate-800/80 pt-4 text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              <span>Hostel Ease v1.0 • Protected by Escrow Shield & Automated Failover</span>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
