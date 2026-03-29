import React, { Component, type ReactNode,type ErrorInfo } from 'react';
import { AlertTriangle, Home, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode; 
}

interface State {
  hasError: boolean;
  error: Error | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      showDetails: false,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return {
      hasError: true,
      error: error,
      showDetails: false,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log the error to an error reporting service
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  toggleDetails = (): void => {
    this.setState((prevState) => ({
      showDetails: !prevState.showDetails,
    }));
  };

  handleReload = (): void => {
    window.location.reload();
  };

  handleGoHome = (): void => {
    window.location.href = '/login'; // As requested, though typically / or /dashboard
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // If a custom fallback is provided, render it instead
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="bg-gray-50 min-h-screen flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-xl p-6 sm:p-8 shadow-sm max-w-md w-full">
            <div className="text-center">
              <AlertTriangle className="w-16 h-16 text-red-400 mx-auto" />
              <h1 className="text-xl font-bold text-gray-900 mt-4">Something went wrong</h1>
              <p className="text-sm text-gray-500 mt-2">An unexpected error occurred.</p>
            </div>

            {this.state.error && (
              <div className="mt-6">
                <button
                  onClick={this.toggleDetails}
                  className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
                >
                  {this.state.showDetails ? "Hide error details" : "Show error details"}
                </button>
                {this.state.showDetails && (
                  <div className="mt-3">
                    <pre className="text-xs font-mono bg-gray-100 p-4 rounded-lg overflow-auto max-h-40 border border-gray-200">
                      {this.state.error.message}
                    </pre>
                  </div>
                )}
              </div>
            )}

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={this.handleReload}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors w-full sm:w-auto justify-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <RotateCcw className="w-4 h-4" />
                Reload page
              </button>
              <button
                onClick={this.handleGoHome}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg border border-gray-200 transition-colors w-full sm:w-auto justify-center focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2"
              >
                <Home className="w-4 h-4" />
                Go to login
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}