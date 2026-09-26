// Catches render errors in a section of the studio so one broken view never blanks the whole app.
import { Component, type ErrorInfo, type ReactNode } from "react";

type State = { error: Error | null };

export class ErrorBoundary extends Component<{ children: ReactNode; label: string }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(`[${this.props.label}]`, error, info.componentStack);
  }

  render(): ReactNode {
    if (!this.state.error) return this.props.children;
    return (
      <div className="rounded-2xl border border-bad/40 bg-bad/5 p-4 text-sm">
        <div className="font-semibold text-bad">The {this.props.label} hit an error.</div>
        <div className="mt-1 font-mono text-xs text-muted">{this.state.error.message}</div>
        <button className="mt-3 text-xs text-accent hover:underline" onClick={() => this.setState({ error: null })}>
          Try again
        </button>
      </div>
    );
  }
}
