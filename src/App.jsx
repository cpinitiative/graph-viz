import GraphStudioVisualizer from "./components/visualizers/Graphs/GraphStudioVisualizer";
import { ThemeProvider } from "./context/ThemeContext";
import NavBar from "./components/NavBar";

function App() {
  return (
    <ThemeProvider>
      <div className="flex h-screen w-screen flex-col overflow-hidden bg-surface font-inter text-on-surface dark:bg-dark-surface dark:text-dark-on-surface">
        <NavBar />
        <main className="min-h-0 flex-1">
          <GraphStudioVisualizer snapshot={{}} />
        </main>
      </div>
    </ThemeProvider>
  );
}
export default App;
