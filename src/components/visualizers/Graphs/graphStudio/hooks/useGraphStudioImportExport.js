import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { DEFAULT_FRAME_DURATION_MS } from '../lib/frameDuration';
import {
  downloadProjectJson,
  exportProjectJson,
  parseProjectJson,
} from '../lib/projectJson';
import {
  DEFAULT_PNG_SCALE,
  EXPORT_CAPTURE_SVG_ELEMENT_ID,
  exportCurrentFramePng,
  exportCurrentFrameSvg,
  getGraphSvgElement,
  IMAGE_FRAMING,
  waitForExportReady,
} from '../lib/timelineFrameCapture';

const cloneJson = value => JSON.parse(JSON.stringify(value ?? null));

const validateExportFrameIndex = (frameIndex, frameCount) => {
  const numericFrame = Number(frameIndex);
  if (
    !Number.isInteger(numericFrame) ||
    numericFrame < 0 ||
    numericFrame >= frameCount
  ) {
    throw new Error(`Invalid export frame ${String(frameIndex)}`);
  }
  return numericFrame;
};

export const useGraphStudioImportExport = ({
  baseGraph,
  steps,
  currentFrame,
  getFrameGraph,
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
}) => {
  const getExportCanvasSnapshot = useCallback(
    () => ({
      viewState: cloneJson(viewState),
      viewportSize: cloneJson(getZoomViewportSize?.()),
      edgeRouting,
      edgeCurvature: globalSettings?.edgeCurvature,
      nodeRadius: globalSettings?.nodeSize,
      edgeWidth: globalSettings?.edgeWidth,
      nodeLabelFontSize: globalSettings?.nodeLabelFontSize,
      edgeLabelFontSize: globalSettings?.edgeLabelFontSize,
      theme,
      baseCaptionOverlay: normalizeCaptionOverlay(captionOverlay),
      customLegend: normalizeCustomLegend(customLegend),
    }),
    [
      captionOverlay,
      customLegend,
      edgeRouting,
      getZoomViewportSize,
      globalSettings,
      theme,
      viewState,
    ]
  );
  const [isParserOpen, setIsParserOpen] = useState(false);
  const [parserText, setParserText] = useState('');
  const [parserError, setParserError] = useState('');
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
  const [imageFraming, setImageFraming] = useState(IMAGE_FRAMING.fit);
  const captureTokenRef = useRef(0);
  const exportInFlightRef = useRef(false);
  const exportReviewActiveRef = useRef(false);
  const [isExportCaptureActive, setIsExportCaptureActive] = useState(false);
  const [isVisualExporting, setIsVisualExporting] = useState(false);
  const initialExportFrame =
    Number.isInteger(currentFrame) &&
    currentFrame >= 0 &&
    currentFrame < steps.length
      ? currentFrame
      : 0;
  const [exportFrameIndex, setExportFrameIndex] = useState(initialExportFrame);
  const [exportCapture, setExportCapture] = useState(() => ({
    frameIndex: initialExportFrame,
    captureToken: 0,
    graph: cloneJson(getFrameGraph?.(initialExportFrame)),
    step: cloneJson(steps[initialExportFrame] ?? {}),
    canvas: cloneJson(getExportCanvasSnapshot()),
  }));
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

  const queueExportFrame = useCallback(
    (frameIndex, snapshot) => {
      const safeFrame = validateExportFrameIndex(frameIndex, steps.length);
      captureTokenRef.current += 1;
      const nextCapture = {
        frameIndex: safeFrame,
        captureToken: captureTokenRef.current,
        graph: cloneJson(snapshot?.graph ?? getFrameGraph?.(safeFrame)),
        step: cloneJson(snapshot?.step ?? steps[safeFrame] ?? {}),
        canvas: cloneJson(snapshot?.canvas ?? getExportCanvasSnapshot()),
      };
      setExportCapture(nextCapture);
      return nextCapture;
    },
    [getExportCanvasSnapshot, getFrameGraph, steps]
  );

  const prepareExportFrame = useCallback(
    async (frameIndex, snapshot) => {
      const capture = queueExportFrame(frameIndex, snapshot);
      await waitForExportReady({
        svgElementId: EXPORT_CAPTURE_SVG_ELEMENT_ID,
        frameIndex: capture.frameIndex,
        captureToken: capture.captureToken,
      });
      return {
        ...capture,
        svgEl: getGraphSvgElement(EXPORT_CAPTURE_SVG_ELEMENT_ID),
      };
    },
    [queueExportFrame]
  );

  const getReviewedImageCapture = useCallback(
    request => {
      const frameIndex = validateExportFrameIndex(
        request?.frameIndex,
        steps.length
      );
      const captureToken = Number(request?.captureToken);
      const framingMode = request?.framingMode;
      const validFramingMode =
        Object.values(IMAGE_FRAMING).includes(framingMode);
      const captureIsCurrent =
        exportReviewActiveRef.current &&
        Number.isInteger(captureToken) &&
        captureToken > 0 &&
        captureToken === captureTokenRef.current &&
        exportCapture?.captureToken === captureToken &&
        exportCapture?.frameIndex === frameIndex &&
        framingMode === imageFraming &&
        validFramingMode &&
        exportCapture?.graph &&
        exportCapture?.canvas;

      if (!captureIsCurrent) {
        throw new Error(
          'Reviewed preview is stale. Wait for it to refresh or reopen Export Review.'
        );
      }

      return exportCapture;
    },
    [exportCapture, imageFraming, steps.length]
  );

  const beginExportReview = useCallback(() => {
    if (exportInFlightRef.current) {
      setStatus('An export is already in progress');
      return false;
    }
    stopTimeline?.();
    exportReviewActiveRef.current = true;
    setIsExportCaptureActive(true);
    setExportFrameIndex(currentFrame);
    queueExportFrame(currentFrame);
    return true;
  }, [currentFrame, queueExportFrame, setStatus, stopTimeline]);

  const setExportReviewFrame = useCallback(
    frameIndex => {
      if (exportInFlightRef.current) return;
      const safeFrame = validateExportFrameIndex(frameIndex, steps.length);
      setExportFrameIndex(safeFrame);
      queueExportFrame(safeFrame);
    },
    [queueExportFrame, steps.length]
  );

  const endExportReview = useCallback(() => {
    exportReviewActiveRef.current = false;
    if (!exportInFlightRef.current) setIsExportCaptureActive(false);
  }, []);

  const beginVisualExport = useCallback(() => {
    if (exportInFlightRef.current) {
      setStatus('An export is already in progress');
      return false;
    }
    exportInFlightRef.current = true;
    setPlaybackLocked?.(true);
    setIsExportCaptureActive(true);
    setIsVisualExporting(true);
    stopTimeline?.();
    return true;
  }, [setPlaybackLocked, setStatus, stopTimeline]);

  const finishVisualExport = useCallback(() => {
    stopTimeline?.();
    setPlaybackLocked?.(false);
    exportInFlightRef.current = false;
    setIsVisualExporting(false);
    if (!exportReviewActiveRef.current) setIsExportCaptureActive(false);
  }, [setPlaybackLocked, stopTimeline]);

  useEffect(() => {
    if (!steps.length || isVisualExporting) return;
    const lastFrameIndex = steps.length - 1;
    if (exportCapture.frameIndex > lastFrameIndex) {
      queueExportFrame(lastFrameIndex);
    }
  }, [
    exportCapture.frameIndex,
    isVisualExporting,
    queueExportFrame,
    steps.length,
  ]);

  const safeExportFrameIndex = steps.length
    ? Math.min(exportFrameIndex, steps.length - 1)
    : 0;

  const applyParserText = useCallback(() => {
    setParserError('');
    try {
      const { graph, meta } = parseEdgeListText(parserText);
      replaceTimeline(graph, [
        {
          id: 'step-0',
          description: 'Parsed input',
          durationMs: DEFAULT_FRAME_DURATION_MS,
          nodeOverrides: {},
          edgeOverrides: {},
        },
      ]);
      setViewFromNodes?.(graph.nodes);
      bumpViewReset?.();
      setMode('select');
      clearSelection?.();
      clearDrawState?.();
      setIsParserOpen(false);
      setStatus(`Graph parsed: ${meta}`);
    } catch (error) {
      const message = `Parse failed: ${error.message}`;
      setParserError(message);
      setStatus(message);
    }
  }, [
    clearDrawState,
    clearSelection,
    bumpViewReset,
    parserText,
    replaceTimeline,
    setViewFromNodes,
    setMode,
    setStatus,
  ]);

  const setParserModalOpen = useCallback(open => {
    setIsParserOpen(open);
    if (open) setParserError('');
  }, []);

  const updateParserText = useCallback(value => {
    setParserText(value);
    setParserError('');
  }, []);

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

  const exportSvg = useCallback(
    async reviewedPreview => {
      if (!beginVisualExport()) return;
      setStatus('Exporting SVG...');
      try {
        const capture = getReviewedImageCapture(reviewedPreview);
        await waitForExportReady({
          svgElementId: EXPORT_CAPTURE_SVG_ELEMENT_ID,
          frameIndex: capture.frameIndex,
          captureToken: capture.captureToken,
        });
        await exportCurrentFrameSvg({
          svgElementId: EXPORT_CAPTURE_SVG_ELEMENT_ID,
          framingMode: reviewedPreview.framingMode,
          frameIndex: capture.frameIndex,
          captureToken: capture.captureToken,
        });
        setStatus('SVG exported');
      } catch (error) {
        console.error(error);
        setStatus(`SVG export error: ${error.message}`);
      } finally {
        finishVisualExport();
      }
    },
    [beginVisualExport, finishVisualExport, getReviewedImageCapture, setStatus]
  );

  const exportPng = useCallback(
    async reviewedPreview => {
      if (!beginVisualExport()) return;
      setStatus('Exporting PNG...');
      try {
        const capture = getReviewedImageCapture(reviewedPreview);
        await waitForExportReady({
          svgElementId: EXPORT_CAPTURE_SVG_ELEMENT_ID,
          frameIndex: capture.frameIndex,
          captureToken: capture.captureToken,
        });
        await exportCurrentFramePng({
          svgElementId: EXPORT_CAPTURE_SVG_ELEMENT_ID,
          pngScale,
          framingMode: reviewedPreview.framingMode,
          frameIndex: capture.frameIndex,
          captureToken: capture.captureToken,
        });
        setStatus('PNG exported');
      } catch (error) {
        console.error(error);
        setStatus(`PNG export error: ${error.message}`);
      } finally {
        finishVisualExport();
      }
    },
    [
      beginVisualExport,
      finishVisualExport,
      getReviewedImageCapture,
      pngScale,
      setStatus,
    ]
  );

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

  const createExportSession = useCallback(
    frameIndexes => {
      const snapshotSteps = cloneJson(steps);
      const canvas = cloneJson(getExportCanvasSnapshot());
      const frameSnapshots = new Map(
        frameIndexes.map(frameIndex => [
          frameIndex,
          {
            graph: cloneJson(getFrameGraph?.(frameIndex)),
            step: cloneJson(snapshotSteps[frameIndex] ?? {}),
            canvas,
          },
        ])
      );
      return { steps: snapshotSteps, frameSnapshots };
    },
    [getExportCanvasSnapshot, getFrameGraph, steps]
  );

  const exportVideo = useCallback(async () => {
    if (!beginVisualExport()) return;
    const originalCapture = exportCapture;
    try {
      const frameIndexes = getExportFrameIndexes();
      if (!frameIndexes.length) {
        throw new Error('No timeline frames to export');
      }
      const session = createExportSession(frameIndexes);
      setStatus('Exporting video...');
      await exportTimelineVideo({
        steps: session.steps,
        frameIndexes,
        renderFrame: async frameIndex =>
          (
            await prepareExportFrame(
              frameIndex,
              session.frameSnapshots.get(frameIndex)
            )
          ).svgEl,
      });
      setStatus('Video exported successfully');
    } catch (error) {
      console.error(error);
      setStatus(`Export failed: ${error.message}`);
    } finally {
      try {
        await prepareExportFrame(originalCapture.frameIndex, originalCapture);
      } catch (error) {
        console.error('Failed to restore export capture surface', error);
      }
      finishVisualExport();
    }
  }, [
    beginVisualExport,
    createExportSession,
    exportCapture,
    finishVisualExport,
    getExportFrameIndexes,
    prepareExportFrame,
    setStatus,
  ]);

  const exportSlideshow = useCallback(async () => {
    if (!beginVisualExport()) return;
    const originalCapture = exportCapture;
    try {
      const frameIndexes = getExportFrameIndexes();
      if (!frameIndexes.length) {
        throw new Error('No timeline frames to export');
      }
      const session = createExportSession(frameIndexes);
      setStatus('Exporting slideshow...');
      await exportTimelineSlideshow({
        steps: session.steps,
        frameIndexes,
        renderFrame: async frameIndex =>
          (
            await prepareExportFrame(
              frameIndex,
              session.frameSnapshots.get(frameIndex)
            )
          ).svgEl,
      });
      setStatus('Slideshow exported');
    } catch (error) {
      console.error(error);
      setStatus(`Slideshow export error: ${error.message}`);
    } finally {
      try {
        await prepareExportFrame(originalCapture.frameIndex, originalCapture);
      } catch (error) {
        console.error('Failed to restore export capture surface', error);
      }
      finishVisualExport();
    }
  }, [
    beginVisualExport,
    createExportSession,
    exportCapture,
    finishVisualExport,
    getExportFrameIndexes,
    prepareExportFrame,
    setStatus,
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
    setIsParserOpen: setParserModalOpen,
    parserText,
    parserError,
    setParserText: updateParserText,
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
    exportCapture: isExportCaptureActive ? exportCapture : null,
    exportFrameIndex: safeExportFrameIndex,
    setExportFrameIndex: setExportReviewFrame,
    isVisualExporting,
    beginExportReview,
    endExportReview,
    importProjectFile,
    openExportVideoModal,
    closeExportVideoModal,
    confirmExportVideo,
  };
};
