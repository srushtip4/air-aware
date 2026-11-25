import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('AirAware UI ErrorBoundary caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main
          role="main"
          className="min-h-[60vh] flex items-center justify-center p-6 bg-[#F4F7F6] dark:bg-[#090F12]"
        >
          <div className="max-w-md w-full bg-white dark:bg-[#111A1E] p-8 rounded-2xl border border-[#D5DFDC] dark:border-[#22323A] text-center">
            <div className="w-12 h-12 bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 rounded-xl flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6" aria-hidden="true" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
              Something went wrong
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
              {this.state.error?.message ||
                'An unexpected rendering error occurred in the AirAware interface.'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-semibold rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 dark:focus-visible:ring-teal-400"
            >
              <RefreshCw className="w-4 h-4" aria-hidden="true" />
              Reload Application
            </button>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}
