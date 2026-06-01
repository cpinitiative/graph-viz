import { useCallback, useState } from "react";
import { DEFAULT_SCRIPT } from "../data/defaultScript";
import { exportTimelineVideo } from "../lib/exportTimelineVideo";
import {
  exportEdgeListText,
  parseEdgeListText,
  runScriptTrace,
} from "../graphStudioUtils";

export const useGraphStudioImportExport = ({
  baseGraph,
  steps,
  setCurrentFrame,
  replaceTimeline,
  setStatus,
}) => {
  const [isParserOpen, setIsParserOpen] = useState(false);
  const [parserText, setParserText] = useState("");
  const [isScriptOpen, setIsScriptOpen] = useState(false);
  const [scriptText, setScriptText] = useState(DEFAULT_SCRIPT);
  const [isExportVideoOpen, setIsExportVideoOpen] = useState(false);
  const [exportVideoLabelPos, setExportVideoLabelPos] =
    useState("bottom-center");

  const applyParserText = useCallback(() => {
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
  }, [parserText, replaceTimeline, setStatus]);

  const exportText = useCallback(async () => {
    const output = exportEdgeListText(baseGraph);
    try {
      await navigator.clipboard.writeText(output);
      setStatus("Edge list copied to clipboard");
    } catch {
      setStatus("Clipboard unavailable; open parser and paste manually");
      setIsParserOpen(true);
      setParserText(output);
    }
  }, [baseGraph, setStatus]);

  const exportVideo = useCallback(
    async (labelPos) => {
      setStatus("Exporting video...");
      try {
        await exportTimelineVideo({ steps, setCurrentFrame, labelPos });
        setStatus("Video exported successfully");
      } catch (error) {
        console.error(error);
        setStatus(`Export failed: ${error.message}`);
      }
    },
    [setCurrentFrame, setStatus, steps],
  );

  const runScript = useCallback(() => {
    try {
      const traceSteps = runScriptTrace({ code: scriptText, graph: baseGraph });
      replaceTimeline(baseGraph, traceSteps);
      setIsScriptOpen(false);
      setStatus(`Script generated ${traceSteps.length} frames`);
    } catch (error) {
      setStatus(`Script error: ${error.message}`);
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
    openExportVideoModal,
    closeExportVideoModal,
    confirmExportVideo,
  };
};
