import GraphStudioVisualizer from "./components/visualizers/Graphs/GraphStudioVisualizer";
import { ThemeProvider } from "./context/ThemeContext";
import NavBar from "./components/NavBar";

function App() {
  return (
    <ThemeProvider>
      <div className="h-screen w-screen overflow-hidden bg-surface font-inter text-on-surface dark:bg-dark-surface dark:text-dark-on-surface">
        <NavBar />
        <GraphStudioVisualizer snapshot={{}} />
      </div>
    </ThemeProvider>
  );
}
export default App;
