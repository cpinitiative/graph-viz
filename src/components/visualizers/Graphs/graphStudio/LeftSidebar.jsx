/* eslint-disable react/prop-types */

const LeftSidebar = ({
  mode,
  setMode,
  routing,
  setRouting,
  snapEnabled,
  setSnapEnabled,
  showGrid,
  setShowGrid,
  lockCanvas,
  setLockCanvas,
  onAddNode,
  onDrawEdge,
  drawFrom,
  onAutoLayout,
  onOpenParser,
  onExportText,
  onExportVideo,
  onOpenScript,
  selectedCount,
  onApplyPreset,
  /* HUD controls */ currentFrame,
  totalFrames,
  onPlay,
  isPlaying,
  onCenterView,
  zoomPercent,
  onZoomIn,
  onZoomOut,
}) => {
  return (
    <div className="h-full bg-surface-container-low p-6 overflow-auto flex flex-col gap-6 text-sm dark:bg-dark-surface">
      {" "}
      {/* Tools Section */}{" "}
      <div className="space-y-3">
        {" "}
        <div className="text-xs text-on-surface uppercase tracking-wider font-manrope font-semibold dark:text-dark-on-surface">
          Tools
        </div>{" "}
        <div className="flex bg-surface-container rounded-md p-1 dark:bg-dark-surface-container">
          {" "}
          {["select", "pan", "draw"].map((item) => (
            <button
              key={item}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md capitalize transition-colors ${mode === item ? "bg-primary text-on-primary dark:bg-blue-800 dark:text-dark-on-primary" : "text-on-surface hover:text-on-surface dark:text-dark-on-surface"}`}
              onClick={() => setMode(item)}
            >
              {" "}
              {item}{" "}
            </button>
          ))}{" "}
        </div>{" "}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            className="py-2 bg-surface-container hover:bg-surface-container-high rounded-md text-xs font-medium text-on-surface transition-colors dark:bg-dark-surface-container dark:hover:bg-dark-surface-container-high dark:text-dark-on-surface"
            onClick={onAddNode}
          >
            Add Node
          </button>
          <button
            type="button"
            className={`py-2 rounded-md text-xs font-medium transition-colors ${
              mode === "draw"
                ? "bg-primary text-on-primary dark:bg-dark-primary dark:text-dark-on-primary"
                : "bg-surface-container hover:bg-surface-container-high text-on-surface dark:bg-dark-surface-container dark:hover:bg-dark-surface-container-high dark:text-dark-on-surface"
            }`}
            onClick={onDrawEdge}
          >
            Draw Edge
          </button>
        </div>
        {mode === "draw" && (
          <p className="text-[10px] text-outline leading-snug dark:text-dark-outline">
            {drawFrom !== null && drawFrom !== undefined
              ? `Source: node ${drawFrom}. Click the target node.`
              : "Click the source node, then the target node. Select two nodes first to connect them instantly."}
          </p>
        )}
      </div>{" "}
      {/* View Controls */}{" "}
      <div className="space-y-3">
        {" "}
        <div className="text-xs text-on-surface uppercase tracking-wider font-manrope font-semibold dark:text-dark-on-surface">
          View
        </div>{" "}
        <div className="flex items-center justify-between bg-surface-container rounded-md p-2 dark:bg-dark-surface-container">
          {" "}
          <button
            className="p-1.5 text-on-surface hover: rounded-md hover:bg-surface-container-high transition-colors dark:text-dark-on-surface dark:hover:bg-dark-surface-container-high"
            onClick={onCenterView}
            title="Center View"
          >
            {" "}
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 3h6v6H3z" />
              <path d="M15 3h6v6h-6z" />
              <path d="M15 15h6v6h-6z" />
              <path d="M3 15h6v6H3z" />
            </svg>{" "}
          </button>{" "}
          <div className="flex items-center gap-2">
            {" "}
            <button
              className="p-1.5 text-on-surface hover: rounded-md hover:bg-surface-container-high transition-colors dark:text-dark-on-surface dark:hover:bg-dark-surface-container-high"
              onClick={onZoomOut}
            >
              {" "}
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>{" "}
            </button>{" "}
            <span className="text-xs font-medium text-on-surface w-10 text-center dark:text-dark-on-surface">
              {zoomPercent}%
            </span>{" "}
            <button
              className="p-1.5 text-on-surface hover: rounded-md hover:bg-surface-container-high transition-colors dark:text-dark-on-surface dark:hover:bg-dark-surface-container-high"
              onClick={onZoomIn}
            >
              {" "}
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>{" "}
            </button>{" "}
          </div>{" "}
        </div>{" "}
        <div className="flex items-center gap-2">
          {" "}
          <button
            className={`flex-1 py-2 rounded-md text-xs font-semibold transition-colors flex items-center justify-center gap-2 ${isPlaying ? "bg-surface-container-high text-primary hover:bg-surface-container-high dark:bg-dark-surface-container-high dark:text-dark-primary" : "bg-primary text-on-primary hover:bg-blue-700 dark:bg-blue-800 dark:text-dark-on-primary"}`}
            onClick={onPlay}
          >
            {" "}
            {isPlaying ? (
              <>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <rect x="6" y="4" width="4" height="16" />
                  <rect x="14" y="4" width="4" height="16" />
                </svg>{" "}
                Stop
              </>
            ) : (
              <>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>{" "}
                Play
              </>
            )}{" "}
          </button>{" "}
          <div className="px-3 py-2 bg-surface-container rounded-md text-xs font-medium text-on-surface dark:bg-dark-surface-container dark:text-dark-on-surface">
            {" "}
            {currentFrame + 1} / {Math.max(1, totalFrames)}{" "}
          </div>{" "}
        </div>{" "}
      </div>{" "}
      {/* Canvas Settings */}{" "}
      <div className="space-y-3">
        {" "}
        <div className="text-xs text-on-surface uppercase tracking-wider font-manrope font-semibold dark:text-dark-on-surface">
          Canvas
        </div>{" "}
        <div className="space-y-2">
          {" "}
          <label className="flex items-center justify-between p-2 bg-surface-container rounded-md cursor-pointer hover:bg-surface-container-high transition-colors dark:bg-dark-surface-container dark:hover:bg-dark-surface-container-high">
            {" "}
            <span className="text-xs text-on-surface dark:text-dark-on-surface">
              Dot Grid
            </span>{" "}
            <input
              type="checkbox"
              checked={showGrid}
              onChange={(e) => setShowGrid(e.target.checked)}
              className="rounded bg-surface-container-high text-blue-800 focus:ring-blue-800 focus:ring-offset-slate-800"
            />{" "}
          </label>{" "}
          <label className="flex items-center justify-between p-2 bg-surface-container rounded-md cursor-pointer hover:bg-surface-container-high transition-colors dark:bg-dark-surface-container dark:hover:bg-dark-surface-container-high">
            {" "}
            <span className="text-xs text-on-surface dark:text-dark-on-surface">
              Snap to Grid
            </span>{" "}
            <input
              type="checkbox"
              checked={snapEnabled}
              onChange={(e) => setSnapEnabled(e.target.checked)}
              className="rounded bg-surface-container-high text-blue-800 focus:ring-blue-800 focus:ring-offset-slate-800"
            />{" "}
          </label>{" "}
          <label className="flex items-center justify-between p-2 bg-surface-container rounded-md cursor-pointer hover:bg-surface-container-high transition-colors dark:bg-dark-surface-container dark:hover:bg-dark-surface-container-high">
            {" "}
            <span className="text-xs text-on-surface dark:text-dark-on-surface">
              Lock Canvas
            </span>{" "}
            <input
              type="checkbox"
              checked={lockCanvas}
              onChange={(e) => setLockCanvas(e.target.checked)}
              className="rounded bg-surface-container-high text-blue-800 focus:ring-blue-800 focus:ring-offset-slate-800"
            />{" "}
          </label>{" "}
          <div className="p-2 bg-surface-container rounded-md dark:bg-dark-surface-container">
            {" "}
            <div className="text-xs text-on-surface mb-1.5 dark:text-dark-on-surface">
              Edge Routing
            </div>{" "}
            <select
              value={routing}
              onChange={(e) => setRouting(e.target.value)}
              className="w-full bg-white rounded-md text-xs text-on-surface py-1.5 px-2 border border-outline-variant/30 focus:outline-none focus:border-primary focus:ring-0 dark:bg-gray-800 dark:border-dark-outline-variant/30 dark:text-dark-on-surface"
            >
              {" "}
              <option value="straight">Straight</option>{" "}
              <option value="bezier">Bezier Avoid</option>{" "}
            </select>{" "}
          </div>{" "}
        </div>{" "}
      </div>{" "}
      {/* Data */}
      <div className="space-y-3">
        <div className="text-xs text-on-surface uppercase tracking-wider font-manrope font-semibold dark:text-dark-on-surface">
          Data
        </div>
        <div className="grid grid-cols-2 gap-1 p-2 bg-surface-container rounded-md dark:bg-dark-surface-container">
          <button
            className="py-1.5 bg-surface-container hover:bg-surface-container-high rounded text-[10px] text-on-surface transition-colors dark:bg-dark-surface-container dark:hover:bg-dark-surface-container-high dark:text-dark-on-surface"
            onClick={onOpenParser}
          >
            Import
          </button>
          <button
            className="py-1.5 bg-surface-container hover:bg-surface-container-high rounded text-[10px] text-on-surface transition-colors dark:bg-dark-surface-container dark:hover:bg-dark-surface-container-high dark:text-dark-on-surface"
            onClick={onExportText}
          >
            Export
          </button>
          <button
            className="py-1.5 bg-surface-container hover:bg-surface-container-high rounded text-[10px] text-on-surface transition-colors col-span-2 dark:bg-dark-surface-container dark:hover:bg-dark-surface-container-high dark:text-dark-on-surface"
            onClick={onExportVideo}
          >
            Export MP4
          </button>
        </div>
      </div>
      {/* Presets */}{" "}
      <div className="space-y-3">
        {" "}
        <div className="text-xs text-on-surface uppercase tracking-wider font-manrope font-semibold dark:text-dark-on-surface">
          Presets
        </div>{" "}
        <select
          onChange={(e) => {
            if (e.target.value) onApplyPreset(e.target.value);
            e.target.value = "";
          }}
          className="w-full bg-surface-container rounded-md text-xs text-on-surface py-2 px-3 border border-outline-variant/30 focus:outline-none focus:border-primary focus:ring-0 dark:bg-dark-surface-container dark:border-dark-outline-variant/30 dark:text-dark-on-surface"
        >
          {" "}
          <option value="">Load a preset...</option>{" "}
          <option value="bfs">BFS Preset</option>{" "}
          <option value="dfs">DFS Preset</option>{" "}
          <option value="dijkstra">Dijkstra Preset</option>{" "}
          <option value="multigraph">Multi-Edge / Loop</option>{" "}
        </select>{" "}
      </div>{" "}
      <div className="mt-auto pt-4">
        {" "}
        <div className="text-[10px] text-outline text-center dark:text-dark-outline">
          {" "}
          {selectedCount} item(s) selected{" "}
        </div>{" "}
      </div>{" "}
    </div>
  );
};
export default LeftSidebar;
