import GraphStudioVisualizer from "./components/visualizers/Graphs/GraphStudioVisualizer";
function App() {
  return (
    <div className="h-screen w-screen overflow-hidden bg-surface font-inter text-on-surface text-on-surface">
      {" "}
      <GraphStudioVisualizer snapshot={{}} />{" "}
    </div>
  );
}
export default App;
