'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import {
  DEFAULT_CAPTION_OVERLAY,
  getCaptionPresetFontSize,
  normalizeCaptionOverlay,
  resolveStepCaptionEnabled,
} from './graphStudio/lib/captionOverlay';
import {
  DEFAULT_CUSTOM_LEGEND,
  normalizeCustomLegend,
} from './graphStudio/lib/customLegend';
import {
  DEFAULT_EDGE_WIDTH,
  DEFAULT_NODE_SIZE,
  getDefaultEdgeLabelFontSize,
  getDefaultNodeLabelFontSize,
} from './graphStudio/lib/fontSizing';
import {
  hasOpenModal,
  isEditableKeyboardTarget,
} from './graphStudio/lib/keyboardTargets';
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

const STATUS_AUTO_DISMISS_MS = 4000;
const ERROR_STATUS_PATTERN = /\b(error|failed|failure|invalid|unsupported)\b/i;
const isOwnPatchKey = (patch, key) =>
  Object.prototype.hasOwnProperty.call(patch, key);

const isAutoFontSize = (value, autoValue) =>
  !Number.isFinite(Number(value)) || Math.abs(Number(value) - autoValue) < 0.01;

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
  const [captionOverlay, setCaptionOverlay] = useState(DEFAULT_CAPTION_OVERLAY);
  const normalizedCaptionOverlay = normalizeCaptionOverlay(captionOverlay);
  const currentCaptionOverlay = {
    ...normalizedCaptionOverlay,
    enabled: resolveStepCaptionEnabled(
      steps[currentFrame],
      normalizedCaptionOverlay
    ),
  };
  const [customLegend, setCustomLegend] = useState(DEFAULT_CUSTOM_LEGEND);
  const [isLegendEditorOpen, setIsLegendEditorOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const {
    viewState,
    setViewState,
    viewResetCounter,
    lockCanvas,
    setLockCanvas,
    setViewFromNodes,
    setZoomViewportSize,
    bumpViewReset,
    centerViewOnContent,
    zoomIn,
    zoomOut,
    setZoomPercent,
    zoomPercent,
  } = useGraphStudioView({
    initialNodes: seedTimeline.baseGraph.nodes,
  });
  const [status, setStatusState] = useState('');
  const setStatus = useCallback(nextStatus => {
    setStatusState(String(nextStatus ?? ''));
  }, []);
  const [globalSettings, setGlobalSettings] = useState({
    forceStrength: 1,
    edgeCurvature: 46,
    nodeSize: DEFAULT_NODE_SIZE,
    nodeLabelFontSize: getDefaultNodeLabelFontSize(DEFAULT_NODE_SIZE),
    edgeWidth: DEFAULT_EDGE_WIDTH,
    edgeLabelFontSize: getDefaultEdgeLabelFontSize(DEFAULT_EDGE_WIDTH),
  });
  const updateGlobalSettings = useCallback(patch => {
    setGlobalSettings(prev => {
      const previousNodeSize = Number.isFinite(Number(prev.nodeSize))
        ? Number(prev.nodeSize)
        : DEFAULT_NODE_SIZE;
      const previousEdgeWidth = Number.isFinite(Number(prev.edgeWidth))
        ? Number(prev.edgeWidth)
        : DEFAULT_EDGE_WIDTH;
      const next = { ...prev, ...patch };

      if (
        isOwnPatchKey(patch, 'nodeSize') &&
        !isOwnPatchKey(patch, 'nodeLabelFontSize') &&
        isAutoFontSize(
          prev.nodeLabelFontSize,
          getDefaultNodeLabelFontSize(previousNodeSize)
        )
      ) {
        next.nodeLabelFontSize = getDefaultNodeLabelFontSize(next.nodeSize);
      }

      if (
        isOwnPatchKey(patch, 'edgeWidth') &&
        !isOwnPatchKey(patch, 'edgeLabelFontSize') &&
        isAutoFontSize(
          prev.edgeLabelFontSize,
          getDefaultEdgeLabelFontSize(previousEdgeWidth)
        )
      ) {
        next.edgeLabelFontSize = getDefaultEdgeLabelFontSize(next.edgeWidth);
      }

      return next;
    });
  }, []);
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
  const previousFrameRef = useRef(currentFrame);
  useEffect(() => {
    if (previousFrameRef.current === currentFrame) return;
    previousFrameRef.current = currentFrame;
    clearDrawState();
  }, [clearDrawState, currentFrame]);
  const {
    isParserOpen,
    setIsParserOpen,
    parserText,
    parserError,
    setParserText,
    applyParserText,
    isProjectJsonPasteOpen,
    projectJsonPasteText,
    projectJsonPasteError,
    openProjectJsonPasteModal,
    closeProjectJsonPasteModal,
    setProjectJsonPasteText,
    importPastedProjectJson,
    isScriptOpen,
    setIsScriptOpen,
    scriptText,
    setScriptText,
    scriptError,
    isScriptRunning,
    runScript,
    isExportVideoOpen,
    exportText,
    exportProject,
    exportSlideshow,
    exportSvg,
    exportPng,
    pngScale,
    setPngScale,
    imageFraming,
    setImageFraming,
    exportFrameRange,
    updateExportFrameRange,
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
    captionOverlay,
    setCaptionOverlay,
    customLegend,
    setCustomLegend,
    lockCanvas,
    setLockCanvas,
    viewState,
    setViewState,
    setViewFromNodes,
    bumpViewReset,
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
    setIsExporting,
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
  useEffect(() => {
    if (!status || ERROR_STATUS_PATTERN.test(status)) return undefined;
    const timeout = window.setTimeout(
      () => setStatusState(''),
      STATUS_AUTO_DISMISS_MS
    );
    return () => window.clearTimeout(timeout);
  }, [status]);
  useEffect(() => {
    const onKeyDown = event => {
      if (
        event.defaultPrevented ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')
      ) {
        return;
      }

      const target = event.target;
      if (isEditableKeyboardTarget(target)) {
        return;
      }
      if (!target?.closest?.('[data-frame-navigation-surface="true"]')) {
        return;
      }

      event.preventDefault();
      const frameDelta = event.key === 'ArrowLeft' ? -1 : 1;
      setCurrentFrame(currentFrame + frameDelta);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [currentFrame, setCurrentFrame]);
  useEffect(() => {
    const onKeyDown = event => {
      if (
        event.defaultPrevented ||
        event.key !== 'Escape' ||
        isEditableKeyboardTarget(event.target) ||
        hasOpenModal()
      ) {
        return;
      }

      if (
        !selectedObject &&
        selectedNodeIds.length === 0 &&
        (drawFrom === null || drawFrom === undefined)
      ) {
        return;
      }

      event.preventDefault();
      clearSelection();
      clearDrawState();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    clearDrawState,
    clearSelection,
    drawFrom,
    selectedNodeIds.length,
    selectedObject,
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
    bumpViewReset();
    setMode('select');
    clearSelection();
    clearDrawState();
    setCustomLegend(prev =>
      normalizeCustomLegend({
        ...DEFAULT_CUSTOM_LEGEND,
        ...(preset.legend ?? {}),
        enabled: Boolean(prev?.enabled),
      })
    );
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
      customLegend,
      setCustomLegend,
      lockCanvas,
      setLockCanvas,
      onAutoLayout: applyLayout,
      onOpenParser: () => setIsParserOpen(true),
      onExportText: exportText,
      onExportProject: exportProject,
      onExportSvg: exportSvg,
      onExportPng: exportPng,
      pngScale,
      onPngScaleChange: setPngScale,
      imageFraming,
      onImageFramingChange: setImageFraming,
      exportFrameRange,
      onExportFrameRangeChange: updateExportFrameRange,
      onImportProjectFile: importProjectFile,
      onOpenProjectJsonPaste: openProjectJsonPasteModal,
      onExportVideo: openExportVideoModal,
      onExportSlideshow: exportSlideshow,
      onOpenLegendEditor: () => setIsLegendEditorOpen(true),
      isLegendEditorOpen,
      onOpenScript: () => setIsScriptOpen(true),
      onApplyPreset: applyPreset,
      currentFrame,
      totalFrames: frameCount,
      steps,
      getFrameGraph,
      onCenterView: centerViewOnContent,
      zoomPercent,
      onZoomIn: zoomIn,
      onZoomOut: zoomOut,
      onZoomCommit: setZoomPercent,
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
      customLegend,
      setCustomLegend,
      snapEnabled,
      lockCanvas,
      edgeRouting,
      edgeCurvature: globalSettings.edgeCurvature,
      nodeRadius: globalSettings.nodeSize,
      edgeWidth: globalSettings.edgeWidth,
      nodeLabelFontSize: globalSettings.nodeLabelFontSize,
      edgeLabelFontSize: globalSettings.edgeLabelFontSize,
      resetViewTrigger: viewResetCounter,
      onSelectNode,
      onSelectEdge,
      onSelectNodes,
      onBackgroundClear,
      onNodePointerDown,
      onNodeMove,
      onNodePointerUp,
      onNodeClickForDraw,
      onCanvasAddNode: addNodeAt,
      onViewportSizeChange: setZoomViewportSize,
      captionOverlay: currentCaptionOverlay,
      baseCaptionOverlay: normalizedCaptionOverlay,
      setCaptionOverlay,
      captionText: steps[currentFrame]?.description ?? '',
      isExporting,
    },
    property: {
      selectedNode,
      selectedEdge,
      connectedEdges: nodeConnectedEdges,
      connectedNodes: edgeConnectedNodes,
      multiSelection: selectedNodeIds,
      globalSettings,
      edgeRouting,
      onUpdateNode: updateSelectedNode,
      onUpdateEdge: updateSelectedEdge,
      onSelectEdge: edgeId => onSelectEdge(edgeId),
      onSelectNode: nodeId => onSelectNode(nodeId, false),
      onApplyToSelection: applyPatchToSelectedNodes,
      onDeleteSelection: deleteSelection,
      onClearSelection: clearSelection,
      onUpdateGlobal: updateGlobalSettings,
    },
    timeline: {
      steps,
      currentFrame,
      onFrameChange: setCurrentFrame,
      onStepDurationChange: (index, value) =>
        updateStep(index, 'durationMs', value),
      onDescriptionChange: (index, value) =>
        updateStep(index, 'description', value),
      captionEnabled: currentCaptionOverlay.enabled,
      captionStyle: normalizedCaptionOverlay.style,
      captionSize: normalizedCaptionOverlay.size,
      captionFontSize: normalizedCaptionOverlay.fontSize,
      onCaptionEnabledChange: enabled =>
        updateStep(currentFrame, 'captionVisible', enabled),
      onCaptionStyleChange: style =>
        setCaptionOverlay(prev => ({
          ...normalizeCaptionOverlay(prev),
          style,
        })),
      onCaptionSizeChange: size =>
        setCaptionOverlay(prev => {
          const normalized = normalizeCaptionOverlay(prev);
          const isPresetFontSize =
            normalized.fontSize === getCaptionPresetFontSize(normalized.size);
          return {
            ...normalized,
            size,
            fontSize: isPresetFontSize
              ? getCaptionPresetFontSize(size)
              : normalized.fontSize,
          };
        }),
      onCaptionFontSizeChange: fontSize =>
        setCaptionOverlay(prev => ({
          ...normalizeCaptionOverlay(prev),
          fontSize,
        })),
      onAddStep: () => {
        addStep(currentFrame);
        setCurrentFrame(currentFrame + 1, frameCount + 1);
      },
      onDuplicateStep: () => {
        duplicateStep(currentFrame);
        setCurrentFrame(currentFrame + 1, frameCount + 1);
      },
      onDeleteStep: () => {
        if (steps.length <= 1) return;
        removeStep(currentFrame);
        setCurrentFrame(Math.max(0, currentFrame - 1));
      },
      onMoveStep: (fromIndex, toIndex) => {
        moveStep(fromIndex, toIndex);
        setCurrentFrame(toIndex);
      },
      onPlay: togglePlayback,
      isPlaying,
    },
    modals: {
      parser: {
        open: isParserOpen,
        text: parserText,
        error: parserError,
        onTextChange: setParserText,
        onClose: () => setIsParserOpen(false),
        onSubmit: applyParserText,
      },
      projectJsonPaste: {
        open: isProjectJsonPasteOpen,
        text: projectJsonPasteText,
        error: projectJsonPasteError,
        onTextChange: setProjectJsonPasteText,
        onClose: closeProjectJsonPasteModal,
        onSubmit: importPastedProjectJson,
      },
      script: {
        open: isScriptOpen,
        text: scriptText,
        onTextChange: setScriptText,
        onClose: () => setIsScriptOpen(false),
        onSubmit: runScript,
        error: scriptError,
        isRunning: isScriptRunning,
      },
      exportVideo: {
        open: isExportVideoOpen,
        onClose: closeExportVideoModal,
        onExport: confirmExportVideo,
      },
      legend: {
        open: isLegendEditorOpen,
        customLegend,
        setCustomLegend,
        onClose: () => setIsLegendEditorOpen(false),
      },
    },
    status,
  };

  return <GraphStudioLayout {...layoutProps} />;
};
export default GraphStudioVisualizer;
