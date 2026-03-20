"use client";

/* eslint-disable react/prop-types */
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
  getSelectionBounds,
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
import "./graphStudio/graphStudio.css";
import * as Mp4Muxer from "mp4-muxer";
const DEFAULT_SCRIPT = `// Use api.graph (base graph), then call helper events.
// Example BFS-style trace:
api.active(0);
api.queued(1);
api.push({ type: 'edge', id: 'e0', color: '#f59e0b', description: 'Explore e0' });
api.visited(1);
`; // Properties that are structural (shared across all frames — live in base graph)
// vs. animation properties that are per-frame (live in step overrides).
const STEP_NODE_PROPS = new Set(["status", "color"]);
const STEP_EDGE_PROPS = new Set(["color"]);
const HISTORY_LIMIT = 120;
const cloneJson = (value) => JSON.parse(JSON.stringify(value));
const snapshotTimelineState = ({ baseGraph, steps, currentFrame }) => ({
  baseGraph: cloneJson(baseGraph ?? { nodes: [], edges: [] }),
  steps: cloneJson(steps ?? []),
  currentFrame: Number.isFinite(Number(currentFrame))
    ? Number(currentFrame)
    : 0,
});
const computeMinGridZoomForViewport = (viewportWidth, viewportHeight) =>
  Math.max(
    0.1,
    Math.min(viewportWidth / VIEWBOX_WIDTH, viewportHeight / VIEWBOX_HEIGHT),
  );
const createCenteredViewState = (
  nodes = [],
  zoom = 1,
  viewportWidth = 1280,
  viewportHeight = 760,
) => {
  const bounds = getSelectionBounds(nodes);
  if (!bounds) {
    return {
      zoom,
      x: (viewportWidth - VIEWBOX_WIDTH * zoom) / 2,
      y: (viewportHeight - VIEWBOX_HEIGHT * zoom) / 2,
    };
  }
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;
  return {
    zoom,
    x: viewportWidth / 2 - centerX * zoom,
    y: viewportHeight / 2 - centerY * zoom,
  };
};
const createInitialViewState = (
  nodes = [],
  viewportWidth = 1280,
  viewportHeight = 760,
) => {
  const bounds = getSelectionBounds(nodes);
  if (!bounds) {
    const minGridZoom = computeMinGridZoomForViewport(
      viewportWidth,
      viewportHeight,
    );
    return createCenteredViewState(
      [],
      minGridZoom,
      viewportWidth,
      viewportHeight,
    );
  }
  const padding = 42;
  const fitWidth = bounds.width + padding * 2;
  const fitHeight = bounds.height + padding * 2;
  const fitZoomX = viewportWidth / Math.max(1, fitWidth);
  const fitZoomY = viewportHeight / Math.max(1, fitHeight);
  const fitZoom = Math.min(fitZoomX, fitZoomY, 1);
  const minGridZoom = computeMinGridZoomForViewport(
    viewportWidth,
    viewportHeight,
  );
  const zoom = Math.max(minGridZoom, fitZoom);
  return createCenteredViewState(nodes, zoom, viewportWidth, viewportHeight);
};
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
  const [lockCanvas, setLockCanvas] = useState(true);
  const [selectedObject, setSelectedObject] = useState(null);
  const [selectedNodeIds, setSelectedNodeIds] = useState([]);
  const [drawFrom, setDrawFrom] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [status, setStatus] = useState("Ready");
  const [globalSettings, setGlobalSettings] = useState({
    forceStrength: 1,
    edgeCurvature: 46,
    nodeSize: 22,
    edgeWidth: 2.2,
  });
  const [viewState, setViewState] = useState(() =>
    createInitialViewState(seedTimeline.baseGraph.nodes),
  );
  const [isParserOpen, setIsParserOpen] = useState(false);
  const [parserText, setParserText] = useState("");
  const [isScriptOpen, setIsScriptOpen] = useState(false);
  const [scriptText, setScriptText] = useState(DEFAULT_SCRIPT);
  const [isExportVideoOpen, setIsExportVideoOpen] = useState(false);
  const [exportVideoLabelPos, setExportVideoLabelPos] =
    useState("bottom-center");
  const timelineRef = useRef(null);
  const dragStateRef = useRef(null);
  const nextNodeIdRef = useRef(0);
  const nextEdgeIdRef = useRef(0);
  const undoHistoryRef = useRef([]);
  const historyMetaRef = useRef(null);
  const applyingUndoRef = useRef(false);
  const selectedNodeIdSet = useMemo(
    () => new Set(selectedNodeIds.map(String)),
    [selectedNodeIds],
  );
  const [viewResetCounter, setViewResetCounter] = useState(0);
  useEffect(() => {
    replaceTimeline(seedTimeline.baseGraph, seedTimeline.steps);
    setViewState(createInitialViewState(seedTimeline.baseGraph.nodes));
    setSelectedObject(null);
    setSelectedNodeIds([]);
    setDrawFrom(null);
    undoHistoryRef.current = [];
    historyMetaRef.current = null;
    applyingUndoRef.current = false;
    nextNodeIdRef.current =
      Math.max(
        -1,
        ...seedTimeline.baseGraph.nodes.map((node) =>
          Number.isFinite(Number(node.id)) ? Number(node.id) : -1,
        ),
      ) + 1;
    nextEdgeIdRef.current = seedTimeline.baseGraph.edges.length;
    setViewResetCounter((c) => c + 1);
  }, [seedTimeline, replaceTimeline]);
  useEffect(() => {
    const currentSnapshot = snapshotTimelineState({
      baseGraph,
      steps,
      currentFrame,
    });
    const signature = JSON.stringify(currentSnapshot);
    const previous = historyMetaRef.current;
    if (!previous) {
      historyMetaRef.current = { signature, snapshot: currentSnapshot };
      return;
    }
    if (applyingUndoRef.current) {
      applyingUndoRef.current = false;
      historyMetaRef.current = { signature, snapshot: currentSnapshot };
      return;
    }
    if (signature !== previous.signature) {
      undoHistoryRef.current.push(previous.snapshot);
      if (undoHistoryRef.current.length > HISTORY_LIMIT)
        undoHistoryRef.current.shift();
      historyMetaRef.current = { signature, snapshot: currentSnapshot };
    }
  }, [baseGraph, steps, currentFrame]);
  const undoLastAction = useCallback(() => {
    const previousSnapshot = undoHistoryRef.current.pop();
    if (!previousSnapshot) {
      setStatus("Nothing to undo");
      return;
    }
    applyingUndoRef.current = true;
    replaceTimeline(previousSnapshot.baseGraph, previousSnapshot.steps);
    window.setTimeout(() => {
      setCurrentFrame(previousSnapshot.currentFrame);
    }, 0);
    setStatus("Undid last action");
  }, [replaceTimeline, setCurrentFrame]);
  useEffect(() => {
    const onKeyDown = (event) => {
      const isUndo =
        (event.metaKey || event.ctrlKey) &&
        !event.shiftKey &&
        String(event.key).toLowerCase() === "z";
      if (!isUndo) return;
      const target = event.target;
      const tagName = String(target?.tagName ?? "").toLowerCase();
      if (
        tagName === "input" ||
        tagName === "textarea" ||
        tagName === "select" ||
        target?.isContentEditable
      )
        return;
      event.preventDefault();
      undoLastAction();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [undoLastAction]);
  useEffect(() => {
    return () => {
      if (timelineRef.current) window.clearTimeout(timelineRef.current);
    };
  }, []);
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
  const stopTimeline = () => {
    if (timelineRef.current) {
      window.clearTimeout(timelineRef.current);
      timelineRef.current = null;
    }
    setIsPlaying(false);
  };
  const playTimeline = () => {
    stopTimeline();
    if (frameCount <= 1) {
      setStatus("Add more keyframes to play timeline");
      return;
    }
    setIsPlaying(true);
    let cursor = currentFrame;
    const tick = () => {
      if (cursor >= frameCount) {
        setIsPlaying(false);
        setStatus("Playback complete");
        return;
      }
      setCurrentFrame(cursor);
      const stepDuration = clamp(
        Number(steps[cursor]?.durationMs ?? 600),
        80,
        8000,
      );
      cursor += 1;
      timelineRef.current = window.setTimeout(tick, stepDuration);
    };
    tick();
  };
  const centerViewOnContent = () => {
    if (lockCanvas) return;
    setViewResetCounter((c) => c + 1);
  };
  const adjustZoom = (direction) => {
    if (lockCanvas) return;
    const delta = direction > 0 ? 0.12 : -0.12;
    const viewportCenterX = 640;
    const viewportCenterY = 380;
    setViewState((prev) => {
      const nextZoom = clamp(prev.zoom + delta, 0.05, 2.6);
      const worldCenterX = (viewportCenterX - prev.x) / prev.zoom;
      const worldCenterY = (viewportCenterY - prev.y) / prev.zoom;
      return {
        ...prev,
        zoom: nextZoom,
        x: viewportCenterX - worldCenterX * nextZoom,
        y: viewportCenterY - worldCenterY * nextZoom,
      };
    });
  };
  const zoomIn = () => adjustZoom(1);
  const zoomOut = () => adjustZoom(-1);
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
    const basePatch = {};
    Object.entries(patch).forEach(([key, value]) => {
      if (STEP_NODE_PROPS.has(key)) {
        setStepProperty(`nodeOverrides.${selectedNode.id}.${key}`, value);
      } else {
        basePatch[key] = value;
      }
    });
    if (Object.keys(basePatch).length > 0)
      updateBaseNode(selectedNode.id, basePatch);
  };
  const updateSelectedEdge = (patch) => {
    if (!selectedEdge) return;
    const basePatch = {};
    Object.entries(patch).forEach(([key, value]) => {
      if (STEP_EDGE_PROPS.has(key)) {
        setStepProperty(`edgeOverrides.${selectedEdge.id}.${key}`, value);
      } else {
        basePatch[key] = value;
      }
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
    if (typeof VideoEncoder === "undefined") {
      setStatus(
        "Export failed: VideoEncoder API is not supported in this browser.",
      );
      return;
    }
    setStatus("Exporting video...");
    try {
      const canvas = document.createElement("canvas");
      const svgEl = document.getElementById("graph-studio-canvas-svg") || document.querySelector("svg");
      if (!svgEl) throw new Error("SVG not found");
      const rect = svgEl.getBoundingClientRect();
      canvas.width = Math.floor(rect.width / 2) * 2;
      canvas.height = Math.floor(rect.height / 2) * 2;
      const ctx = canvas.getContext("2d");
      const muxer = new Mp4Muxer.Muxer({
        target: new Mp4Muxer.ArrayBufferTarget(),
        video: { codec: "avc", width: canvas.width, height: canvas.height },
        fastStart: "in-memory",
      });
      const videoEncoder = new VideoEncoder({
        output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
        error: (e) => console.error(e),
      });
      videoEncoder.configure({
        codec: "avc1.42E01F",
        width: canvas.width,
        height: canvas.height,
        bitrate: 5_000_000,
        framerate: 30,
      });
      const fps = 30;
      let frameIndex = 0;
      for (let i = 0; i < steps.length; i++) {
        setCurrentFrame(i);
        await new Promise((resolve) => setTimeout(resolve, 100));
        // Store original width/height
        const origWidth = svgEl.getAttribute("width");
        const origHeight = svgEl.getAttribute("height");
        
        // Set canvas width/height explicitly before serializing
        svgEl.setAttribute("width", canvas.width);
        svgEl.setAttribute("height", canvas.height);

        let svgData = new XMLSerializer().serializeToString(svgEl);
        
        // Restore
        if (origWidth === null) svgEl.removeAttribute("width");
        else svgEl.setAttribute("width", origWidth);
        
        if (origHeight === null) svgEl.removeAttribute("height");
        else svgEl.setAttribute("height", origHeight);

        // Ensure xmlns is present
        if (!svgData.includes('xmlns=')) {
          svgData = svgData.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
        }

        const img = new Image();
        const svgBlob = new Blob([svgData], {
          type: "image/svg+xml;charset=utf-8",
        });
        const url = URL.createObjectURL(svgBlob);
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = () =>
            reject(
              new Error("Failed to load SVG image. Check console for details."),
            );
          img.src = url;
        });
        const stepDurationMs = steps[i].durationMs || 600;
        const framesForStep = Math.round((stepDurationMs / 1000) * fps);
        for (let f = 0; f < framesForStep; f++) {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
          const desc = steps[i].description;
          if (desc) {
            ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
            ctx.font = "24px sans-serif";
            const textMetrics = ctx.measureText(desc);
            const padding = 10;
            const textWidth = textMetrics.width;
            const textHeight = 24;
            let x, y;
            if (labelPos.includes("left")) x = 20;
            else if (labelPos.includes("right"))
              x = canvas.width - textWidth - 20 - padding * 2;
            else x = (canvas.width - textWidth) / 2 - padding;
            if (labelPos.includes("top")) y = 20;
            else if (labelPos.includes("bottom"))
              y = canvas.height - textHeight - 20 - padding * 2;
            else y = (canvas.height - textHeight) / 2 - padding;
            ctx.fillRect(
              x,
              y,
              textWidth + padding * 2,
              textHeight + padding * 2,
            );
            ctx.fillStyle = "#000000";
            ctx.fillText(desc, x + padding, y + textHeight + padding - 4);
          }
          const frame = new VideoFrame(canvas, {
            timestamp: (frameIndex * 1000000) / fps,
          });
          videoEncoder.encode(frame, { keyFrame: frameIndex % 30 === 0 });
          frame.close();
          frameIndex++;
        }
        URL.revokeObjectURL(url);
      }
      await videoEncoder.flush();
      muxer.finalize();
      const buffer = muxer.target.buffer;
      const blob = new Blob([buffer], { type: "video/mp4" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "graph-export.mp4";
      a.click();
      URL.revokeObjectURL(url);
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
    let presetGraph = { nodes: [], edges: [] };
    let presetSteps = [];
    if (presetName === "bfs") {
      presetGraph = {
        nodes: [
          { id: 0, label: "A", x: 400, y: 200, visible: true },
          { id: 1, label: "B", x: 300, y: 300, visible: true },
          { id: 2, label: "C", x: 500, y: 300, visible: true },
          { id: 3, label: "D", x: 200, y: 400, visible: true },
          { id: 4, label: "E", x: 400, y: 400, visible: true },
          { id: 5, label: "F", x: 600, y: 400, visible: true },
        ],
        edges: [
          { id: "e0", from: 0, to: 1, directed: false, visible: true },
          { id: "e1", from: 0, to: 2, directed: false, visible: true },
          { id: "e2", from: 1, to: 3, directed: false, visible: true },
          { id: "e3", from: 1, to: 4, directed: false, visible: true },
          { id: "e4", from: 2, to: 5, directed: false, visible: true },
        ],
      };
      presetSteps = [
        {
          id: "s0",
          description: "Start BFS at A",
          durationMs: 600,
          nodeOverrides: { 0: { status: "active", color: "#3b82f6" } },
          edgeOverrides: {},
        },
        {
          id: "s1",
          description: "Queue B and C",
          durationMs: 600,
          nodeOverrides: {
            0: { status: "visited", color: "#22c55e" },
            1: { status: "queued", color: "#eab308" },
            2: { status: "queued", color: "#eab308" },
          },
          edgeOverrides: { e0: { color: "#3b82f6" }, e1: { color: "#3b82f6" } },
        },
        {
          id: "s2",
          description: "Visit B, Queue D and E",
          durationMs: 600,
          nodeOverrides: {
            0: { status: "visited", color: "#22c55e" },
            1: { status: "visited", color: "#22c55e" },
            2: { status: "queued", color: "#eab308" },
            3: { status: "queued", color: "#eab308" },
            4: { status: "queued", color: "#eab308" },
          },
          edgeOverrides: {
            e0: { color: "#22c55e" },
            e1: { color: "#3b82f6" },
            e2: { color: "#3b82f6" },
            e3: { color: "#3b82f6" },
          },
        },
        {
          id: "s3",
          description: "Visit C, Queue F",
          durationMs: 600,
          nodeOverrides: {
            0: { status: "visited", color: "#22c55e" },
            1: { status: "visited", color: "#22c55e" },
            2: { status: "visited", color: "#22c55e" },
            3: { status: "queued", color: "#eab308" },
            4: { status: "queued", color: "#eab308" },
            5: { status: "queued", color: "#eab308" },
          },
          edgeOverrides: {
            e0: { color: "#22c55e" },
            e1: { color: "#22c55e" },
            e2: { color: "#3b82f6" },
            e3: { color: "#3b82f6" },
            e4: { color: "#3b82f6" },
          },
        },
        {
          id: "s4",
          description: "Visit D, E, F",
          durationMs: 600,
          nodeOverrides: {
            0: { status: "visited", color: "#22c55e" },
            1: { status: "visited", color: "#22c55e" },
            2: { status: "visited", color: "#22c55e" },
            3: { status: "visited", color: "#22c55e" },
            4: { status: "visited", color: "#22c55e" },
            5: { status: "visited", color: "#22c55e" },
          },
          edgeOverrides: {
            e0: { color: "#22c55e" },
            e1: { color: "#22c55e" },
            e2: { color: "#22c55e" },
            e3: { color: "#22c55e" },
            e4: { color: "#22c55e" },
          },
        },
      ];
    } else if (presetName === "dfs") {
      presetGraph = {
        nodes: [
          { id: 0, label: "A", x: 400, y: 200, visible: true },
          { id: 1, label: "B", x: 300, y: 300, visible: true },
          { id: 2, label: "C", x: 500, y: 300, visible: true },
          { id: 3, label: "D", x: 200, y: 400, visible: true },
          { id: 4, label: "E", x: 400, y: 400, visible: true },
        ],
        edges: [
          { id: "e0", from: 0, to: 1, directed: true, visible: true },
          { id: "e1", from: 0, to: 2, directed: true, visible: true },
          { id: "e2", from: 1, to: 3, directed: true, visible: true },
          { id: "e3", from: 1, to: 4, directed: true, visible: true },
        ],
      };
      presetSteps = [
        {
          id: "s0",
          description: "Start DFS at A",
          durationMs: 600,
          nodeOverrides: { 0: { status: "active", color: "#3b82f6" } },
          edgeOverrides: {},
        },
        {
          id: "s1",
          description: "Explore B",
          durationMs: 600,
          nodeOverrides: {
            0: { status: "active", color: "#3b82f6" },
            1: { status: "active", color: "#3b82f6" },
          },
          edgeOverrides: { e0: { color: "#3b82f6" } },
        },
        {
          id: "s2",
          description: "Explore D",
          durationMs: 600,
          nodeOverrides: {
            0: { status: "active", color: "#3b82f6" },
            1: { status: "active", color: "#3b82f6" },
            3: { status: "active", color: "#3b82f6" },
          },
          edgeOverrides: { e0: { color: "#3b82f6" }, e2: { color: "#3b82f6" } },
        },
        {
          id: "s3",
          description: "Backtrack from D",
          durationMs: 600,
          nodeOverrides: {
            0: { status: "active", color: "#3b82f6" },
            1: { status: "active", color: "#3b82f6" },
            3: { status: "visited", color: "#22c55e" },
          },
          edgeOverrides: { e0: { color: "#3b82f6" }, e2: { color: "#22c55e" } },
        },
        {
          id: "s4",
          description: "Explore E",
          durationMs: 600,
          nodeOverrides: {
            0: { status: "active", color: "#3b82f6" },
            1: { status: "active", color: "#3b82f6" },
            3: { status: "visited", color: "#22c55e" },
            4: { status: "active", color: "#3b82f6" },
          },
          edgeOverrides: {
            e0: { color: "#3b82f6" },
            e2: { color: "#22c55e" },
            e3: { color: "#3b82f6" },
          },
        },
        {
          id: "s5",
          description: "Backtrack from E, B",
          durationMs: 600,
          nodeOverrides: {
            0: { status: "active", color: "#3b82f6" },
            1: { status: "visited", color: "#22c55e" },
            3: { status: "visited", color: "#22c55e" },
            4: { status: "visited", color: "#22c55e" },
          },
          edgeOverrides: {
            e0: { color: "#22c55e" },
            e2: { color: "#22c55e" },
            e3: { color: "#22c55e" },
          },
        },
        {
          id: "s6",
          description: "Explore C",
          durationMs: 600,
          nodeOverrides: {
            0: { status: "active", color: "#3b82f6" },
            1: { status: "visited", color: "#22c55e" },
            2: { status: "active", color: "#3b82f6" },
            3: { status: "visited", color: "#22c55e" },
            4: { status: "visited", color: "#22c55e" },
          },
          edgeOverrides: {
            e0: { color: "#22c55e" },
            e1: { color: "#3b82f6" },
            e2: { color: "#22c55e" },
            e3: { color: "#22c55e" },
          },
        },
        {
          id: "s7",
          description: "Finish DFS",
          durationMs: 600,
          nodeOverrides: {
            0: { status: "visited", color: "#22c55e" },
            1: { status: "visited", color: "#22c55e" },
            2: { status: "visited", color: "#22c55e" },
            3: { status: "visited", color: "#22c55e" },
            4: { status: "visited", color: "#22c55e" },
          },
          edgeOverrides: {
            e0: { color: "#22c55e" },
            e1: { color: "#22c55e" },
            e2: { color: "#22c55e" },
            e3: { color: "#22c55e" },
          },
        },
      ];
    } else if (presetName === "dijkstra") {
      presetGraph = {
        nodes: [
          { id: 0, label: "A", x: 200, y: 300, visible: true },
          { id: 1, label: "B", x: 400, y: 200, visible: true },
          { id: 2, label: "C", x: 400, y: 400, visible: true },
          { id: 3, label: "D", x: 600, y: 300, visible: true },
        ],
        edges: [
          {
            id: "e0",
            from: 0,
            to: 1,
            directed: true,
            label: "4",
            visible: true,
          },
          {
            id: "e1",
            from: 0,
            to: 2,
            directed: true,
            label: "1",
            visible: true,
          },
          {
            id: "e2",
            from: 2,
            to: 1,
            directed: true,
            label: "2",
            visible: true,
          },
          {
            id: "e3",
            from: 1,
            to: 3,
            directed: true,
            label: "1",
            visible: true,
          },
          {
            id: "e4",
            from: 2,
            to: 3,
            directed: true,
            label: "5",
            visible: true,
          },
        ],
      };
      presetSteps = [
        {
          id: "s0",
          description: "Init distances: A=0, others=∞",
          durationMs: 800,
          nodeOverrides: { 0: { status: "active", color: "#3b82f6" } },
          edgeOverrides: {},
        },
        {
          id: "s1",
          description: "Relax A→B (4), A→C (1)",
          durationMs: 800,
          nodeOverrides: {
            0: { status: "visited", color: "#22c55e" },
            1: { status: "queued", color: "#eab308" },
            2: { status: "queued", color: "#eab308" },
          },
          edgeOverrides: { e0: { color: "#3b82f6" }, e1: { color: "#3b82f6" } },
        },
        {
          id: "s2",
          description: "Pick C (min dist 1), Relax C→B (1+2=3 < 4)",
          durationMs: 800,
          nodeOverrides: {
            0: { status: "visited", color: "#22c55e" },
            1: { status: "queued", color: "#eab308" },
            2: { status: "active", color: "#3b82f6" },
          },
          edgeOverrides: {
            e0: { color: "#64748b" },
            e1: { color: "#22c55e" },
            e2: { color: "#3b82f6" },
          },
        },
        {
          id: "s3",
          description: "Relax C→D (1+5=6)",
          durationMs: 800,
          nodeOverrides: {
            0: { status: "visited", color: "#22c55e" },
            1: { status: "queued", color: "#eab308" },
            2: { status: "visited", color: "#22c55e" },
            3: { status: "queued", color: "#eab308" },
          },
          edgeOverrides: {
            e1: { color: "#22c55e" },
            e2: { color: "#22c55e" },
            e4: { color: "#3b82f6" },
          },
        },
        {
          id: "s4",
          description: "Pick B (min dist 3), Relax B→D (3+1=4 < 6)",
          durationMs: 800,
          nodeOverrides: {
            0: { status: "visited", color: "#22c55e" },
            1: { status: "active", color: "#3b82f6" },
            2: { status: "visited", color: "#22c55e" },
            3: { status: "queued", color: "#eab308" },
          },
          edgeOverrides: {
            e1: { color: "#22c55e" },
            e2: { color: "#22c55e" },
            e3: { color: "#3b82f6" },
            e4: { color: "#64748b" },
          },
        },
        {
          id: "s5",
          description: "Pick D (min dist 4), Done",
          durationMs: 800,
          nodeOverrides: {
            0: { status: "visited", color: "#22c55e" },
            1: { status: "visited", color: "#22c55e" },
            2: { status: "visited", color: "#22c55e" },
            3: { status: "visited", color: "#22c55e" },
          },
          edgeOverrides: {
            e1: { color: "#22c55e" },
            e2: { color: "#22c55e" },
            e3: { color: "#22c55e" },
          },
        },
      ];
    } else if (presetName === "multigraph") {
      presetGraph = {
        nodes: [
          { id: 0, label: "A", x: 200, y: 300, visible: true },
          { id: 1, label: "B", x: 500, y: 300, visible: true },
          { id: 2, label: "C", x: 350, y: 500, visible: true },
        ],
        edges: [
          {
            id: "e0",
            from: 0,
            to: 1,
            directed: true,
            label: "Path 1",
            visible: true,
          },
          {
            id: "e1",
            from: 0,
            to: 1,
            directed: true,
            label: "Path 2",
            visible: true,
          },
          {
            id: "e2",
            from: 0,
            to: 1,
            directed: true,
            label: "Path 3",
            visible: true,
          },
          {
            id: "e3",
            from: 1,
            to: 1,
            directed: true,
            label: "Loop",
            visible: true,
          },
          {
            id: "e4",
            from: 1,
            to: 2,
            directed: true,
            label: "To C",
            visible: true,
          },
          {
            id: "e5",
            from: 2,
            to: 0,
            directed: true,
            label: "Back to A",
            visible: true,
          },
        ],
      };
      presetSteps = [
        {
          id: "s0",
          description: "Start at A",
          durationMs: 800,
          nodeOverrides: { 0: { status: "active", color: "#3b82f6" } },
          edgeOverrides: {},
        },
        {
          id: "s1",
          description: "Explore multiple paths to B",
          durationMs: 800,
          nodeOverrides: {
            0: { status: "visited", color: "#22c55e" },
            1: { status: "queued", color: "#eab308" },
          },
          edgeOverrides: {
            e0: { color: "#3b82f6" },
            e1: { color: "#3b82f6" },
            e2: { color: "#3b82f6" },
          },
        },
        {
          id: "s2",
          description: "Select Path 2 as optimal",
          durationMs: 800,
          nodeOverrides: {
            0: { status: "visited", color: "#22c55e" },
            1: { status: "active", color: "#3b82f6" },
          },
          edgeOverrides: {
            e0: { color: "#64748b" },
            e1: { color: "#22c55e" },
            e2: { color: "#64748b" },
          },
        },
        {
          id: "s3",
          description: "Process self-loop on B",
          durationMs: 800,
          nodeOverrides: {
            0: { status: "visited", color: "#22c55e" },
            1: { status: "active", color: "#3b82f6" },
          },
          edgeOverrides: { e1: { color: "#22c55e" }, e3: { color: "#3b82f6" } },
        },
        {
          id: "s4",
          description: "Move to C",
          durationMs: 800,
          nodeOverrides: {
            0: { status: "visited", color: "#22c55e" },
            1: { status: "visited", color: "#22c55e" },
            2: { status: "active", color: "#3b82f6" },
          },
          edgeOverrides: {
            e1: { color: "#22c55e" },
            e3: { color: "#22c55e" },
            e4: { color: "#3b82f6" },
          },
        },
        {
          id: "s5",
          description: "Return to A (Cycle complete)",
          durationMs: 800,
          nodeOverrides: {
            0: { status: "active", color: "#3b82f6" },
            1: { status: "visited", color: "#22c55e" },
            2: { status: "visited", color: "#22c55e" },
          },
          edgeOverrides: {
            e1: { color: "#22c55e" },
            e3: { color: "#22c55e" },
            e4: { color: "#22c55e" },
            e5: { color: "#3b82f6" },
          },
        },
      ];
    }
    replaceTimeline(presetGraph, presetSteps);
    setViewState(createInitialViewState(presetGraph.nodes));
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
                onPlay={isPlaying ? stopTimeline : playTimeline}
                isPlaying={isPlaying}
                onCenterView={centerViewOnContent}
                zoomPercent={Math.round(viewState.zoom * 100)}
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
            onPlay={isPlaying ? stopTimeline : playTimeline}
            isPlaying={isPlaying}
          />{" "}
        </Panel>{" "}
      </PanelGroup>{" "}
      {isParserOpen && (
        <div className="absolute inset-0 bg-surface-container-lowest/80 backdrop-blur-[20px] flex items-center justify-center z-50 p-4">
          {" "}
          <div className="w-full max-w-2xl bg-surface-container-low rounded-md shadow-ambient-lg flex flex-col max-h-[90vh]">
            {" "}
            <div className="p-4 flex justify-between items-center">
              {" "}
              <h3 className="text-sm font-semibold text-on-surface">
                Text-to-Graph Parser
              </h3>{" "}
              <button
                className="text-outline hover:text-on-surface"
                onClick={() => setIsParserOpen(false)}
              >
                {" "}
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>{" "}
              </button>{" "}
            </div>{" "}
            <div className="p-4 flex-1 overflow-auto">
              {" "}
              <p className="text-xs text-on-surface mb-3">
                Supports competitive programming input: first line `N M`, then
                `u v w` rows.
              </p>{" "}
              <textarea
                value={parserText}
                onChange={(event) => setParserText(event.target.value)}
                className="w-full h-64 bg-white rounded-md text-sm text-on-surface p-3 font-mono focus:outline-none focus:-primary resize-none"
                placeholder={"5 6\n0 1 2\n1 2 4\n2 3 1\n3 4 3\n0 4 8\n1 4 6"}
              />{" "}
            </div>{" "}
            <div className="p-4 flex justify-end gap-2 bg-white/50 rounded-b-xl">
              {" "}
              <button
                className="py-2 px-4 bg-surface-container hover:bg-surface-container-high rounded-md text-xs font-medium text-on-surface transition-colors"
                onClick={() => setIsParserOpen(false)}
              >
                Cancel
              </button>{" "}
              <button
                className="py-2 px-4 bg-primary text-on-primary hover:bg-blue-500 rounded-md text-xs font-medium transition-colors "
                onClick={applyParserText}
              >
                Generate graph
              </button>{" "}
            </div>{" "}
          </div>{" "}
        </div>
      )}{" "}
      {isScriptOpen && (
        <div className="absolute inset-0 bg-surface-container-lowest/80 backdrop-blur-[20px] flex items-center justify-center z-50 p-4">
          {" "}
          <div className="w-full max-w-3xl bg-surface-container-low rounded-md shadow-ambient-lg flex flex-col max-h-[90vh]">
            {" "}
            <div className="p-4 flex justify-between items-center">
              {" "}
              <h3 className="text-sm font-semibold text-on-surface">
                Script Mode (Trace Recorder)
              </h3>{" "}
              <button
                className="text-outline hover:text-on-surface"
                onClick={() => setIsScriptOpen(false)}
              >
                {" "}
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>{" "}
              </button>{" "}
            </div>{" "}
            <div className="p-4 flex-1 overflow-auto">
              {" "}
              <p className="text-xs text-on-surface mb-3">
                Write JS using `api.active(id)`, `api.visited(id)`,
                `api.edge(id, color)` or `api.push(patch)`.
              </p>{" "}
              <textarea
                value={scriptText}
                onChange={(event) => setScriptText(event.target.value)}
                className="w-full h-80 bg-white rounded-md text-sm text-on-surface p-3 font-mono focus:outline-none focus:-primary resize-none"
              />{" "}
            </div>{" "}
            <div className="p-4 flex justify-end gap-2 bg-white/50 rounded-b-xl">
              {" "}
              <button
                className="py-2 px-4 bg-surface-container hover:bg-surface-container-high rounded-md text-xs font-medium text-on-surface transition-colors"
                onClick={() => setIsScriptOpen(false)}
              >
                Cancel
              </button>{" "}
              <button
                className="py-2 px-4 bg-primary text-on-primary hover:bg-blue-500 rounded-md text-xs font-medium transition-colors "
                onClick={runScript}
              >
                Generate timeline
              </button>{" "}
            </div>{" "}
          </div>{" "}
        </div>
      )}{" "}
      {isExportVideoOpen && (
        <div className="absolute inset-0 bg-surface-container-lowest/80 backdrop-blur-[20px] flex items-center justify-center z-50 p-4">
          {" "}
          <div className="w-full max-w-md bg-surface-container-low rounded-md shadow-ambient-lg flex flex-col">
            {" "}
            <div className="p-4 flex justify-between items-center">
              {" "}
              <h3 className="text-sm font-semibold text-on-surface">
                Export MP4 Video
              </h3>{" "}
              <button
                className="text-outline hover:text-on-surface"
                onClick={() => setIsExportVideoOpen(false)}
              >
                {" "}
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>{" "}
              </button>{" "}
            </div>{" "}
            <div className="p-4">
              {" "}
              <p className="text-xs text-on-surface mb-4">
                This will generate a static video of the timeline steps.
              </p>{" "}
              <div className="space-y-2">
                {" "}
                <label className="block text-xs font-medium text-on-surface">
                  Label Position
                </label>{" "}
                <select
                  value={exportVideoLabelPos}
                  onChange={(e) => setExportVideoLabelPos(e.target.value)}
                  className="w-full bg-white rounded-md text-sm text-on-surface py-2.5 px-3 focus:outline-none focus:-primary"
                >
                  {" "}
                  <option value="top-left">Top Left</option>{" "}
                  <option value="top-center">Top Center</option>{" "}
                  <option value="top-right">Top Right</option>{" "}
                  <option value="bottom-left">Bottom Left</option>{" "}
                  <option value="bottom-center">Bottom Center</option>{" "}
                  <option value="bottom-right">Bottom Right</option>{" "}
                </select>{" "}
              </div>{" "}
            </div>{" "}
            <div className="p-4 flex justify-end gap-2 bg-white/50 rounded-b-xl">
              {" "}
              <button
                className="py-2 px-4 bg-surface-container hover:bg-surface-container-high rounded-md text-xs font-medium text-on-surface transition-colors"
                onClick={() => setIsExportVideoOpen(false)}
              >
                Cancel
              </button>{" "}
              <button
                className="py-2 px-4 bg-primary text-on-primary hover:bg-blue-500 rounded-md text-xs font-medium transition-colors "
                onClick={() => {
                  setIsExportVideoOpen(false);
                  exportVideo(exportVideoLabelPos);
                }}
              >
                Export
              </button>{" "}
            </div>{" "}
          </div>{" "}
        </div>
      )}{" "}
    </div>
  );
};
export default GraphStudioVisualizer;
