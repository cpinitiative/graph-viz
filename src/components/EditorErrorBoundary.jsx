import { Component } from 'react';

export default class EditorErrorBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main
        className="mx-auto max-w-lg p-8 text-slate-900 dark:text-slate-100"
        role="alert"
      >
        <h1 className="text-xl font-semibold">
          The editor could not display this project
        </h1>
        <p className="my-4">
          Reload to reopen your last saved draft. Download a project file
          regularly to keep a separate copy.
        </p>
        <button
          className="rounded bg-blue-700 px-4 py-2 text-white focus-visible:outline focus-visible:outline-2"
          onClick={() => window.location.reload()}
        >
          Reopen saved draft
        </button>
      </main>
    );
  }
}
