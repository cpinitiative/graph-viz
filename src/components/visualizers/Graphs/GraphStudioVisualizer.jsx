"use client";

/* eslint-disable react/prop-types */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Panel,
  Group as PanelGroup,
  Separator as PanelResizeHandle,
} from "react-resizable-panels";
import { useGraphAnimation } from "./useGraphAnimation";
import LeftSidebar from "./graphStudio/LeftSidebar";
import GraphCanvas from "./graphStudio/GraphCanvas";
import TimelinePanel from "./graphStudio/TimelinePanel";
import PropertyPanel from "./graphStudio/PropertyPanel";
// HUDPalette moved into the left Tools sidebar (controls relocated)
// import HUDPalette from './graphStudio/HUDPalette';
import {
  circularLayout,
  clamp,
  clampNodePosition,
  computeStepDiff,
  exportEdgeListText,
  forceDirectedLayout,
  normalizeTimelinePayload,
  parseEdgeListText,
  runScriptTrace,
  snapToGrid,
  treeLayout,
} from "./graphStudio/graphStudioUtils";
import {
  EDGE_ROUTING,
  VIEWBOX_HEIGHT,
  VIEWBOX_WIDTH,
} from "./graphStudio/constants";
import { DEFAULT_SCRIPT } from "./graphStudio/data/defaultScript";
import { GRAPH_PRESETS } from "./graphStudio/data/graphPresets";
import { exportTimelineVideo } from "./graphStudio/lib/exportTimelineVideo";
import ExportVideoModal from "./graphStudio/modals/ExportVideoModal";
import ParserModal from "./graphStudio/modals/ParserModal";
import ScriptModal from "./graphStudio/modals/ScriptModal";
import {
  splitEdgePatch,
  splitNodePatch,
} from "./graphStudio/lib/graphPropertyRouting";
import { useGraphStudioPlayback } from "./graphStudio/hooks/useGraphStudioPlayback";
import { useGraphStudioUndo } from "./graphStudio/hooks/useGraphStudioUndo";
import { useGraphStudioView } from "./graphStudio/hooks/useGraphStudioView";
import { cloneJson } from "./graphStudio/lib/undoUtils";
import "./graphStudio/graphStudio.css";
const GraphStudioVisualizer = ({ snapshot }) => {
  const seedTimeline = useMemo(
    () =>
      normalizeTimelinePayload(
        snapshot?.initialAnimation ?? snapshot?.initialGraph,
      ),
    [snapshot],
  );
  const {
    baseGraph,
    setBaseGraph,
    steps,
    frameCount,
    currentFrame,
    setCurrentFrame,
    computedGraph,
    getFrameGraph,
    addStep,
    updateStep,
    duplicateStep,
    removeStep,
    moveStep,
    replaceTimeline,
  } = useGraphAnimation(seedTimeline.baseGraph, seedTimeline.steps);
  const [mode, setMode] = useState("select");
  const [edgeRouting, setEdgeRouting] = useState(EDGE_ROUTING.straight);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [showGrid, setShowGrid] = useState(false);
  const {
    viewState,
    setViewState,
    viewResetCounter,
    lockCanvas,
    setLockCanvas,
    setViewFromNodes,
    bumpViewReset,
    centerViewOnContent,
    zoomIn,
    zoomOut,
    zoomPercent,
  } = useGraphStudioView({
    initialNodes: seedTimeline.baseGraph.nodes,
  });
  const [selectedObject, setSelectedObject] = useState(null);
  const [selectedNodeIds, setSelectedNodeIds] = useState([]);
  const [drawFrom, setDrawFrom] = useState(null);
  const [status, setStatus] = useState("Ready");
  const [globalSettings, setGlobalSettings] = useState({
    forceStrength: 1,
    edgeCurvature: 46,
    nodeSize: 22,
    edgeWidth: 2.2,
  });
  const [isParserOpen, setIsParserOpen] = useState(false);
  const [parserText, setParserText] = useState("");
  const [isScriptOpen, setIsScriptOpen] = useState(false);
  const [scriptText, setScriptText] = useState(DEFAULT_SCRIPT);
  const [isExportVideoOpen, setIsExportVideoOpen] = useState(false);
  const [exportVideoLabelPos, setExportVideoLabelPos] =
    useState("bottom-center");
  const dragStateRef = useRef(null);
  const nextNodeIdRef = useRef(0);
  const nextEdgeIdRef = useRef(0);
  const { resetUndoHistory } = useGraphStudioUndo({
    baseGraph,
    steps,
    currentFrame,
    replaceTimeline,
    setCurrentFrame,
    setStatus,
  });
  const { isPlaying, togglePlayback } = useGraphStudioPlayback({
    steps,
    frameCount,
    currentFrame,
    setCurrentFrame,
    setStatus,
  });
  const selectedNodeIdSet = useMemo(
    () => new Set(selectedNodeIds.map(String)),
    [selectedNodeIds],
  );
  useEffect(() => {
    replaceTimeline(seedTimeline.baseGraph, seedTimeline.steps);
    setViewFromNodes(seedTimeline.baseGraph.nodes);
    setSelectedObject(null);
    setSelectedNodeIds([]);
    setDrawFrom(null);
    resetUndoHistory();
    nextNodeIdRef.current =
      Math.max(
        -1,
        ...seedTimeline.baseGraph.nodes.map((node) =>
          Number.isFinite(Number(node.id)) ? Number(node.id) : -1,
        ),
      ) + 1;
    nextEdgeIdRef.current = seedTimeline.baseGraph.edges.length;
    bumpViewReset();
  }, [seedTimeline, replaceTimeline, resetUndoHistory, setViewFromNodes, bumpViewReset]);
  useEffect(() => {
    if (!selectedObject) return;
    if (selectedObject.type === "node") {
      const exists = computedGraph.nodes.some(
        (node) => String(node.id) === String(selectedObject.id),
      );
      if (!exists) setSelectedObject(null);
      return;
    }
    if (selectedObject.type === "edge") {
      const exists = computedGraph.edges.some(
        (edge) => String(edge.id) === String(selectedObject.id),
      );
      if (!exists) setSelectedObject(null);
    }
  }, [selectedObject, computedGraph]);
  const selectedNode = useMemo(() => {
    if (!selectedObject || selectedObject.type !== "node") return null;
    return (
      computedGraph.nodes.find(
        (node) => String(node.id) === String(selectedObject.id),
      ) ?? null
    );
  }, [selectedObject, computedGraph.nodes]);
  const selectedEdge = useMemo(() => {
    if (!selectedObject || selectedObject.type !== "edge") return null;
    return (
      computedGraph.edges.find(
        (edge) => String(edge.id) === String(selectedObject.id),
      ) ?? null
    );
  }, [selectedObject, computedGraph.edges]);
  const nodeConnectedEdges = useMemo(() => {
    if (!selectedNode) return [];
    const nodeId = String(selectedNode.id);
    return computedGraph.edges.filter(
      (edge) => String(edge.from) === nodeId || String(edge.to) === nodeId,
    );
  }, [selectedNode, computedGraph.edges]);
  const edgeConnectedNodes = useMemo(() => {
    if (!selectedEdge) return [];
    const nodeMap = new Map(
      computedGraph.nodes.map((node) => [String(node.id), node]),
    );
    const fromNode = nodeMap.get(String(selectedEdge.from));
    const toNode = nodeMap.get(String(selectedEdge.to));
    return [fromNode, toNode].filter(Boolean);
  }, [selectedEdge, computedGraph.nodes]);
  const previousGraph = useMemo(() => {
    if (currentFrame <= 0) return computedGraph;
    return getFrameGraph(currentFrame - 1);
  }, [currentFrame, getFrameGraph, computedGraph]);
  const diff = useMemo(
    () => computeStepDiff(previousGraph, computedGraph),
    [previousGraph, computedGraph],
  );
  const updateBaseNode = (nodeId, patch) => {
    setBaseGraph((prev) => ({
      ...prev,
      nodes: prev.nodes.map((node) =>
        String(node.id) === String(nodeId) ? { ...node, ...patch } : node,
      ),
    }));
  };
  const updateBaseNodesBulk = (patchById) => {
    setBaseGraph((prev) => ({
      ...prev,
      nodes: prev.nodes.map((node) => {
        const patch = patchById[String(node.id)];
        return patch ? { ...node, ...patch } : node;
      }),
    }));
  };
  const updateBaseEdge = (edgeId, patch) => {
    setBaseGraph((prev) => ({
      ...prev,
      edges: prev.edges.map((edge) =>
        String(edge.id) === String(edgeId) ? { ...edge, ...patch } : edge,
      ),
    }));
  };
  const setStepProperty = (path, value) => {
    updateStep(currentFrame, path, value);
  };
  const addNodeAt = (point) => {
    const id = nextNodeIdRef.current;
    nextNodeIdRef.current += 1;
    const position = clampNodePosition({
      x: snapEnabled ? snapToGrid(point.x) : point.x,
      y: snapEnabled ? snapToGrid(point.y) : point.y,
    });
    setBaseGraph((prev) => ({
      ...prev,
      nodes: [
        ...prev.nodes,
        { id, label: String(id), x: position.x, y: position.y, visible: true },
      ],
    }));
    setSelectedObject({ type: "node", id });
    setSelectedNodeIds([String(id)]);
    setStatus(`Node ${id} added`);
  };
  const addNode = () => {
    addNodeAt({ x: VIEWBOX_WIDTH / 2, y: VIEWBOX_HEIGHT / 2 });
  };
  const addEdge = (from, to) => {
    const id = `e${nextEdgeIdRef.current}`;
    nextEdgeIdRef.current += 1;
    setBaseGraph((prev) => ({
      ...prev,
      edges: [
        ...prev.edges,
        {
          id,
          from,
          to,
          directed: false,
          label: "",
          color: "#64748b",
          duration: 450,
          visible: true,
        },
      ],
    }));
    setSelectedObject({ type: "edge", id });
    setStatus(`Edge ${from} → ${to} added`);
  };
  const onNodeClickForDraw = (nodeId) => {
    if (drawFrom === null || drawFrom === undefined) {
      setDrawFrom(nodeId);
      setStatus(`Draw mode: source ${nodeId}`);
      return;
    }
    addEdge(drawFrom, nodeId);
    setDrawFrom(null);
  };
  const onSelectNode = (nodeId, additive = false) => {
    const idText = String(nodeId);
    setSelectedObject({ type: "node", id: nodeId });
    if (additive) {
      setSelectedNodeIds((prev) => {
        const set = new Set(prev.map(String));
        if (set.has(idText)) set.delete(idText);
        else set.add(idText);
        return Array.from(set);
      });
      return;
    }
    setSelectedNodeIds([idText]);
  };
  const onSelectEdge = (edgeId) => {
    setSelectedObject({ type: "edge", id: edgeId });
    setSelectedNodeIds([]);
  };
  const onSelectNodes = (nodeIds) => {
    setSelectedNodeIds(nodeIds);
    if (nodeIds.length === 1) {
      setSelectedObject({ type: "node", id: nodeIds[0] });
    } else {
      setSelectedObject(null);
    }
  };
  const onBackgroundClear = () => {
    setSelectedObject(null);
    setSelectedNodeIds([]);
    setDrawFrom(null);
  };
  const onNodePointerDown = ({ nodeId, worldX, worldY }) => {
    const shouldDragGroup =
      selectedNodeIdSet.has(String(nodeId)) && selectedNodeIdSet.size > 1;
    const dragNodeIds = shouldDragGroup
      ? Array.from(selectedNodeIdSet)
      : [String(nodeId)];
    const nodeMap = new Map(
      baseGraph.nodes.map((node) => [String(node.id), node]),
    );
    const anchor = nodeMap.get(String(nodeId));
    if (!anchor) return;
    const offsets = {};
    dragNodeIds.forEach((id) => {
      const node = nodeMap.get(String(id));
      if (!node) return;
      offsets[id] = { dx: worldX - node.x, dy: worldY - node.y };
    });
    dragStateRef.current = {
      anchorId: String(nodeId),
      nodeIds: dragNodeIds,
      offsets,
    };
  };
  const onNodeMove = ({ worldX, worldY, snapEnabled: snap }) => {
    const drag = dragStateRef.current;
    if (!drag) return;
    const patchById = {};
    drag.nodeIds.forEach((id) => {
      const offset = drag.offsets[id];
      if (!offset) return;
      const rawX = worldX - offset.dx;
      const rawY = worldY - offset.dy;
      const snappedX = snap ? snapToGrid(rawX) : rawX;
      const snappedY = snap ? snapToGrid(rawY) : rawY;
      patchById[id] = clampNodePosition({ x: snappedX, y: snappedY });
    });
    updateBaseNodesBulk(patchById);
  };
  const onNodePointerUp = () => {
    dragStateRef.current = null;
  };
  const updateSelectedNode = (patch) => {
    if (!selectedNode) return;
    const { basePatch, stepUpdates } = splitNodePatch(patch);
    stepUpdates.forEach(({ key, value }) => {
      setStepProperty(`nodeOverrides.${selectedNode.id}.${key}`, value);
    });
    if (Object.keys(basePatch).length > 0)
      updateBaseNode(selectedNode.id, basePatch);
  };
  const updateSelectedEdge = (patch) => {
    if (!selectedEdge) return;
    const { basePatch, stepUpdates } = splitEdgePatch(patch);
    stepUpdates.forEach(({ key, value }) => {
      setStepProperty(`edgeOverrides.${selectedEdge.id}.${key}`, value);
    });
    if (Object.keys(basePatch).length > 0)
      updateBaseEdge(selectedEdge.id, basePatch);
  };
  const applyPatchToSelectedNodes = (patch) => {
    if (!selectedNodeIds.length) return;
    selectedNodeIds.forEach((id) => {
      Object.entries(patch).forEach(([key, value]) => {
        setStepProperty(`nodeOverrides.${id}.${key}`, value);
      });
    });
  };
  const deleteSelection = () => {
    if (selectedNodeIds.length > 0) {
      const selectedSet = new Set(selectedNodeIds.map(String));
      const nextBaseGraph = {
        nodes: baseGraph.nodes.filter(
          (node) => !selectedSet.has(String(node.id)),
        ),
        edges: baseGraph.edges.filter(
          (edge) =>
            !selectedSet.has(String(edge.from)) &&
            !selectedSet.has(String(edge.to)),
        ),
      };
      const nextSteps = steps.map((step) => {
        const nodeOverrides = { ...(step.nodeOverrides ?? {}) };
        const edgeOverrides = { ...(step.edgeOverrides ?? {}) };
        selectedSet.forEach((nodeId) => {
          delete nodeOverrides[nodeId];
        });
        Object.keys(edgeOverrides).forEach((edgeId) => {
          const stillExists = nextBaseGraph.edges.some(
            (edge) => String(edge.id) === String(edgeId),
          );
          if (!stillExists) delete edgeOverrides[edgeId];
        });
        return { ...step, nodeOverrides, edgeOverrides };
      });
      replaceTimeline(nextBaseGraph, nextSteps);
      setSelectedNodeIds([]);
      setSelectedObject(null);
      setStatus("Selection deleted");
      return;
    }
    if (selectedEdge) {
      const nextBaseGraph = {
        ...baseGraph,
        edges: baseGraph.edges.filter(
          (edge) => String(edge.id) !== String(selectedEdge.id),
        ),
      };
      const nextSteps = steps.map((step) => {
        const edgeOverrides = { ...(step.edgeOverrides ?? {}) };
        delete edgeOverrides[String(selectedEdge.id)];
        return { ...step, edgeOverrides };
      });
      replaceTimeline(nextBaseGraph, nextSteps);
      setSelectedObject(null);
      setStatus(`Edge ${selectedEdge.id} deleted`);
    }
  };
  const applyLayout = (type) => {
    let nextGraph = baseGraph;
    if (type === "circle") nextGraph = circularLayout(baseGraph);
    if (type === "tree")
      nextGraph = treeLayout(baseGraph, baseGraph.nodes[0]?.id);
    if (type === "force") {
      const iterations = Math.round(100 * globalSettings.forceStrength);
      nextGraph = forceDirectedLayout(baseGraph, iterations);
    }
    setBaseGraph(nextGraph);
    setStatus(`Applied ${type} layout`);
  };
  const applyParserText = () => {
    try {
      const { graph, meta } = parseEdgeListText(parserText);
      replaceTimeline(graph, [
        {
          id: "step-0",
          description: "Parsed input",
          durationMs: 600,
          nodeOverrides: {},
          edgeOverrides: {},
        },
      ]);
      setIsParserOpen(false);
      setStatus(`Graph parsed: ${meta}`);
    } catch (error) {
      setStatus(`Parse failed: ${error.message}`);
    }
  };
  const exportText = async () => {
    const output = exportEdgeListText(baseGraph);
    try {
      await navigator.clipboard.writeText(output);
      setStatus("Edge list copied to clipboard");
    } catch {
      setStatus("Clipboard unavailable; open parser and paste manually");
      setIsParserOpen(true);
      setParserText(output);
    }
  };
  const exportVideo = async (labelPos) => {
    setStatus("Exporting video...");
    try {
      await exportTimelineVideo({ steps, setCurrentFrame, labelPos });
      setStatus("Video exported successfully");
    } catch (error) {
      console.error(error);
      setStatus(`Export failed: ${error.message}`);
    }
  };
  const runScript = () => {
    try {
      const traceSteps = runScriptTrace({ code: scriptText, graph: baseGraph });
      replaceTimeline(baseGraph, traceSteps);
      setIsScriptOpen(false);
      setStatus(`Script generated ${traceSteps.length} frames`);
    } catch (error) {
      setStatus(`Script error: ${error.message}`);
    }
  };
  const applyPreset = (presetName) => {
    const preset = GRAPH_PRESETS[presetName];
    if (!preset) return;
    const nextGraph = cloneJson(preset.graph);
    const nextSteps = cloneJson(preset.steps);
    replaceTimeline(nextGraph, nextSteps);
    setViewFromNodes(nextGraph.nodes);
    setStatus(`Applied ${presetName.toUpperCase()} preset`);
  };
  return (
    <div className="h-full min-h-0 bg-surface font-inter text-on-surface text-on-surface">
      {" "}
      <PanelGroup orientation="vertical" className="h-full">
        {" "}
        <Panel defaultSize="76%" minSize="52%">
          {" "}
          <PanelGroup orientation="horizontal" className="h-full">
            {" "}
            <Panel defaultSize="18%" minSize="14%">
              {" "}
              <LeftSidebar
                mode={mode}
                setMode={setMode}
                routing={edgeRouting}
                setRouting={setEdgeRouting}
                snapEnabled={snapEnabled}
                setSnapEnabled={setSnapEnabled}
                showGrid={showGrid}
                setShowGrid={setShowGrid}
                lockCanvas={lockCanvas}
                setLockCanvas={setLockCanvas}
                onAddNode={addNode}
                onAutoLayout={applyLayout}
                onOpenParser={() => setIsParserOpen(true)}
                onExportText={exportText}
                onExportVideo={() => setIsExportVideoOpen(true)}
                onOpenScript={() => setIsScriptOpen(true)}
                selectedCount={selectedNodeIds.length}
                onApplyPreset={applyPreset}
                currentFrame={currentFrame}
                totalFrames={frameCount}
                onPlay={togglePlayback}
                isPlaying={isPlaying}
                onCenterView={centerViewOnContent}
                zoomPercent={zoomPercent}
                onZoomIn={zoomIn}
                onZoomOut={zoomOut}
              />{" "}
            </Panel>{" "}
            <PanelResizeHandle className="graphstudio-resize" />{" "}
            <Panel minSize="40%" defaultSize="60%">
              {" "}
              <motion.div
                className="relative h-full"
                layoutId="graphstudio-main-canvas"
              >
                {" "}
                <GraphCanvas
                  graph={computedGraph}
                  previousGraph={previousGraph}
                  diff={diff}
                  selectedObject={selectedObject}
                  selectedNodeIds={selectedNodeIdSet}
                  drawFrom={drawFrom}
                  mode={mode}
                  viewState={viewState}
                  setViewState={setViewState}
                  showGrid={showGrid}
                  snapEnabled={snapEnabled}
                  lockCanvas={lockCanvas}
                  edgeRouting={edgeRouting}
                  edgeCurvature={globalSettings.edgeCurvature}
                  nodeRadius={globalSettings.nodeSize}
                  edgeWidth={globalSettings.edgeWidth}
                  resetViewTrigger={viewResetCounter}
                  onSelectNode={onSelectNode}
                  onSelectEdge={onSelectEdge}
                  onSelectNodes={onSelectNodes}
                  onBackgroundClear={onBackgroundClear}
                  onNodePointerDown={onNodePointerDown}
                  onNodeMove={onNodeMove}
                  onNodePointerUp={onNodePointerUp}
                  onNodeClickForDraw={onNodeClickForDraw}
                  onCanvasDoubleClick={addNodeAt}
                />{" "}
                <div className="absolute left-3 bottom-3 z-20 px-2 py-1 rounded bg-surface-container-low/90 text-[11px] text-on-surface">
                  {" "}
                  {status}{" "}
                </div>{" "}
              </motion.div>{" "}
            </Panel>{" "}
            <PanelResizeHandle className="graphstudio-resize" />{" "}
            <Panel defaultSize="22%" minSize="16%">
              {" "}
              <PropertyPanel
                selectedNode={selectedNode}
                selectedEdge={selectedEdge}
                connectedEdges={nodeConnectedEdges}
                connectedNodes={edgeConnectedNodes}
                multiSelection={selectedNodeIds}
                globalSettings={globalSettings}
                onUpdateNode={updateSelectedNode}
                onUpdateEdge={updateSelectedEdge}
                onSelectEdge={(edgeId) => onSelectEdge(edgeId)}
                onSelectNode={(nodeId) => onSelectNode(nodeId, false)}
                onApplyToSelection={applyPatchToSelectedNodes}
                onDeleteSelection={deleteSelection}
                onUpdateGlobal={(patch) =>
                  setGlobalSettings((prev) => ({ ...prev, ...patch }))
                }
              />{" "}
            </Panel>{" "}
          </PanelGroup>{" "}
        </Panel>{" "}
        <PanelResizeHandle className="graphstudio-resize-horizontal" />{" "}
        <Panel defaultSize="24%" minSize="14%">
          {" "}
          <TimelinePanel
            steps={steps}
            currentFrame={currentFrame}
            onFrameChange={setCurrentFrame}
            onStepDurationChange={(index, value) =>
              updateStep(index, "durationMs", value)
            }
            onDescriptionChange={(index, value) =>
              updateStep(index, "description", value)
            }
            onAddStep={() => {
              addStep(currentFrame);
              setCurrentFrame(currentFrame + 1);
            }}
            onDuplicateStep={() => {
              duplicateStep(currentFrame);
              setCurrentFrame(currentFrame + 1);
            }}
            onDeleteStep={() => {
              if (steps.length <= 1) return;
              removeStep(currentFrame);
              setCurrentFrame(Math.max(0, currentFrame - 1));
            }}
            onMoveStep={moveStep}
            onPlay={togglePlayback}
            isPlaying={isPlaying}
          />{" "}
        </Panel>{" "}
      </PanelGroup>
      <ParserModal
        open={isParserOpen}
        text={parserText}
        onTextChange={setParserText}
        onClose={() => setIsParserOpen(false)}
        onSubmit={applyParserText}
      />
      <ScriptModal
        open={isScriptOpen}
        text={scriptText}
        onTextChange={setScriptText}
        onClose={() => setIsScriptOpen(false)}
        onSubmit={runScript}
        defaultScript={DEFAULT_SCRIPT}
      />
      <ExportVideoModal
        open={isExportVideoOpen}
        labelPos={exportVideoLabelPos}
        onLabelPosChange={setExportVideoLabelPos}
        onClose={() => setIsExportVideoOpen(false)}
        onExport={() => {
          setIsExportVideoOpen(false);
          exportVideo(exportVideoLabelPos);
        }}
      />
    </div>
  );
};
export default GraphStudioVisualizer;
