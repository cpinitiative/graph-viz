import { useCallback, useMemo, useRef, useState } from 'react';
import { DEFAULT_SCRIPT } from '../data/defaultScript';
import {
  exportEdgeListText,
  parseEdgeListText,
  runScriptTrace,
} from '../graphStudioUtils';
import { normalizeCaptionOverlay } from '../lib/captionOverlay';
import { normalizeCustomLegend } from '../lib/customLegend';
import {
  clampExportFrameRange,
  DEFAULT_EXPORT_FRAME_RANGE,
  resolveExportFrameIndexes,
} from '../lib/exportFrameRange';
import { exportTimelineSlideshow } from '../lib/exportTimelineSlideshow';
import { exportTimelineVideo } from '../lib/exportTimelineVideo';
import {
  downloadProjectJson,
  exportProjectJson,
  parseProjectJson,
} from '../lib/projectJson';
import {
  DEFAULT_PNG_SCALE,
  exportCurrentFramePng,
  exportCurrentFrameSvg,
  IMAGE_FRAMING,
  waitForFrameRender,
} from '../lib/timelineFrameCapture';

export const useGraphStudioImportExport = ({
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
}) => {
  const [isParserOpen, setIsParserOpen] = useState(false);
  const [parserText, setParserText] = useState('');
  const [isProjectJsonPasteOpen, setIsProjectJsonPasteOpen] = useState(false);
  const [projectJsonPasteText, setProjectJsonPasteText] = useState('');
  const [projectJsonPasteError, setProjectJsonPasteError] = useState('');
  const [isScriptOpen, setIsScriptOpen] = useState(false);
  const [scriptText, setScriptText] = useState(DEFAULT_SCRIPT);
  const [scriptError, setScriptError] = useState('');
  const isScriptRunningRef = useRef(false);
  const [isScriptRunning, setIsScriptRunning] = useState(false);
  const [isExportVideoOpen, setIsExportVideoOpen] = useState(false);
  const [pngScale, setPngScale] = useState(DEFAULT_PNG_SCALE);
  const [imageFraming, setImageFraming] = useState(IMAGE_FRAMING.viewport);
  const [exportFrameRangeState, setExportFrameRangeState] = useState(() => ({
    ...DEFAULT_EXPORT_FRAME_RANGE,
    endFrame: Math.max(1, steps.length),
  }));
  const exportFrameRange = useMemo(() => {
    const clamped = clampExportFrameRange(exportFrameRangeState, steps.length);
    if (clamped.mode === 'range') return clamped;
    return {
      ...clamped,
      startFrame: 1,
      endFrame: Math.max(1, steps.length),
    };
  }, [exportFrameRangeState, steps.length]);

  const updateExportFrameRange = useCallback(
    patch => {
      setExportFrameRangeState(prev =>
        clampExportFrameRange({ ...prev, ...patch }, steps.length)
      );
    },
    [steps.length]
  );

  const getExportFrameIndexes = useCallback(
    () =>
      resolveExportFrameIndexes({
        frameCount: steps.length,
        currentFrame,
        range: exportFrameRange,
      }),
    [currentFrame, exportFrameRange, steps.length]
  );

  const enableExportCanvas = useCallback(async () => {
    setIsExporting?.(true);
    await waitForFrameRender();
  }, [setIsExporting]);

  const disableExportCanvas = useCallback(async () => {
    setIsExporting?.(false);
    await waitForFrameRender();
  }, [setIsExporting]);

  const applyParserText = useCallback(() => {
    try {
      const { graph, meta } = parseEdgeListText(parserText);
      replaceTimeline(graph, [
        {
          id: 'step-0',
          description: 'Parsed input',
          durationMs: 600,
          nodeOverrides: {},
          edgeOverrides: {},
        },
      ]);
      setMode('select');
      clearSelection?.();
      clearDrawState?.();
      setIsParserOpen(false);
      setStatus(`Graph parsed: ${meta}`);
    } catch (error) {
      setStatus(`Parse failed: ${error.message}`);
    }
  }, [
    clearDrawState,
    clearSelection,
    parserText,
    replaceTimeline,
    setMode,
    setStatus,
  ]);

  const exportText = useCallback(async () => {
    const output = exportEdgeListText(baseGraph);
    try {
      await navigator.clipboard.writeText(output);
      setStatus('Edge list copied to clipboard');
    } catch {
      setStatus('Clipboard unavailable; open parser and paste manually');
      setIsParserOpen(true);
      setParserText(output);
    }
  }, [baseGraph, setStatus]);

  const exportProject = useCallback(() => {
    const payload = exportProjectJson({
      baseGraph,
      steps,
      currentFrame,
      settings: {
        edgeRouting,
        snapEnabled,
        showGrid,
        captionOverlay: normalizeCaptionOverlay(captionOverlay),
        customLegend: normalizeCustomLegend(customLegend),
        lockCanvas,
        viewState,
        globalSettings,
      },
    });
    downloadProjectJson(payload);
    setStatus('Project exported');
  }, [
    baseGraph,
    currentFrame,
    captionOverlay,
    customLegend,
    edgeRouting,
    globalSettings,
    lockCanvas,
    setStatus,
    showGrid,
    snapEnabled,
    steps,
    viewState,
  ]);

  const exportSvg = useCallback(async () => {
    setStatus('Exporting SVG...');
    try {
      await enableExportCanvas();
      await exportCurrentFrameSvg({ framingMode: imageFraming });
      setStatus('SVG exported');
    } catch (error) {
      console.error(error);
      setStatus(`SVG export error: ${error.message}`);
    } finally {
      await disableExportCanvas();
    }
  }, [disableExportCanvas, enableExportCanvas, imageFraming, setStatus]);

  const exportPng = useCallback(async () => {
    setStatus('Exporting PNG...');
    try {
      await enableExportCanvas();
      await exportCurrentFramePng({
        pngScale,
        framingMode: imageFraming,
      });
      setStatus('PNG exported');
    } catch (error) {
      console.error(error);
      setStatus(`PNG export error: ${error.message}`);
    } finally {
      await disableExportCanvas();
    }
  }, [
    disableExportCanvas,
    enableExportCanvas,
    imageFraming,
    pngScale,
    setStatus,
  ]);

  const applyProjectPayload = useCallback(
    project => {
      replaceTimeline(
        project.graph,
        project.timeline.steps,
        project.timeline.currentFrame
      );
      setEdgeRouting(project.settings.edgeRouting);
      setSnapEnabled(project.settings.snapEnabled);
      setShowGrid(project.settings.showGrid);
      setCaptionOverlay(project.settings.captionOverlay);
      setCustomLegend(project.settings.customLegend);
      setLockCanvas(project.settings.lockCanvas);
      setGlobalSettings(project.settings.globalSettings);
      if (project.settings.viewState) {
        setViewState(project.settings.viewState);
        // Reapply after timeline replacement so GraphCanvas does not reset the imported viewport.
        window.setTimeout(() => setViewState(project.settings.viewState), 0);
      }
      setMode('select');
      clearSelection?.();
      clearDrawState?.();
      resetUndoHistory?.();
      setStatus('Project imported');
    },
    [
      clearDrawState,
      clearSelection,
      replaceTimeline,
      resetUndoHistory,
      setEdgeRouting,
      setGlobalSettings,
      setLockCanvas,
      setMode,
      setShowGrid,
      setCaptionOverlay,
      setCustomLegend,
      setSnapEnabled,
      setStatus,
      setViewState,
    ]
  );

  const importProjectJsonText = useCallback(
    text => {
      const project = parseProjectJson(text);
      applyProjectPayload(project);
    },
    [applyProjectPayload]
  );

  const importProjectFile = useCallback(
    async file => {
      if (!file) return;
      try {
        importProjectJsonText(await file.text());
      } catch (error) {
        setStatus(`Project import error: ${error.message}`);
      }
    },
    [importProjectJsonText, setStatus]
  );

  const openProjectJsonPasteModal = useCallback(() => {
    setProjectJsonPasteText('');
    setProjectJsonPasteError('');
    setIsProjectJsonPasteOpen(true);
  }, []);

  const closeProjectJsonPasteModal = useCallback(() => {
    setIsProjectJsonPasteOpen(false);
    setProjectJsonPasteText('');
    setProjectJsonPasteError('');
  }, []);

  const updateProjectJsonPasteText = useCallback(text => {
    setProjectJsonPasteText(text);
    setProjectJsonPasteError('');
  }, []);

  const importPastedProjectJson = useCallback(() => {
    try {
      if (!projectJsonPasteText.trim()) {
        throw new Error('Paste project JSON before importing.');
      }
      importProjectJsonText(projectJsonPasteText);
      setIsProjectJsonPasteOpen(false);
      setProjectJsonPasteText('');
      setProjectJsonPasteError('');
    } catch (error) {
      const message = `Project import error: ${error.message}`;
      setProjectJsonPasteError(message);
      setStatus(message);
    }
  }, [importProjectJsonText, projectJsonPasteText, setStatus]);

  const exportVideo = useCallback(async () => {
    const frameIndexes = getExportFrameIndexes();
    if (!frameIndexes.length) {
      setStatus('Export failed: no timeline frames to export');
      return;
    }

    const originalFrame = currentFrame;
    setStatus('Exporting video...');
    try {
      await enableExportCanvas();
      await exportTimelineVideo({
        steps,
        setCurrentFrame,
        frameIndexes,
      });
      setStatus('Video exported successfully');
    } catch (error) {
      console.error(error);
      setStatus(`Export failed: ${error.message}`);
    } finally {
      setCurrentFrame(originalFrame);
      await waitForFrameRender();
      await disableExportCanvas();
    }
  }, [
    currentFrame,
    disableExportCanvas,
    enableExportCanvas,
    getExportFrameIndexes,
    setCurrentFrame,
    setStatus,
    steps,
  ]);

  const exportSlideshow = useCallback(async () => {
    if (!steps.length) {
      setStatus('Slideshow export error: no timeline frames to export');
      return;
    }

    const originalFrame = currentFrame;
    const originalViewState = viewState ? { ...viewState } : null;
    const originalMode = mode;
    const originalSelectedObject = selectedObject
      ? { ...selectedObject }
      : null;
    const originalSelectedNodeIds = [...selectedNodeIds];
    const originalDrawFrom = drawFrom;
    const frameIndexes = getExportFrameIndexes();
    if (!frameIndexes.length) {
      setStatus('Slideshow export error: no timeline frames to export');
      return;
    }

    const restoreViewState = () => {
      if (!originalViewState) return;
      setViewState(originalViewState);
      window.setTimeout(() => setViewState(originalViewState), 0);
      window.requestAnimationFrame?.(() => setViewState(originalViewState));
    };

    setStatus('Exporting slideshow...');
    try {
      await enableExportCanvas();
      await exportTimelineSlideshow({
        steps,
        currentFrame,
        setCurrentFrame,
        frameIndexes,
        framingMode: imageFraming,
      });
      setStatus('Slideshow exported');
    } catch (error) {
      console.error(error);
      setStatus(`Slideshow export error: ${error.message}`);
    } finally {
      setCurrentFrame(originalFrame);
      restoreViewState();
      setMode(originalMode);
      setSelectedObject(originalSelectedObject);
      setSelectedNodeIds(originalSelectedNodeIds);
      restoreDrawState?.(originalDrawFrom);
      await disableExportCanvas();
    }
  }, [
    currentFrame,
    disableExportCanvas,
    drawFrom,
    enableExportCanvas,
    getExportFrameIndexes,
    imageFraming,
    mode,
    restoreDrawState,
    selectedNodeIds,
    selectedObject,
    setCurrentFrame,
    setMode,
    setSelectedNodeIds,
    setSelectedObject,
    setStatus,
    setViewState,
    steps,
    viewState,
  ]);

  const setScriptModalOpen = useCallback(open => {
    setIsScriptOpen(open);
    if (open) setScriptError('');
  }, []);

  const updateScriptText = useCallback(value => {
    setScriptText(value);
    setScriptError('');
  }, []);

  const runScript = useCallback(async () => {
    if (isScriptRunningRef.current) return;
    isScriptRunningRef.current = true;
    setIsScriptRunning(true);
    setScriptError('');
    setStatus('Running script...');
    try {
      const traceSteps = await runScriptTrace({
        code: scriptText,
        graph: baseGraph,
      });
      replaceTimeline(baseGraph, traceSteps);
      setMode('select');
      clearSelection?.();
      clearDrawState?.();
      setIsScriptOpen(false);
      setScriptError('');
      setStatus(`Script generated ${traceSteps.length} frames`);
    } catch (error) {
      const message = `Script error: ${error.message}`;
      setScriptError(previous => (previous === message ? previous : message));
      setStatus(message);
    } finally {
      isScriptRunningRef.current = false;
      setIsScriptRunning(false);
    }
  }, [
    baseGraph,
    clearDrawState,
    clearSelection,
    replaceTimeline,
    scriptText,
    setMode,
    setStatus,
  ]);

  const openExportVideoModal = useCallback(() => {
    setIsExportVideoOpen(true);
  }, []);

  const closeExportVideoModal = useCallback(() => {
    setIsExportVideoOpen(false);
  }, []);

  const confirmExportVideo = useCallback(() => {
    setIsExportVideoOpen(false);
    exportVideo();
  }, [exportVideo]);

  return {
    isParserOpen,
    setIsParserOpen,
    parserText,
    setParserText,
    applyParserText,
    isProjectJsonPasteOpen,
    projectJsonPasteText,
    projectJsonPasteError,
    openProjectJsonPasteModal,
    closeProjectJsonPasteModal,
    setProjectJsonPasteText: updateProjectJsonPasteText,
    importPastedProjectJson,
    isScriptOpen,
    setIsScriptOpen: setScriptModalOpen,
    scriptText,
    setScriptText: updateScriptText,
    scriptError,
    isScriptRunning,
    runScript,
    isExportVideoOpen,
    exportVideo,
    exportSlideshow,
    exportSvg,
    exportPng,
    pngScale,
    setPngScale,
    imageFraming,
    setImageFraming,
    exportText,
    exportProject,
    exportFrameRange,
    updateExportFrameRange,
    importProjectFile,
    openExportVideoModal,
    closeExportVideoModal,
    confirmExportVideo,
  };
};
