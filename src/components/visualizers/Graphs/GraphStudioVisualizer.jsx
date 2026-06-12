'use client';

import { useEffect, useMemo, useState } from 'react';
import { EDGE_ROUTING } from './graphStudio/constants';
import { GRAPH_PRESETS } from './graphStudio/data/graphPresets';
import GraphStudioLayout from './graphStudio/GraphStudioLayout';
import {
  computeStepDiff,
  normalizeTimelinePayload,
} from './graphStudio/graphStudioUtils';
import { useGraphStudioCanvasHandlers } from './graphStudio/hooks/useGraphStudioCanvasHandlers';
import { useGraphStudioGraphModel } from './graphStudio/hooks/useGraphStudioGraphModel';
import { useGraphStudioImportExport } from './graphStudio/hooks/useGraphStudioImportExport';
import { useGraphStudioPlayback } from './graphStudio/hooks/useGraphStudioPlayback';
import {
  useGraphStudioSelection,
  useGraphStudioSelectionPatchers,
} from './graphStudio/hooks/useGraphStudioSelection';
import { useGraphStudioUndo } from './graphStudio/hooks/useGraphStudioUndo';
import { useGraphStudioView } from './graphStudio/hooks/useGraphStudioView';
import { cloneJson } from './graphStudio/lib/undoUtils';
import { useGraphAnimation } from './useGraphAnimation';

const PRESET_STATUS_LABELS = {
  bfs: 'BFS',
  dfs: 'DFS',
  dijkstra: 'Dijkstra',
  'kruskal-mst': 'Kruskal MST',
  'dijkstra-shortest-paths': 'Dijkstra Shortest Paths',
  'topological-sort': 'Topological Sort',
  'disjoint-set-union': 'Disjoint Set Union',
  'connected-components': 'Connected Components',
  multigraph: 'Multi-Edge / Loop',
};

const GraphStudioVisualizer = ({ snapshot }) => {
  const seedTimeline = useMemo(
    () =>
      normalizeTimelinePayload(
        snapshot?.initialAnimation ?? snapshot?.initialGraph
      ),
    [snapshot]
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
  const [mode, setMode] = useState('select');
  const [edgeRouting, setEdgeRouting] = useState(EDGE_ROUTING.straight);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [showGrid, setShowGrid] = useState(false);
  const [showLegend, setShowLegend] = useState(false);
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
  const [status, setStatus] = useState('Ready');
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
    restoreDrawState,
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
    scriptError,
    runScript,
    isExportVideoOpen,
    exportVideoLabelPos,
    setExportVideoLabelPos,
    exportText,
    exportProject,
    exportSlideshow,
    importProjectFile,
    openExportVideoModal,
    closeExportVideoModal,
    confirmExportVideo,
  } = useGraphStudioImportExport({
    baseGraph,
    steps,
    currentFrame,
    setCurrentFrame,
    replaceTimeline,
    setStatus,
    edgeRouting,
    setEdgeRouting,
    snapEnabled,
    setSnapEnabled,
    showGrid,
    setShowGrid,
    showLegend,
    setShowLegend,
    lockCanvas,
    setLockCanvas,
    viewState,
    setViewState,
    globalSettings,
    setGlobalSettings,
    mode,
    setMode,
    selectedObject,
    setSelectedObject,
    selectedNodeIds,
    setSelectedNodeIds,
    drawFrom,
    restoreDrawState,
    clearSelection,
    clearDrawState,
    resetUndoHistory,
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
    [previousGraph, computedGraph]
  );
  const applyPreset = presetName => {
    const preset = GRAPH_PRESETS[presetName];
    if (!preset) return;
    const nextGraph = cloneJson(preset.graph);
    const nextSteps = cloneJson(preset.steps);
    replaceTimeline(nextGraph, nextSteps);
    setViewFromNodes(nextGraph.nodes);
    setStatus(`Loaded ${PRESET_STATUS_LABELS[presetName] ?? presetName}`);
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
      showLegend,
      setShowLegend,
      lockCanvas,
      setLockCanvas,
      onAddNode: addNode,
      onAutoLayout: applyLayout,
      onOpenParser: () => setIsParserOpen(true),
      onExportText: exportText,
      onExportProject: exportProject,
      onImportProjectFile: importProjectFile,
      onExportVideo: openExportVideoModal,
      onExportSlideshow: exportSlideshow,
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
      diff,
      selectedObject,
      selectedNodeIds: selectedNodeIdSet,
      drawFrom,
      mode,
      viewState,
      setViewState,
      showGrid,
      showLegend,
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
      onSelectEdge: edgeId => onSelectEdge(edgeId),
      onSelectNode: nodeId => onSelectNode(nodeId, false),
      onApplyToSelection: applyPatchToSelectedNodes,
      onDeleteSelection: deleteSelection,
      onUpdateGlobal: patch =>
        setGlobalSettings(prev => ({ ...prev, ...patch })),
    },
    timeline: {
      steps,
      currentFrame,
      onFrameChange: setCurrentFrame,
      onStepDurationChange: (index, value) =>
        updateStep(index, 'durationMs', value),
      onDescriptionChange: (index, value) =>
        updateStep(index, 'description', value),
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
        error: scriptError,
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
