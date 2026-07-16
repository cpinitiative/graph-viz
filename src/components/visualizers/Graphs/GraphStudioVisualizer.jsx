'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTheme } from '../../../context/useTheme';
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
import { getFrameOverrideState } from './graphStudio/lib/temporalGraphState';
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

const isRecord = value =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const getOverrideEntry = (step, mapKey, objectId) => {
  const overrideMap = isRecord(step?.[mapKey]) ? step[mapKey] : {};
  const entry = overrideMap[String(objectId)];
  return isRecord(entry) ? entry : {};
};

const getObjectName = (objectType, objectId) =>
  `${objectType === 'node' ? 'Node' : 'Edge'} ${objectId}`;

const isAutoFontSize = (value, autoValue) =>
  !Number.isFinite(Number(value)) || Math.abs(Number(value) - autoValue) < 0.01;

const GraphStudioVisualizer = ({ snapshot }) => {
  const { theme } = useTheme();
  const seedTimeline = useMemo(
    () =>
      normalizeTimelinePayload(
        snapshot?.initialAnimation ?? snapshot?.initialGraph
      ),
    [snapshot]
  );
  const playbackStopRef = useRef(null);
  const stopPlaybackBeforeTimelineMutation = useCallback(() => {
    playbackStopRef.current?.();
  }, []);
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
  } = useGraphAnimation(seedTimeline.baseGraph, seedTimeline.steps, {
    onBeforeTimelineMutation: stopPlaybackBeforeTimelineMutation,
  });
  const [mode, setMode] = useState('select');
  const [edgeRouting, setEdgeRouting] = useState(EDGE_ROUTING.straight);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
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
  const {
    viewState,
    setViewState,
    viewResetCounter,
    lockCanvas,
    setLockCanvas,
    setViewFromNodes,
    setZoomViewportSize,
    getZoomViewportSize,
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
  const updateSnapEnabled = useCallback(enabled => {
    const nextEnabled = Boolean(enabled);
    setSnapEnabled(nextEnabled);
    if (nextEnabled) setShowGrid(true);
  }, []);
  const updateShowGrid = useCallback(visible => {
    const nextVisible = Boolean(visible);
    setShowGrid(nextVisible);
    if (!nextVisible) setSnapEnabled(false);
  }, []);
  const updateLockCanvas = useCallback(
    locked => {
      const nextLocked = Boolean(locked);
      setLockCanvas(nextLocked);
      setStatus(nextLocked ? 'View locked' : 'View unlocked');
    },
    [setLockCanvas, setStatus]
  );
  const handleCenterView = useCallback(() => {
    if (lockCanvas) {
      setStatus('Unlock view to change the viewport');
      return;
    }
    const didFit = centerViewOnContent();
    setStatus(
      didFit ? 'View fit to graph' : 'Unlock view to change the viewport'
    );
  }, [centerViewOnContent, lockCanvas, setStatus]);
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
  const undoSettings = useMemo(
    () => ({
      edgeRouting,
      snapEnabled,
      showGrid,
      captionOverlay,
      customLegend,
      lockCanvas,
      globalSettings,
    }),
    [
      captionOverlay,
      customLegend,
      edgeRouting,
      globalSettings,
      lockCanvas,
      showGrid,
      snapEnabled,
    ]
  );
  const restoreUndoSettings = useCallback(
    settings => {
      if (!isRecord(settings)) return;
      setEdgeRouting(settings.edgeRouting);
      setSnapEnabled(Boolean(settings.snapEnabled));
      setShowGrid(Boolean(settings.showGrid));
      setCaptionOverlay(settings.captionOverlay);
      setCustomLegend(settings.customLegend);
      setLockCanvas(Boolean(settings.lockCanvas));
      setGlobalSettings(settings.globalSettings);
    },
    [setLockCanvas]
  );
  const { resetUndoHistory } = useGraphStudioUndo({
    baseGraph,
    steps,
    settings: undoSettings,
    currentFrame,
    replaceTimeline,
    restoreSettings: restoreUndoSettings,
    setStatus,
  });
  const { isPlaying, stopTimeline, setPlaybackLocked, togglePlayback } =
    useGraphStudioPlayback({
      steps,
      currentFrame,
      setCurrentFrame,
      setStatus,
    });
  useEffect(() => {
    playbackStopRef.current = stopTimeline;
    return () => {
      playbackStopRef.current = null;
    };
  }, [stopTimeline]);
  const navigateToFrame = useCallback(
    (frame, nextFrameCount) => {
      stopTimeline();
      setCurrentFrame(frame, nextFrameCount);
    },
    [setCurrentFrame, stopTimeline]
  );
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
  } = useGraphStudioSelection({ baseGraph, computedGraph });
  const {
    updateBaseNode,
    updateBaseNodesBulk,
    updateBaseEdge,
    setFrameOverride,
    resetFrameOverride,
    applyTemporalPropertyToAllFrames,
    setTemporalVisibility,
    setTemporalVisibilityFromFrame,
    setTemporalVisibilityForObjects,
    setTemporalVisibilityForObjectsFromFrame,
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
  const {
    updateSelectedNode,
    updateSelectedEdge,
    applyPatchToSelectedNodes,
    resetSelectedNodeOverride,
    resetSelectedEdgeOverride,
    applySelectedNodeToAllFrames,
    applySelectedEdgeToAllFrames,
    setSelectedNodeVisibilityForFrame,
    setSelectedNodeVisibilityFromFrame,
    setSelectedNodesVisibilityForFrame,
    setSelectedNodesVisibilityFromFrame,
    setSelectedEdgeVisibilityForFrame,
    setSelectedEdgeVisibilityFromFrame,
  } = useGraphStudioSelectionPatchers({
    selectedNode,
    selectedEdge,
    selectedNodeIds,
    updateBaseNode,
    updateBaseEdge,
    setFrameOverride,
    resetFrameOverride,
    applyTemporalPropertyToAllFrames,
    setTemporalVisibility,
    setTemporalVisibilityFromFrame,
    setTemporalVisibilityForObjects,
    setTemporalVisibilityForObjectsFromFrame,
    currentFrame,
    setStatus,
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
    computedGraph,
    addEdge,
    updateBaseNodesBulk,
    selectedNodeIds,
    selectedNodeIdSet,
    setSelectedObject,
    setSelectedNodeIds,
    clearSelection,
    currentFrame,
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
    exportCapture,
    exportFrameIndex,
    setExportFrameIndex,
    isVisualExporting,
    beginExportReview,
    endExportReview,
    importProjectFile,
    openExportVideoModal,
    closeExportVideoModal,
    confirmExportVideo,
  } = useGraphStudioImportExport({
    baseGraph,
    steps,
    currentFrame,
    getFrameGraph,
    replaceTimeline,
    setStatus,
    edgeRouting,
    setEdgeRouting,
    snapEnabled,
    setSnapEnabled: updateSnapEnabled,
    showGrid,
    setShowGrid: updateShowGrid,
    captionOverlay,
    setCaptionOverlay,
    customLegend,
    setCustomLegend,
    lockCanvas,
    setLockCanvas,
    viewState,
    getZoomViewportSize,
    setViewState,
    setViewFromNodes,
    bumpViewReset,
    globalSettings,
    theme,
    setGlobalSettings,
    setMode,
    clearSelection,
    clearDrawState,
    resetUndoHistory,
    stopTimeline,
    setPlaybackLocked,
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
      navigateToFrame(currentFrame + frameDelta);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [currentFrame, navigateToFrame]);
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
  const currentStep = useMemo(
    () => steps[currentFrame] ?? {},
    [currentFrame, steps]
  );
  const currentNodeMap = useMemo(
    () => new Map(computedGraph.nodes.map(node => [String(node.id), node])),
    [computedGraph.nodes]
  );
  const presenceRecoveryEntries = useMemo(() => {
    const entries = [];
    computedGraph.nodes.forEach(node => {
      const override = getOverrideEntry(currentStep, 'nodeOverrides', node.id);
      const hasVisibleOverride = isOwnPatchKey(override, 'visible');
      const isOwnNotShown =
        override.visible === false ||
        (!hasVisibleOverride && node.visible === false);

      if (!isOwnNotShown) return;
      entries.push({
        type: 'node',
        id: node.id,
        label: getObjectName('node', node.id),
      });
    });

    computedGraph.edges.forEach(edge => {
      const override = getOverrideEntry(currentStep, 'edgeOverrides', edge.id);
      const hasVisibleOverride = isOwnPatchKey(override, 'visible');
      const isOwnNotShown =
        override.visible === false ||
        (!hasVisibleOverride && edge.visible === false);

      if (!isOwnNotShown) return;

      const endpointNodes = [
        currentNodeMap.get(String(edge.from)),
        currentNodeMap.get(String(edge.to)),
      ].filter(Boolean);
      const notShownEndpoints = endpointNodes.filter(
        node => node.visible === false
      );
      const endpointNote =
        notShownEndpoints.length === 1
          ? `Also waiting on Node ${notShownEndpoints[0].id}`
          : notShownEndpoints.length > 1
            ? 'Also waiting on endpoints'
            : '';

      entries.push({
        type: 'edge',
        id: edge.id,
        label: getObjectName('edge', edge.id),
        note: endpointNote,
      });
    });

    return entries;
  }, [computedGraph.nodes, computedGraph.edges, currentNodeMap, currentStep]);
  const selectedNotShownNodeCount = useMemo(
    () =>
      selectedNodeIds.reduce(
        (count, id) =>
          count + (currentNodeMap.get(String(id))?.visible === false ? 1 : 0),
        0
      ),
    [currentNodeMap, selectedNodeIds]
  );
  const inspectorPresenceRecoveryKeys = useMemo(() => {
    const keys = new Set();
    if (selectedNodeIds.length > 1) {
      selectedNodeIds.forEach(id => keys.add(`node:${String(id)}`));
      return keys;
    }
    if (selectedNode) keys.add(`node:${String(selectedNode.id)}`);
    if (selectedEdge) keys.add(`edge:${String(selectedEdge.id)}`);
    return keys;
  }, [selectedEdge, selectedNode, selectedNodeIds]);
  const compactPresenceRecoveryEntries = useMemo(
    () =>
      presenceRecoveryEntries.filter(
        entry =>
          !inspectorPresenceRecoveryKeys.has(
            `${entry.type}:${String(entry.id)}`
          )
      ),
    [inspectorPresenceRecoveryKeys, presenceRecoveryEntries]
  );
  const showPresenceForFrame = useCallback(
    (objectType, objectId) => {
      setTemporalVisibility?.(objectType, objectId, true);
      setStatus(
        `${getObjectName(objectType, objectId)} shown on Frame ${currentFrame + 1}`
      );
    },
    [currentFrame, setStatus, setTemporalVisibility]
  );
  const showPresenceFromFrame = useCallback(
    (objectType, objectId) => {
      setTemporalVisibilityFromFrame?.(objectType, objectId, true);
      setStatus(
        `${getObjectName(objectType, objectId)} shown from Frame ${currentFrame + 1} onward`
      );
    },
    [currentFrame, setStatus, setTemporalVisibilityFromFrame]
  );
  const selectedNodeFrameOverrides = useMemo(
    () =>
      selectedNode
        ? getFrameOverrideState(currentStep, 'node', selectedNode.id, [
            'color',
            'status',
            'visible',
          ])
        : {},
    [currentStep, selectedNode]
  );
  const selectedEdgeFrameOverrides = useMemo(
    () =>
      selectedEdge
        ? getFrameOverrideState(currentStep, 'edge', selectedEdge.id, [
            'color',
            'visible',
          ])
        : {},
    [currentStep, selectedEdge]
  );
  const hasCaptionVisibleOverride =
    isOwnPatchKey(currentStep, 'captionVisible') ||
    isOwnPatchKey(currentStep, 'showCaption');
  const resetCaptionVisibleOverride = useCallback(() => {
    updateStep(currentFrame, step => {
      const next = { ...step };
      delete next.captionVisible;
      delete next.showCaption;
      return next;
    });
    setStatus(`Caption visibility reset for Frame ${currentFrame + 1}`);
  }, [currentFrame, setStatus, updateStep]);
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
  const handleAutoLayout = useCallback(
    type => {
      const nextGraph = applyLayout(type);
      if (!lockCanvas && nextGraph?.nodes) {
        setViewFromNodes(nextGraph.nodes);
        bumpViewReset();
      }
    },
    [applyLayout, bumpViewReset, lockCanvas, setViewFromNodes]
  );

  const layoutProps = {
    exportCapture,
    presenceRecovery: {
      entries: compactPresenceRecoveryEntries,
      onShowHere: showPresenceForFrame,
      onShowOnward: showPresenceFromFrame,
    },
    sidebar: {
      mode,
      setMode: handleSetMode,
      drawFrom,
      onDrawEdge: startDrawEdge,
      snapEnabled,
      setSnapEnabled: updateSnapEnabled,
      showGrid,
      setShowGrid: updateShowGrid,
      customLegend,
      setCustomLegend,
      lockCanvas,
      setLockCanvas: updateLockCanvas,
      onAutoLayout: handleAutoLayout,
      forceStrength: globalSettings.forceStrength,
      onForceStrengthChange: forceStrength =>
        updateGlobalSettings({ forceStrength }),
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
      exportFrameIndex,
      onExportFrameChange: setExportFrameIndex,
      isVisualExporting,
      onBeginExportReview: beginExportReview,
      onEndExportReview: endExportReview,
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
      onCenterView: handleCenterView,
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
    },
    property: {
      selectedNode,
      selectedEdge,
      connectedEdges: nodeConnectedEdges,
      connectedNodes: edgeConnectedNodes,
      multiSelection: selectedNodeIds,
      multiSelectionNotShownCount: selectedNotShownNodeCount,
      globalSettings,
      edgeRouting,
      nodeFrameOverrides: selectedNodeFrameOverrides,
      edgeFrameOverrides: selectedEdgeFrameOverrides,
      onUpdateNode: updateSelectedNode,
      onUpdateEdge: updateSelectedEdge,
      onResetNodeOverride: resetSelectedNodeOverride,
      onResetEdgeOverride: resetSelectedEdgeOverride,
      onApplyNodeToAllFrames: applySelectedNodeToAllFrames,
      onApplyEdgeToAllFrames: applySelectedEdgeToAllFrames,
      onSetNodeVisibilityForFrame: setSelectedNodeVisibilityForFrame,
      onSetNodeVisibilityFromFrame: setSelectedNodeVisibilityFromFrame,
      onSetEdgeVisibilityForFrame: setSelectedEdgeVisibilityForFrame,
      onSetEdgeVisibilityFromFrame: setSelectedEdgeVisibilityFromFrame,
      onSetSelectionVisibilityForFrame: setSelectedNodesVisibilityForFrame,
      onSetSelectionVisibilityFromFrame: setSelectedNodesVisibilityFromFrame,
      onSelectEdge: edgeId => onSelectEdge(edgeId),
      onSelectNode: nodeId => onSelectNode(nodeId, false),
      onApplyToSelection: applyPatchToSelectedNodes,
      onDeleteSelection: deleteSelection,
      onClearSelection: clearSelection,
      onUpdateGlobal: updateGlobalSettings,
      onEdgeRoutingChange: setEdgeRouting,
    },
    timeline: {
      steps,
      currentFrame,
      onFrameChange: navigateToFrame,
      onStepDurationChange: (index, value) =>
        updateStep(index, 'durationMs', value),
      onDescriptionChange: (index, value) =>
        updateStep(index, 'description', value),
      captionEnabled: currentCaptionOverlay.enabled,
      captionStyle: normalizedCaptionOverlay.style,
      captionSize: normalizedCaptionOverlay.size,
      captionFontSize: normalizedCaptionOverlay.fontSize,
      hasCaptionVisibleOverride,
      onCaptionEnabledChange: enabled => {
        updateStep(currentFrame, 'captionVisible', enabled);
        setStatus(`Caption visibility updated for Frame ${currentFrame + 1}`);
      },
      onResetCaptionVisibleOverride: resetCaptionVisibleOverride,
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
        setStatus(
          `Frame ${currentFrame + 2} created from current visual state`
        );
      },
      onDuplicateStep: () => {
        duplicateStep(currentFrame);
        setCurrentFrame(currentFrame + 1, frameCount + 1);
        setStatus(`Frame ${currentFrame + 2} duplicated exactly`);
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
      playbackDisabled: isVisualExporting,
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
