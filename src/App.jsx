import GraphStudioVisualizer from "./components/visualizers/Graphs/GraphStudioVisualizer";
import { ThemeProvider } from "./context/ThemeContext";
import ThemeToggle from "./components/ThemeToggle";

function App() {
  return (
    <ThemeProvider>
      <div className="h-screen w-screen overflow-hidden bg-surface font-inter text-on-surface dark:bg-dark-surface dark:text-dark-on-surface">
        <div className="absolute top-4 right-4 z-50">
          <ThemeToggle />
        </div>
        <GraphStudioVisualizer snapshot={{}} />
      </div>
    </ThemeProvider>
  );
}
export default App;
