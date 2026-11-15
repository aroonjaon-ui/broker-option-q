import { Component, type ErrorInfo, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

interface BoundaryState {
  error: Error | null;
}

function CrashReport({ error, onReload }: { error: Error; onReload: () => void }) {
  return (
    <div className="min-h-screen bg-[#0B1220] px-6 py-16 text-slate-200">
      <div className="mx-auto max-w-2xl">
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-400">
          Xena Broker
        </div>
        <h1 className="mt-2 text-xl font-bold text-white">Something went wrong while loading</h1>
        <p className="mt-2 text-sm text-slate-400">
          The page hit an unexpected error. Reload to try again — if it keeps happening, send this
          message to support.
        </p>
        <pre className="mt-5 overflow-auto rounded-xl border border-white/10 bg-black/40 p-4 text-[12px] leading-relaxed text-rose-200 whitespace-pre-wrap break-words">
          {error.stack || `${error.name}: ${error.message}`}
        </pre>
        <button
          type="button"
          onClick={onReload}
          className="mt-5 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
        >
          Reload
        </button>
      </div>
    </div>
  );
}

class ErrorBoundary extends Component<{ children: ReactNode }, BoundaryState> {
  state: BoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled render error:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <CrashReport error={this.state.error} onReload={() => window.location.reload()} />
      );
    }
    return this.props.children;
  }
}

const container = document.getElementById('root');

if (container) {
  createRoot(container).render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}
