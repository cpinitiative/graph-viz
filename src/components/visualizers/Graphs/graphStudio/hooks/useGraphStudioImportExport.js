import { useCallback, useRef, useState } from 'react';
import { DEFAULT_SCRIPT } from '../data/defaultScript';
import {
  exportEdgeListText,
  parseEdgeListText,
  runScriptTrace,
} from '../graphStudioUtils';
import { exportTimelineVideo } from '../lib/exportTimelineVideo';
import {
  downloadProjectJson,
  exportProjectJson,
  parseProjectJson,
} from '../lib/projectJson';

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
  lockCanvas,
  setLockCanvas,
  viewState,
  setViewState,
  globalSettings,
  setGlobalSettings,
  setMode,
  clearSelection,
  clearDrawState,
  resetUndoHistory,
}) => {
  const [isParserOpen, setIsParserOpen] = useState(false);
  const [parserText, setParserText] = useState('');
  const [isScriptOpen, setIsScriptOpen] = useState(false);
  const [scriptText, setScriptText] = useState(DEFAULT_SCRIPT);
  const isScriptRunningRef = useRef(false);
  const [isExportVideoOpen, setIsExportVideoOpen] = useState(false);
  const [exportVideoLabelPos, setExportVideoLabelPos] =
    useState('bottom-center');

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
      setIsParserOpen(false);
      setStatus(`Graph parsed: ${meta}`);
    } catch (error) {
      setStatus(`Parse failed: ${error.message}`);
    }
  }, [parserText, replaceTimeline, setStatus]);

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
    edgeRouting,
    globalSettings,
    lockCanvas,
    setStatus,
    showGrid,
    snapEnabled,
    steps,
    viewState,
  ]);

  const importProjectFile = useCallback(
    async file => {
      if (!file) return;
      try {
        const text = await file.text();
        const project = parseProjectJson(text);
        replaceTimeline(
          project.graph,
          project.timeline.steps,
          project.timeline.currentFrame
        );
        setEdgeRouting(project.settings.edgeRouting);
        setSnapEnabled(project.settings.snapEnabled);
        setShowGrid(project.settings.showGrid);
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
      } catch (error) {
        setStatus(`Project import error: ${error.message}`);
      }
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
      setSnapEnabled,
      setStatus,
      setViewState,
    ]
  );

  const exportVideo = useCallback(
    async labelPos => {
      setStatus('Exporting video...');
      try {
        await exportTimelineVideo({ steps, setCurrentFrame, labelPos });
        setStatus('Video exported successfully');
      } catch (error) {
        console.error(error);
        setStatus(`Export failed: ${error.message}`);
      }
    },
    [setCurrentFrame, setStatus, steps]
  );

  const runScript = useCallback(async () => {
    if (isScriptRunningRef.current) return;
    isScriptRunningRef.current = true;
    setStatus('Running script...');
    try {
      const traceSteps = await runScriptTrace({
        code: scriptText,
        graph: baseGraph,
      });
      replaceTimeline(baseGraph, traceSteps);
      setIsScriptOpen(false);
      setStatus(`Script generated ${traceSteps.length} frames`);
    } catch (error) {
      setStatus(`Script error: ${error.message}`);
    } finally {
      isScriptRunningRef.current = false;
    }
  }, [baseGraph, replaceTimeline, scriptText, setStatus]);

  const openExportVideoModal = useCallback(() => {
    setIsExportVideoOpen(true);
  }, []);

  const closeExportVideoModal = useCallback(() => {
    setIsExportVideoOpen(false);
  }, []);

  const confirmExportVideo = useCallback(() => {
    setIsExportVideoOpen(false);
    exportVideo(exportVideoLabelPos);
  }, [exportVideo, exportVideoLabelPos]);

  return {
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
    exportVideo,
    exportText,
    exportProject,
    importProjectFile,
    openExportVideoModal,
    closeExportVideoModal,
    confirmExportVideo,
  };
};
