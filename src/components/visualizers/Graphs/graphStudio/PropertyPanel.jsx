/* eslint-disable react/prop-types */

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
      <div className="h-full bg-surface-container-low p-4 md:p-4 space-y-4 md:space-y-6 overflow-y-auto text-sm dark:bg-dark-surface">
        {" "}
        <div className="space-y-3">
          {" "}
          <div className="text-xs text-on-surface uppercase tracking-wider font-manrope font-semibold dark:text-dark-on-surface">
            Selection
          </div>{" "}
          <p className="text-xs text-on-surface dark:text-dark-on-surface">
            {multiSelection.length} items selected
          </p>{" "}
          <div className="space-y-2">
            {" "}
            <button
              className="w-full py-3 md:py-2 px-3 bg-surface-container hover:bg-surface-container-high rounded-md text-xs text-on-surface transition-colors text-left dark:bg-dark-surface-container dark:hover:bg-dark-surface-container-high dark:text-dark-on-surface min-h-[44px] md:min-h-0"
              onClick={() => onApplyToSelection({ status: "visited" })}
            >
              Set visited
            </button>{" "}
            <button
              className="w-full py-3 md:py-2 px-3 bg-surface-container hover:bg-surface-container-high rounded-md text-xs text-on-surface transition-colors text-left dark:bg-dark-surface-container dark:hover:bg-dark-surface-container-high dark:text-dark-on-surface min-h-[44px] md:min-h-0"
              onClick={() => onApplyToSelection({ status: "active" })}
            >
              Set active
            </button>{" "}
            <button
              className="w-full py-3 md:py-2 px-3 bg-surface-container hover:bg-surface-container-high rounded-md text-xs text-on-surface transition-colors text-left dark:bg-dark-surface-container dark:hover:bg-dark-surface-container-high dark:text-dark-on-surface min-h-[44px] md:min-h-0"
              onClick={() => onApplyToSelection({ color: "#22c55e" })}
            >
              Color green
            </button>{" "}
            <button
              className="w-full py-3 md:py-2 px-3 bg-surface-container-high hover:bg-surface-container-highest text-primary rounded-md text-xs transition-colors text-left mt-4 dark:bg-dark-surface-container-high dark:hover:bg-dark-surface-container-highest dark:text-dark-primary min-h-[44px] md:min-h-0"
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
      <div className="h-full bg-surface-container-low p-4 md:p-4 space-y-4 md:space-y-6 overflow-y-auto text-sm dark:bg-dark-surface">
        {" "}
        <div className="space-y-3">
          {" "}
          <div className="text-xs text-on-surface uppercase tracking-wider font-manrope font-semibold dark:text-dark-on-surface">
            Node Inspector
          </div>{" "}
          <p className="text-[10px] text-outline leading-tight dark:text-dark-outline">
            Label is shared across all frames. Status/color are per-frame.
          </p>{" "}
          <div className="space-y-4">
            {" "}
            <label className="block space-y-1.5">
              {" "}
              <span className="text-xs text-on-surface dark:text-dark-on-surface">
                Label
              </span>{" "}
              <input
                className="w-full text-xs text-on-surface focus:ring-2 focus:ring-blue-500 bg-surface-container-low border-b border-outline-variant/20 dark:border-dark-outline-variant/20 focus:outline-none focus:border-b-primary py-3 md:py-2 px-0 transition-colors dark:bg-gray-800 dark:text-dark-on-surface"
                value={selectedNode.label ?? ""}
                onChange={(event) =>
                  onUpdateNode({ label: event.target.value })
                }
              />{" "}
            </label>{" "}
            <label className="block space-y-1.5">
              {" "}
              <span className="text-xs text-on-surface dark:text-dark-on-surface">
                Status
              </span>{" "}
              <select
                className="w-full text-xs text-on-surface bg-surface-container-low border-b border-outline-variant/20 dark:border-dark-outline-variant/20 focus:outline-none focus:border-b-primary focus:ring-0 py-3 md:py-2 px-0 transition-colors dark:bg-gray-800 dark:text-dark-on-surface"
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
              <span className="text-xs text-on-surface dark:text-dark-on-surface">
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
                  className="w-10 h-10 md:w-8 md:h-8 rounded cursor-pointer bg-transparent p-0"
                />{" "}
                <input
                  className="flex-1 text-xs text-on-surface focus:ring-2 focus:ring-blue-500 bg-surface-container-low border-b border-outline-variant/20 dark:border-dark-outline-variant/20 focus:outline-none focus:border-b-primary py-3 md:py-2 px-0 transition-colors dark:bg-gray-800 dark:text-dark-on-surface"
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
          <div className="text-xs text-on-surface uppercase tracking-wider font-manrope font-semibold dark:text-dark-on-surface">
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
                    className="w-full py-2 md:py-1.5 px-2 bg-surface-container hover:bg-surface-container-high rounded text-xs text-on-surface transition-colors text-left truncate dark:bg-dark-surface-container dark:hover:bg-dark-surface-container-high dark:text-dark-on-surface min-h-[44px] md:min-h-0"
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
            <div className="text-xs text-outline italic dark:text-dark-outline">
              No connected edges
            </div>
          )}{" "}
        </div>{" "}
        <button
          className="w-full py-3 md:py-2 px-3 bg-surface-container-high hover:bg-surface-container-highest text-primary rounded-md text-xs transition-colors text-left mt-4 dark:bg-dark-surface-container-high dark:hover:bg-dark-surface-container-highest dark:text-dark-primary min-h-[44px] md:min-h-0"
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
      <div className="h-full bg-surface-container-low p-4 md:p-4 space-y-4 md:space-y-6 overflow-y-auto text-sm dark:bg-dark-surface">
        {" "}
        <div className="space-y-3">
          {" "}
          <div className="text-xs text-on-surface uppercase tracking-wider font-manrope font-semibold dark:text-dark-on-surface">
            Edge Inspector
          </div>{" "}
          <p className="text-[10px] text-outline leading-tight dark:text-dark-outline">
            Weight &amp; direction are shared across all frames. Color is
            per-frame.
          </p>{" "}
          <div className="space-y-4">
            {" "}
            <label className="block space-y-1.5">
              {" "}
              <span className="text-xs text-on-surface dark:text-dark-on-surface">
                Weight / Label
              </span>{" "}
              <input
                className="w-full text-xs text-on-surface focus:ring-2 focus:ring-blue-500 bg-surface-container-low border-b border-outline-variant/20 dark:border-dark-outline-variant/20 focus:outline-none focus:border-b-primary py-3 md:py-2 px-0 transition-colors dark:bg-gray-800 dark:text-dark-on-surface"
                value={selectedEdge.label ?? ""}
                onChange={(event) =>
                  onUpdateEdge({ label: event.target.value })
                }
                placeholder="e.g. 7"
              />{" "}
            </label>{" "}
            <label className="flex items-center justify-between p-3 md:p-2 bg-surface-container rounded-md cursor-pointer hover:bg-surface-container-high transition-colors dark:bg-dark-surface-container dark:hover:bg-dark-surface-container-high">
              {" "}
              <span className="text-xs text-on-surface dark:text-dark-on-surface">
                Directed
              </span>{" "}
              <input
                type="checkbox"
                checked={Boolean(selectedEdge.directed)}
                onChange={(event) =>
                  onUpdateEdge({ directed: event.target.checked })
                }
                className="rounded bg-surface-container-high text-blue-500 focus:ring-blue-500 focus:ring-offset-slate-800 w-5 h-5"
              />{" "}
            </label>{" "}
            <label className="block space-y-1.5">
              {" "}
              <span className="text-xs text-on-surface dark:text-dark-on-surface">
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
                  className="w-10 h-10 md:w-8 md:h-8 rounded cursor-pointer bg-transparent p-0"
                />{" "}
                <input
                  className="flex-1 text-xs text-on-surface focus:ring-2 focus:ring-blue-500 bg-surface-container-low border-b border-outline-variant/20 dark:border-dark-outline-variant/20 focus:outline-none focus:border-b-primary py-3 md:py-2 px-0 transition-colors dark:bg-gray-800 dark:text-dark-on-surface"
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
          <div className="text-xs text-on-surface uppercase tracking-wider font-manrope font-semibold dark:text-dark-on-surface">
            Connected Nodes
          </div>{" "}
          {connectedNodes?.length ? (
            <div className="space-y-1.5">
              {" "}
              {connectedNodes.map((node) => (
                <button
                  key={node.id}
                  className="w-full py-2 md:py-1.5 px-2 bg-surface-container hover:bg-surface-container-high rounded text-xs text-on-surface transition-colors text-left truncate dark:bg-dark-surface-container dark:hover:bg-dark-surface-container-high dark:text-dark-on-surface min-h-[44px] md:min-h-0"
                  onClick={() => onSelectNode?.(node.id)}
                >
                  {" "}
                  {node.label ?? node.id} (id: {node.id}){" "}
                </button>
              ))}{" "}
            </div>
          ) : (
            <div className="text-xs text-outline italic dark:text-dark-outline">
              No connected nodes
            </div>
          )}{" "}
        </div>{" "}
        <button
          className="w-full py-3 md:py-2 px-3 bg-surface-container-high hover:bg-surface-container-highest text-primary rounded-md text-xs transition-colors text-left mt-4 dark:bg-dark-surface-container-high dark:hover:bg-dark-surface-container-highest dark:text-dark-primary min-h-[44px] md:min-h-0"
          onClick={onDeleteSelection}
        >
          Delete edge
        </button>{" "}
      </div>
    );
  }
  return (
    <div className="h-full bg-surface-container-low p-4 md:p-4 space-y-4 md:space-y-6 overflow-y-auto text-sm dark:bg-dark-surface">
      {" "}
      <div className="space-y-3">
        {" "}
        <div className="text-xs text-on-surface uppercase tracking-wider font-manrope font-semibold dark:text-dark-on-surface">
          Global Settings
        </div>{" "}
        <div className="space-y-4">
          {" "}
          <label className="block space-y-1.5">
            {" "}
            <div className="flex justify-between">
              {" "}
              <span className="text-xs text-on-surface dark:text-dark-on-surface">
                Gravity (force)
              </span>{" "}
              <span className="text-xs text-outline dark:text-dark-outline">
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
              className="w-full accent-blue-500 h-2"
            />{" "}
          </label>{" "}
          <label className="block space-y-1.5">
            {" "}
            <div className="flex justify-between">
              {" "}
              <span className="text-xs text-on-surface dark:text-dark-on-surface">
                Edge curvature
              </span>{" "}
              <span className="text-xs text-outline dark:text-dark-outline">
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
              className="w-full accent-blue-500 h-2"
            />{" "}
          </label>{" "}
          <label className="block space-y-1.5">
            {" "}
            <div className="flex justify-between">
              {" "}
              <span className="text-xs text-on-surface dark:text-dark-on-surface">
                Node size
              </span>{" "}
              <span className="text-xs text-outline dark:text-dark-outline">
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
              className="w-full accent-blue-500 h-2"
            />{" "}
          </label>{" "}
          <label className="block space-y-1.5">
            {" "}
            <div className="flex justify-between">
              {" "}
              <span className="text-xs text-on-surface dark:text-dark-on-surface">
                Edge width
              </span>{" "}
              <span className="text-xs text-outline dark:text-dark-outline">
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
              className="w-full accent-blue-500 h-2"
            />{" "}
          </label>{" "}
        </div>{" "}
      </div>{" "}
      <div className="p-3 bg-surface-container rounded-md dark:bg-dark-surface-container">
        {" "}
        <div className="text-xs text-on-surface text-center dark:text-dark-on-surface">
          Select a node or edge to view its properties.
        </div>{" "}
      </div>{" "}
    </div>
  );
};
export default PropertyPanel;
