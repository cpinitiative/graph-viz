"use client";

/* eslint-disable react/prop-types */
import { useEffect, useMemo, useState } from "react";
import { useGraphAnimation } from "./useGraphAnimation";
import {
  computeStepDiff,
  normalizeTimelinePayload,
} from "./graphStudio/graphStudioUtils";
import { EDGE_ROUTING } from "./graphStudio/constants";
import { GRAPH_PRESETS } from "./graphStudio/data/graphPresets";
import { cloneJson } from "./graphStudio/lib/undoUtils";
import { useGraphStudioCanvasHandlers } from "./graphStudio/hooks/useGraphStudioCanvasHandlers";
import { useGraphStudioImportExport } from "./graphStudio/hooks/useGraphStudioImportExport";
import { useGraphStudioGraphModel } from "./graphStudio/hooks/useGraphStudioGraphModel";
import { useGraphStudioPlayback } from "./graphStudio/hooks/useGraphStudioPlayback";
import {
  useGraphStudioSelection,
  useGraphStudioSelectionPatchers,
} from "./graphStudio/hooks/useGraphStudioSelection";
import { useGraphStudioUndo } from "./graphStudio/hooks/useGraphStudioUndo";
import { useGraphStudioView } from "./graphStudio/hooks/useGraphStudioView";
import GraphStudioLayout from "./graphStudio/GraphStudioLayout";
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
  const [status, setStatus] = useState("Ready");
  const [globalSettings, setGlobalSettings] = useState({
    forceStrength: 1,
    edgeCurvature: 46,
    nodeSize: 22,
    edgeWidth: 2.2,
  });
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
  const {
    selectedObject,
    setSelectedObject,
    selectedNodeIds,
    setSelectedNodeIds,
    selectedNodeIdSet,
    selectedNode,
    selectedEdge,
    nodeConnectedEdges,
    edgeConnectedNodes,
    clearSelection,
  } = useGraphStudioSelection({ computedGraph });
  const {
    updateBaseNode,
    updateBaseNodesBulk,
    updateBaseEdge,
    setStepProperty,
    addNodeAt,
    addNode,
    addEdge,
    deleteSelection,
    applyLayout,
  } = useGraphStudioGraphModel({
    baseGraph,
    setBaseGraph,
    steps,
    currentFrame,
    updateStep,
    replaceTimeline,
    snapEnabled,
    forceStrength: globalSettings.forceStrength,
    setStatus,
    seedBaseGraph: seedTimeline.baseGraph,
    selectedNodeIds,
    selectedEdge,
    setSelectedObject,
    setSelectedNodeIds,
  });
  const { updateSelectedNode, updateSelectedEdge, applyPatchToSelectedNodes } =
    useGraphStudioSelectionPatchers({
      selectedNode,
      selectedEdge,
      selectedNodeIds,
      updateBaseNode,
      updateBaseEdge,
      setStepProperty,
    });
  const {
    drawFrom,
    clearDrawState,
    handleSetMode,
    startDrawEdge,
    onSelectNode,
    onSelectEdge,
    onSelectNodes,
    onBackgroundClear,
    onNodeClickForDraw,
    onNodePointerDown,
    onNodeMove,
    onNodePointerUp,
  } = useGraphStudioCanvasHandlers({
    setMode,
    setStatus,
    baseGraph,
    addEdge,
    updateBaseNodesBulk,
    selectedNodeIds,
    selectedNodeIdSet,
    setSelectedObject,
    setSelectedNodeIds,
    clearSelection,
  });
  const {
    isParserOpen,
    setIsParserOpen,
    parserText,
    setParserText,
    applyParserText,
    isScriptOpen,
    setIsScriptOpen,
    scriptText,
    setScriptText,
    runScript,
    isExportVideoOpen,
    exportVideoLabelPos,
    setExportVideoLabelPos,
    exportText,
    openExportVideoModal,
    closeExportVideoModal,
    confirmExportVideo,
  } = useGraphStudioImportExport({
    baseGraph,
    steps,
    setCurrentFrame,
    replaceTimeline,
    setStatus,
  });
  useEffect(() => {
    replaceTimeline(seedTimeline.baseGraph, seedTimeline.steps);
    setViewFromNodes(seedTimeline.baseGraph.nodes);
    clearSelection();
    clearDrawState();
    resetUndoHistory();
    bumpViewReset();
  }, [
    seedTimeline,
    replaceTimeline,
    resetUndoHistory,
    setViewFromNodes,
    bumpViewReset,
    clearSelection,
    clearDrawState,
  ]);
  const previousGraph = useMemo(() => {
    if (currentFrame <= 0) return computedGraph;
    return getFrameGraph(currentFrame - 1);
  }, [currentFrame, getFrameGraph, computedGraph]);
  const diff = useMemo(
    () => computeStepDiff(previousGraph, computedGraph),
    [previousGraph, computedGraph],
  );
  const applyPreset = (presetName) => {
    const preset = GRAPH_PRESETS[presetName];
    if (!preset) return;
    const nextGraph = cloneJson(preset.graph);
    const nextSteps = cloneJson(preset.steps);
    replaceTimeline(nextGraph, nextSteps);
    setViewFromNodes(nextGraph.nodes);
    setStatus(`Applied ${presetName.toUpperCase()} preset`);
  };

  const layoutProps = {
    sidebar: {
      mode,
      setMode: handleSetMode,
      drawFrom,
      onDrawEdge: startDrawEdge,
      routing: edgeRouting,
      setRouting: setEdgeRouting,
      snapEnabled,
      setSnapEnabled,
      showGrid,
      setShowGrid,
      lockCanvas,
      setLockCanvas,
      onAddNode: addNode,
      onAutoLayout: applyLayout,
      onOpenParser: () => setIsParserOpen(true),
      onExportText: exportText,
      onExportVideo: openExportVideoModal,
      onOpenScript: () => setIsScriptOpen(true),
      selectedCount: selectedNodeIds.length,
      onApplyPreset: applyPreset,
      currentFrame,
      totalFrames: frameCount,
      onPlay: togglePlayback,
      isPlaying,
      onCenterView: centerViewOnContent,
      zoomPercent,
      onZoomIn: zoomIn,
      onZoomOut: zoomOut,
    },
    canvas: {
      graph: computedGraph,
      previousGraph,
      diff,
      selectedObject,
      selectedNodeIds: selectedNodeIdSet,
      drawFrom,
      mode,
      viewState,
      setViewState,
      showGrid,
      snapEnabled,
      lockCanvas,
      edgeRouting,
      edgeCurvature: globalSettings.edgeCurvature,
      nodeRadius: globalSettings.nodeSize,
      edgeWidth: globalSettings.edgeWidth,
      resetViewTrigger: viewResetCounter,
      onSelectNode,
      onSelectEdge,
      onSelectNodes,
      onBackgroundClear,
      onNodePointerDown,
      onNodeMove,
      onNodePointerUp,
      onNodeClickForDraw,
      onCanvasDoubleClick: addNodeAt,
    },
    property: {
      selectedNode,
      selectedEdge,
      connectedEdges: nodeConnectedEdges,
      connectedNodes: edgeConnectedNodes,
      multiSelection: selectedNodeIds,
      globalSettings,
      onUpdateNode: updateSelectedNode,
      onUpdateEdge: updateSelectedEdge,
      onSelectEdge: (edgeId) => onSelectEdge(edgeId),
      onSelectNode: (nodeId) => onSelectNode(nodeId, false),
      onApplyToSelection: applyPatchToSelectedNodes,
      onDeleteSelection: deleteSelection,
      onUpdateGlobal: (patch) =>
        setGlobalSettings((prev) => ({ ...prev, ...patch })),
    },
    timeline: {
      steps,
      currentFrame,
      onFrameChange: setCurrentFrame,
      onStepDurationChange: (index, value) =>
        updateStep(index, "durationMs", value),
      onDescriptionChange: (index, value) =>
        updateStep(index, "description", value),
      onAddStep: () => {
        addStep(currentFrame);
        setCurrentFrame(currentFrame + 1);
      },
      onDuplicateStep: () => {
        duplicateStep(currentFrame);
        setCurrentFrame(currentFrame + 1);
      },
      onDeleteStep: () => {
        if (steps.length <= 1) return;
        removeStep(currentFrame);
        setCurrentFrame(Math.max(0, currentFrame - 1));
      },
      onMoveStep: moveStep,
      onPlay: togglePlayback,
      isPlaying,
    },
    modals: {
      parser: {
        open: isParserOpen,
        text: parserText,
        onTextChange: setParserText,
        onClose: () => setIsParserOpen(false),
        onSubmit: applyParserText,
      },
      script: {
        open: isScriptOpen,
        text: scriptText,
        onTextChange: setScriptText,
        onClose: () => setIsScriptOpen(false),
        onSubmit: runScript,
      },
      exportVideo: {
        open: isExportVideoOpen,
        labelPos: exportVideoLabelPos,
        onLabelPosChange: setExportVideoLabelPos,
        onClose: closeExportVideoModal,
        onExport: confirmExportVideo,
      },
    },
    status,
  };

  return <GraphStudioLayout {...layoutProps} />;
};
export default GraphStudioVisualizer;
