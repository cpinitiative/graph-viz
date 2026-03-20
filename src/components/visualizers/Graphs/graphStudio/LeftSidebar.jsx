/* eslint-disable react/prop-types */
import React from "react";
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
    <div className="h-full bg-surface-container-low p-6 overflow-auto flex flex-col gap-6 text-sm">
      {" "}
      {/* Tools Section */}{" "}
      <div className="space-y-3">
        {" "}
        <div className="text-xs font-semibold text-on-surface uppercase tracking-wider font-manrope font-semibold">
          Tools
        </div>{" "}
        <div className="flex bg-surface-container rounded-md p-1">
          {" "}
          {["select", "pan", "draw"].map((item) => (
            <button
              key={item}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md capitalize transition-colors ${mode === item ? "bg-primary text-on-primary " : "text-on-surface hover:text-on-surface"}`}
              onClick={() => setMode(item)}
            >
              {" "}
              {item}{" "}
            </button>
          ))}{" "}
        </div>{" "}
      </div>{" "}
      {/* View Controls */}{" "}
      <div className="space-y-3">
        {" "}
        <div className="text-xs font-semibold text-on-surface uppercase tracking-wider font-manrope font-semibold">
          View
        </div>{" "}
        <div className="flex items-center justify-between bg-surface-container rounded-md p-2">
          {" "}
          <button
            className="p-1.5 text-on-surface hover: rounded-md hover:bg-surface-container-high transition-colors"
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
              className="p-1.5 text-on-surface hover: rounded-md hover:bg-surface-container-high transition-colors"
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
            <span className="text-xs font-medium text-on-surface w-10 text-center">
              {zoomPercent}%
            </span>{" "}
            <button
              className="p-1.5 text-on-surface hover: rounded-md hover:bg-surface-container-high transition-colors"
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
            className={`flex-1 py-2 rounded-md text-xs font-semibold transition-colors flex items-center justify-center gap-2 ${isPlaying ? "bg-surface-container-high text-primary hover:bg-surface-container-high" : "bg-primary text-on-primary hover:bg-blue-500"}`}
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
          <div className="px-3 py-2 bg-surface-container rounded-md text-xs font-medium text-on-surface">
            {" "}
            {currentFrame + 1} / {Math.max(1, totalFrames)}{" "}
          </div>{" "}
        </div>{" "}
      </div>{" "}
      {/* Canvas Settings */}{" "}
      <div className="space-y-3">
        {" "}
        <div className="text-xs font-semibold text-on-surface uppercase tracking-wider font-manrope font-semibold">
          Canvas
        </div>{" "}
        <div className="space-y-2">
          {" "}
          <label className="flex items-center justify-between p-2 bg-surface-container rounded-md cursor-pointer hover:bg-surface-container-high transition-colors">
            {" "}
            <span className="text-xs text-on-surface">Dot Grid</span>{" "}
            <input
              type="checkbox"
              checked={showGrid}
              onChange={(e) => setShowGrid(e.target.checked)}
              className="rounded bg-surface-container-high text-blue-500 focus:ring-blue-500 focus:ring-offset-slate-800"
            />{" "}
          </label>{" "}
          <label className="flex items-center justify-between p-2 bg-surface-container rounded-md cursor-pointer hover:bg-surface-container-high transition-colors">
            {" "}
            <span className="text-xs text-on-surface">Snap to Grid</span>{" "}
            <input
              type="checkbox"
              checked={snapEnabled}
              onChange={(e) => setSnapEnabled(e.target.checked)}
              className="rounded bg-surface-container-high text-blue-500 focus:ring-blue-500 focus:ring-offset-slate-800"
            />{" "}
          </label>{" "}
          <label className="flex items-center justify-between p-2 bg-surface-container rounded-md cursor-pointer hover:bg-surface-container-high transition-colors">
            {" "}
            <span className="text-xs text-on-surface">Lock Canvas</span>{" "}
            <input
              type="checkbox"
              checked={lockCanvas}
              onChange={(e) => setLockCanvas(e.target.checked)}
              className="rounded bg-surface-container-high text-blue-500 focus:ring-blue-500 focus:ring-offset-slate-800"
            />{" "}
          </label>{" "}
          <div className="p-2 bg-surface-container rounded-md">
            {" "}
            <div className="text-xs text-on-surface mb-1.5">
              Edge Routing
            </div>{" "}
            <select
              value={routing}
              onChange={(e) => setRouting(e.target.value)}
              className="w-full bg-white rounded-md text-xs text-on-surface py-1.5 px-2 focus:outline-none focus:-primary"
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
        <div className="text-xs font-semibold text-on-surface uppercase tracking-wider font-manrope font-semibold">Data</div>
        <div className="grid grid-cols-2 gap-1 p-2 bg-surface-container rounded-md">
            <button className="py-1.5 bg-surface-container hover:bg-surface-container-high rounded text-[10px] text-on-surface transition-colors" onClick={onOpenParser}>Import</button>
            <button className="py-1.5 bg-surface-container hover:bg-surface-container-high rounded text-[10px] text-on-surface transition-colors" onClick={onExportText}>Export</button>
            <button className="py-1.5 bg-surface-container hover:bg-surface-container-high rounded text-[10px] text-on-surface transition-colors col-span-2" onClick={onExportVideo}>Export MP4</button>
        </div>
      </div>
{/* Presets */}{" "}
      <div className="space-y-3">
        {" "}
        <div className="text-xs font-semibold text-on-surface uppercase tracking-wider font-manrope font-semibold">
          Presets
        </div>{" "}
        <select
          onChange={(e) => {
            if (e.target.value) onApplyPreset(e.target.value);
            e.target.value = "";
          }}
          className="w-full bg-surface-container rounded-md text-xs text-on-surface py-2 px-3 focus:outline-none focus:-primary"
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
        <div className="text-[10px] text-outline text-center">
          {" "}
          {selectedCount} item(s) selected{" "}
        </div>{" "}
      </div>{" "}
    </div>
  );
};
export default LeftSidebar;
