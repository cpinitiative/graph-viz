/* eslint-disable react/prop-types */
import React from "react";
const PropertyPanel = ({
  selectedNode,
  selectedEdge,
  connectedEdges,
  connectedNodes,
  multiSelection,
  globalSettings,
  onUpdateNode,
  onUpdateEdge,
  onSelectEdge,
  onSelectNode,
  onApplyToSelection,
  onDeleteSelection,
  onUpdateGlobal,
}) => {
  if (multiSelection.length > 1) {
    return (
      <div className="h-full bg-surface-container-low p-4 space-y-6 overflow-y-auto text-sm">
        {" "}
        <div className="space-y-3">
          {" "}
          <div className="text-xs font-semibold text-on-surface uppercase tracking-wider font-manrope font-semibold">
            Selection
          </div>{" "}
          <p className="text-xs text-on-surface">
            {multiSelection.length} items selected
          </p>{" "}
          <div className="space-y-2">
            {" "}
            <button
              className="w-full py-2 px-3 bg-surface-container hover:bg-surface-container-high rounded-md text-xs text-on-surface transition-colors text-left"
              onClick={() => onApplyToSelection({ status: "visited" })}
            >
              Set visited
            </button>{" "}
            <button
              className="w-full py-2 px-3 bg-surface-container hover:bg-surface-container-high rounded-md text-xs text-on-surface transition-colors text-left"
              onClick={() => onApplyToSelection({ status: "active" })}
            >
              Set active
            </button>{" "}
            <button
              className="w-full py-2 px-3 bg-surface-container hover:bg-surface-container-high rounded-md text-xs text-on-surface transition-colors text-left"
              onClick={() => onApplyToSelection({ color: "#22c55e" })}
            >
              Color green
            </button>{" "}
            <button
              className="w-full py-2 px-3 bg-surface-container-high hover:bg-surface-container-highest text-primary text-primary rounded-md text-xs transition-colors text-left mt-4"
              onClick={onDeleteSelection}
            >
              Delete selected
            </button>{" "}
          </div>{" "}
        </div>{" "}
      </div>
    );
  }
  if (selectedNode) {
    const nodeColor = selectedNode.color ?? "";
    return (
      <div className="h-full bg-surface-container-low p-4 space-y-6 overflow-y-auto text-sm">
        {" "}
        <div className="space-y-3">
          {" "}
          <div className="text-xs font-semibold text-on-surface uppercase tracking-wider font-manrope font-semibold">
            Node Inspector
          </div>{" "}
          <p className="text-[10px] text-outline leading-tight">
            Label is shared across all frames. Status/color are per-frame.
          </p>{" "}
          <div className="space-y-4">
            {" "}
            <label className="block space-y-1.5">
              {" "}
              <span className="text-xs text-on-surface">Label</span>{" "}
              <input
                className="w-full bg-white text-xs text-on-surface focus:outline-none focus:-primary bg-surface-container-low border-b border-outline-variant/20 focus:outline-none focus:border-b-primary focus:ring-0 py-2 px-0 transition-colors"
                value={selectedNode.label ?? ""}
                onChange={(event) =>
                  onUpdateNode({ label: event.target.value })
                }
              />{" "}
            </label>{" "}
            <label className="block space-y-1.5">
              {" "}
              <span className="text-xs text-on-surface">Status</span>{" "}
              <select
                className="w-full bg-white text-xs text-on-surface focus:outline-none focus:-primary bg-surface-container-low border-b border-outline-variant/20 focus:outline-none focus:border-b-primary focus:ring-0 py-2 px-0 transition-colors"
                value={String(selectedNode.status ?? "default")}
                onChange={(event) =>
                  onUpdateNode({ status: event.target.value })
                }
              >
                {" "}
                <option value="default">Default</option>{" "}
                <option value="active">Active</option>{" "}
                <option value="queued">Queued</option>{" "}
                <option value="visited">Visited</option>{" "}
                <option value="discarded">Discarded</option>{" "}
              </select>{" "}
            </label>{" "}
            <label className="block space-y-1.5">
              {" "}
              <span className="text-xs text-on-surface">
                Highlight color
              </span>{" "}
              <div className="flex items-center gap-2">
                {" "}
                <input
                  type="color"
                  value={nodeColor.startsWith("#") ? nodeColor : "#3b82f6"}
                  onChange={(event) =>
                    onUpdateNode({ color: event.target.value })
                  }
                  className="w-8 h-8 rounded cursor-pointer -0 bg-transparent p-0"
                />{" "}
                <input
                  className="flex-1 bg-white text-xs text-on-surface focus:outline-none focus:-primary bg-surface-container-low border-b border-outline-variant/20 focus:outline-none focus:border-b-primary focus:ring-0 py-2 px-0 transition-colors"
                  value={nodeColor}
                  onChange={(event) =>
                    onUpdateNode({ color: event.target.value })
                  }
                  placeholder="#22c55e or blank"
                />{" "}
              </div>{" "}
            </label>{" "}
          </div>{" "}
        </div>{" "}
        <div className="space-y-3">
          {" "}
          <div className="text-xs font-semibold text-on-surface uppercase tracking-wider font-manrope font-semibold">
            Connected Edges
          </div>{" "}
          {connectedEdges?.length ? (
            <div className="space-y-1.5">
              {" "}
              {connectedEdges.map((edge) => {
                const label = edge.label ? ` • w:${edge.label}` : "";
                const direction = edge.directed ? "→" : "—";
                return (
                  <button
                    key={edge.id}
                    className="w-full py-1.5 px-2 bg-surface-container hover:bg-surface-container-high rounded text-xs text-on-surface transition-colors text-left truncate"
                    onClick={() => onSelectEdge?.(edge.id)}
                  >
                    {" "}
                    {edge.id}: {edge.from} {direction} {edge.to}
                    {label}{" "}
                  </button>
                );
              })}{" "}
            </div>
          ) : (
            <div className="text-xs text-outline italic">
              No connected edges
            </div>
          )}{" "}
        </div>{" "}
        <button
          className="w-full py-2 px-3 bg-surface-container-high hover:bg-surface-container-highest text-primary text-primary rounded-md text-xs transition-colors text-left mt-4"
          onClick={onDeleteSelection}
        >
          Delete node
        </button>{" "}
      </div>
    );
  }
  if (selectedEdge) {
    const edgeColor = selectedEdge.color ?? "#64748b";
    return (
      <div className="h-full bg-surface-container-low p-4 space-y-6 overflow-y-auto text-sm">
        {" "}
        <div className="space-y-3">
          {" "}
          <div className="text-xs font-semibold text-on-surface uppercase tracking-wider font-manrope font-semibold">
            Edge Inspector
          </div>{" "}
          <p className="text-[10px] text-outline leading-tight">
            Weight &amp; direction are shared across all frames. Color is
            per-frame.
          </p>{" "}
          <div className="space-y-4">
            {" "}
            <label className="block space-y-1.5">
              {" "}
              <span className="text-xs text-on-surface">
                Weight / Label
              </span>{" "}
              <input
                className="w-full bg-white text-xs text-on-surface focus:outline-none focus:-primary bg-surface-container-low border-b border-outline-variant/20 focus:outline-none focus:border-b-primary focus:ring-0 py-2 px-0 transition-colors"
                value={selectedEdge.label ?? ""}
                onChange={(event) =>
                  onUpdateEdge({ label: event.target.value })
                }
                placeholder="e.g. 7"
              />{" "}
            </label>{" "}
            <label className="flex items-center justify-between p-2 bg-surface-container rounded-md cursor-pointer hover:bg-surface-container-high transition-colors">
              {" "}
              <span className="text-xs text-on-surface">Directed</span>{" "}
              <input
                type="checkbox"
                checked={Boolean(selectedEdge.directed)}
                onChange={(event) =>
                  onUpdateEdge({ directed: event.target.checked })
                }
                className="rounded bg-surface-container-high text-blue-500 focus:ring-blue-500 focus:ring-offset-slate-800"
              />{" "}
            </label>{" "}
            <label className="block space-y-1.5">
              {" "}
              <span className="text-xs text-on-surface">
                Highlight color
              </span>{" "}
              <div className="flex items-center gap-2">
                {" "}
                <input
                  type="color"
                  value={edgeColor.startsWith("#") ? edgeColor : "#64748b"}
                  onChange={(event) =>
                    onUpdateEdge({ color: event.target.value })
                  }
                  className="w-8 h-8 rounded cursor-pointer -0 bg-transparent p-0"
                />{" "}
                <input
                  className="flex-1 bg-white text-xs text-on-surface focus:outline-none focus:-primary bg-surface-container-low border-b border-outline-variant/20 focus:outline-none focus:border-b-primary focus:ring-0 py-2 px-0 transition-colors"
                  value={edgeColor}
                  onChange={(event) =>
                    onUpdateEdge({ color: event.target.value })
                  }
                  placeholder="#64748b"
                />{" "}
              </div>{" "}
            </label>{" "}
          </div>{" "}
        </div>{" "}
        <div className="space-y-3">
          {" "}
          <div className="text-xs font-semibold text-on-surface uppercase tracking-wider font-manrope font-semibold">
            Connected Nodes
          </div>{" "}
          {connectedNodes?.length ? (
            <div className="space-y-1.5">
              {" "}
              {connectedNodes.map((node) => (
                <button
                  key={node.id}
                  className="w-full py-1.5 px-2 bg-surface-container hover:bg-surface-container-high rounded text-xs text-on-surface transition-colors text-left truncate"
                  onClick={() => onSelectNode?.(node.id)}
                >
                  {" "}
                  {node.label ?? node.id} (id: {node.id}){" "}
                </button>
              ))}{" "}
            </div>
          ) : (
            <div className="text-xs text-outline italic">
              No connected nodes
            </div>
          )}{" "}
        </div>{" "}
        <button
          className="w-full py-2 px-3 bg-surface-container-high hover:bg-surface-container-highest text-primary text-primary rounded-md text-xs transition-colors text-left mt-4"
          onClick={onDeleteSelection}
        >
          Delete edge
        </button>{" "}
      </div>
    );
  }
  return (
    <div className="h-full bg-surface-container-low p-4 space-y-6 overflow-y-auto text-sm">
      {" "}
      <div className="space-y-3">
        {" "}
        <div className="text-xs font-semibold text-on-surface uppercase tracking-wider font-manrope font-semibold">
          Global Settings
        </div>{" "}
        <div className="space-y-4">
          {" "}
          <label className="block space-y-1.5">
            {" "}
            <div className="flex justify-between">
              {" "}
              <span className="text-xs text-on-surface">
                Gravity (force)
              </span>{" "}
              <span className="text-xs text-outline">
                {globalSettings.forceStrength}
              </span>{" "}
            </div>{" "}
            <input
              type="range"
              min="0.2"
              max="2"
              step="0.1"
              value={globalSettings.forceStrength}
              onChange={(event) =>
                onUpdateGlobal({ forceStrength: Number(event.target.value) })
              }
              className="w-full accent-blue-500"
            />{" "}
          </label>{" "}
          <label className="block space-y-1.5">
            {" "}
            <div className="flex justify-between">
              {" "}
              <span className="text-xs text-on-surface">
                Edge curvature
              </span>{" "}
              <span className="text-xs text-outline">
                {globalSettings.edgeCurvature}
              </span>{" "}
            </div>{" "}
            <input
              type="range"
              min="0"
              max="120"
              step="5"
              value={globalSettings.edgeCurvature}
              onChange={(event) =>
                onUpdateGlobal({ edgeCurvature: Number(event.target.value) })
              }
              className="w-full accent-blue-500"
            />{" "}
          </label>{" "}
          <label className="block space-y-1.5">
            {" "}
            <div className="flex justify-between">
              {" "}
              <span className="text-xs text-on-surface">Node size</span>{" "}
              <span className="text-xs text-outline">
                {globalSettings.nodeSize ?? 22}
              </span>{" "}
            </div>{" "}
            <input
              type="range"
              min="12"
              max="44"
              step="1"
              value={globalSettings.nodeSize ?? 22}
              onChange={(event) =>
                onUpdateGlobal({ nodeSize: Number(event.target.value) })
              }
              className="w-full accent-blue-500"
            />{" "}
          </label>{" "}
          <label className="block space-y-1.5">
            {" "}
            <div className="flex justify-between">
              {" "}
              <span className="text-xs text-on-surface">Edge width</span>{" "}
              <span className="text-xs text-outline">
                {globalSettings.edgeWidth ?? 2.2}
              </span>{" "}
            </div>{" "}
            <input
              type="range"
              min="1"
              max="8"
              step="0.2"
              value={globalSettings.edgeWidth ?? 2.2}
              onChange={(event) =>
                onUpdateGlobal({ edgeWidth: Number(event.target.value) })
              }
              className="w-full accent-blue-500"
            />{" "}
          </label>{" "}
        </div>{" "}
      </div>{" "}
      <div className="p-3 bg-surface-container rounded-md">
        {" "}
        <div className="text-xs text-on-surface text-center">
          Select a node or edge to view its properties.
        </div>{" "}
      </div>{" "}
    </div>
  );
};
export default PropertyPanel;
