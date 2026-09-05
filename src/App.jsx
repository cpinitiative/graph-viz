import { MotionConfig } from 'framer-motion';
import { GRAPH_STUDIO_BUILD } from './buildProvenance';
import EditorErrorBoundary from './components/EditorErrorBoundary';
import NavBar from './components/NavBar';
import GraphStudioVisualizer from './components/visualizers/Graphs/GraphStudioVisualizer';
import { ThemeProvider } from './context/ThemeProvider';

function App() {
  return (
    <ThemeProvider>
      <MotionConfig reducedMotion="user">
        <div className="flex h-dvh w-screen flex-col overflow-hidden bg-surface font-inter text-on-surface dark:bg-dark-surface dark:text-dark-on-surface">
          <NavBar />
          <main
            className="min-h-0 flex-1"
            data-testid="graph-studio-root"
            data-build-provenance="graph-studio"
            data-build-commit={GRAPH_STUDIO_BUILD.commitSha}
            data-build-timestamp={GRAPH_STUDIO_BUILD.buildTimestamp}
            data-build-environment={GRAPH_STUDIO_BUILD.environment}
          >
            <EditorErrorBoundary>
              <GraphStudioVisualizer snapshot={{}} />
            </EditorErrorBoundary>
          </main>
        </div>
      </MotionConfig>
    </ThemeProvider>
  );
}
export default App;
