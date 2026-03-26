import React, { Component } from 'react';

type ErrorBoundaryState = {
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
};

type ErrorBoundaryProps = {
  children?: React.ReactNode;
};

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null, errorInfo: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Keep a breadcrumb in the console for debugging; UI stays user-friendly.
    console.error('Flow Reader crashed:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="min-h-[100dvh] bg-app-bg text-text-primary flex items-center justify-center p-6">
        <div className="w-full max-w-xl rounded-2xl bg-panel-bg border border-text-primary/10 shadow-2xl p-6 sm:p-7">
          <h1 className="font-header text-2xl font-bold">Something went wrong</h1>
          <p className="mt-2 text-text-secondary text-sm">
            Flow Reader hit an unexpected error. Your data is still stored locally in your browser.
          </p>

          <div className="mt-5 flex gap-2 justify-end">
            <button
              type="button"
              onClick={this.handleReload}
              className="px-4 py-2 rounded-lg text-sm font-bold bg-accent-red text-white shadow-glow hover:bg-accent-red/90 transition-colors"
            >
              Reload
            </button>
          </div>

          {/* Keep details available for devs without overwhelming normal users. */}
          <details className="mt-5 text-xs text-text-secondary/80">
            <summary className="cursor-pointer select-none">Error details</summary>
            <pre className="mt-2 whitespace-pre-wrap break-words bg-black/20 border border-text-primary/10 rounded-lg p-3">
              {String(this.state.error?.message || this.state.error)}
            </pre>
          </details>
        </div>
      </div>
    );
  }
}
