/* eslint-disable react/prop-types */
import { useEffect, useMemo, useRef, useState } from "react";
import GraphNode from "./GraphNode";
import GraphEdge from "./GraphEdge";
import { NODE_RADIUS } from "./constants";
import { edgeBetweenSelected } from "./graphStudioUtils";
import {
  computeMinZoom,
  clampZoom,
  toWorld,
  clampViewStateToPlayspace,
  insetSegment,
  getAvoidanceShift,
  cubicBezierPoint,
  cubicBezierTangent,
  offsetFromTangent,
  pointToSegmentDistance,
  measureLabelRect,
  rectOverlapArea,
  scoreLabelCandidate,
  chooseBestLabelPosition,
  buildEdgePath,
  getRectSelection,
  EPSILON,
} from "./graphCanvasUtils";
const GraphCanvas = ({
  graph,
  diff,
  selectedObject,
  selectedNodeIds,
  drawFrom,
  mode,
  viewState,
  setViewState,
  showGrid,
  snapEnabled,
  lockCanvas,
  edgeRouting,
  edgeCurvature,
  nodeRadius = NODE_RADIUS,
  edgeWidth = 2.2,
  resetViewTrigger = 0,
  onSelectNode,
  onSelectEdge,
  onSelectNodes,
  onBackgroundClear,
  onNodePointerDown,
  onNodeMove,
  onNodePointerUp,
  onNodeClickForDraw,
  onCanvasDoubleClick,
}) => {
  const svgRef = useRef(null);
  const [dragRect, setDragRect] = useState(null);
  const pointerStateRef = useRef(null);
  const hasInitializedViewRef = useRef(false);
  const nodeMap = useMemo(() => {
    const map = new Map();
    graph.nodes.forEach((node) => map.set(String(node.id), node));
    return map;
  }, [graph.nodes]);
  const edgeRenderData = useMemo(() => {
    const visibleEdges = graph.edges.filter((edge) => edge.visible !== false);
    const segmentsById = new Map();
    const placedLabelRects = [];
    const edgeGroups = new Map();
    visibleEdges.forEach((edge) => {
      const from = String(edge.from);
      const to = String(edge.to);
      const key = [from, to].sort().join("-");
      if (!edgeGroups.has(key)) edgeGroups.set(key, []);
      edgeGroups.get(key).push(edge);
    });
    visibleEdges.forEach((edge) => {
      const from = nodeMap.get(String(edge.from));
      const to = nodeMap.get(String(edge.to));
      if (!from || !to) return;
      if (String(from.id) !== String(to.id)) {
        segmentsById.set(
          String(edge.id),
          insetSegment(from, to, edge.directed, nodeRadius),
        );
      }
    });
    return visibleEdges
      .map((edge) => {
        const from = nodeMap.get(String(edge.from));
        const to = nodeMap.get(String(edge.to));
        if (!from || !to) return null;
        const key = [String(from.id), String(to.id)].sort().join("-");
        const group = edgeGroups.get(key) || [];
        const edgeIndex = group.findIndex(
          (e) => String(e.id) === String(edge.id),
        );
        const edgeCount = group.length;
        const geometry = buildEdgePath({
          edge,
          from,
          to,
          routing: edgeRouting,
          nodes: graph.nodes,
          edgeCurvature,
          nodeRadius,
          edgeIndex,
          edgeCount,
        });
        const labelText = String(edge.label ?? "");
        const labelPosition = labelText
          ? chooseBestLabelPosition({
              edge,
              labelText,
              labelOptions: geometry.labelOptions,
              nodes: graph.nodes,
              segmentsById,
              placedLabelRects,
              nodeRadius,
            })
          : null;
        if (labelPosition && labelText) {
          placedLabelRects.push(measureLabelRect(labelPosition, labelText));
        }
        return { edge, pathD: geometry.d, labelPosition };
      })
      .filter(Boolean);
  }, [
    graph.edges,
    graph.nodes,
    nodeMap,
    edgeRouting,
    edgeCurvature,
    nodeRadius,
  ]);
  useEffect(() => {
    hasInitializedViewRef.current = false;
    const el = svgRef.current;
    if (!el) return;
    const doInit = () => {
      const bounds = el.getBoundingClientRect();
      if (!bounds || bounds.width <= 0 || bounds.height <= 0) return false;
      const viewportWidth = bounds.width;
      const viewportHeight = bounds.height;
      const minZoom = computeMinZoom(viewportWidth, viewportHeight);
      const visibleNodes = graph.nodes.filter((node) => node.visible !== false);
      if (!visibleNodes.length) {
        const zoom = minZoom;
        setViewState({
          zoom,
          x: (viewportWidth - VIEWBOX_WIDTH * zoom) / 2,
          y: (viewportHeight - VIEWBOX_HEIGHT * zoom) / 2,
        });
        hasInitializedViewRef.current = true;
        return true;
      }
      const xs = visibleNodes.map((node) => node.x);
      const ys = visibleNodes.map((node) => node.y);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);
      const padding = Math.max(36, nodeRadius * 2.2);
      const fitWidth = Math.max(1, maxX - minX + padding * 2);
      const fitHeight = Math.max(1, maxY - minY + padding * 2);
      const fitZoom = Math.min(
        viewportWidth / fitWidth,
        viewportHeight / fitHeight,
        1,
      );
      const zoom = Math.max(minZoom, fitZoom);
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;
      setViewState({
        zoom,
        x: viewportWidth / 2 - centerX * zoom,
        y: viewportHeight / 2 - centerY * zoom,
      });
      hasInitializedViewRef.current = true;
      return true;
    };
    if (doInit()) return;
    const ro = new ResizeObserver(() => {
      if (doInit()) ro.disconnect();
    });
    ro.observe(el);
    const onWindowResize = () => {
      if (doInit()) {
        ro.disconnect();
        window.removeEventListener("resize", onWindowResize);
      }
    };
    window.addEventListener("resize", onWindowResize);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", onWindowResize);
    };
  }, [graph.nodes, nodeRadius, setViewState, resetViewTrigger]);
  useEffect(() => {
    const bounds = svgRef.current?.getBoundingClientRect();
    if (!bounds) return;
    setViewState((prev) => {
      const clamped = clampViewStateToPlayspace(
        prev,
        bounds.width,
        bounds.height,
      );
      const unchanged =
        Math.abs(clamped.x - prev.x) < EPSILON &&
        Math.abs(clamped.y - prev.y) < EPSILON &&
        Math.abs(clamped.zoom - prev.zoom) < EPSILON;
      return unchanged ? prev : clamped;
    });
  }, [setViewState, viewState.zoom]);
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const handleWheel = (event) => {
      event.preventDefault();
      if (lockCanvas) return;
      const bounds = svg.getBoundingClientRect();
      if (!bounds) return;
      const cursorX = event.clientX - bounds.left;
      const cursorY = event.clientY - bounds.top;
      const worldBefore = toWorld({ x: cursorX, y: cursorY }, viewState);
      const zoomDelta = event.deltaY > 0 ? -0.1 : 0.1;
      const nextZoom = clampZoom(
        viewState.zoom + zoomDelta,
        bounds.width,
        bounds.height,
      );
      setViewState((prev) => {
        const candidate = {
          ...prev,
          zoom: nextZoom,
          x: cursorX - worldBefore.x * nextZoom,
          y: cursorY - worldBefore.y * nextZoom,
        };
        return clampViewStateToPlayspace(
          candidate,
          bounds.width,
          bounds.height,
        );
      });
    };
    svg.addEventListener("wheel", handleWheel, { passive: false });
    return () => svg.removeEventListener("wheel", handleWheel);
  }, [lockCanvas, viewState, setViewState]);
  const onPointerDownBackground = (event) => {
    const bounds = svgRef.current?.getBoundingClientRect();
    if (!bounds) return;
    const local = {
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    };
    const world = toWorld(local, viewState);
    if (mode === "pan") {
      if (lockCanvas) return;
      pointerStateRef.current = {
        type: "pan",
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        originX: viewState.x,
        originY: viewState.y,
      };
      event.currentTarget.setPointerCapture?.(event.pointerId);
      return;
    }
    if (mode === "select") {
      pointerStateRef.current = { type: "rect", pointerId: event.pointerId };
      setDragRect({
        startX: world.x,
        startY: world.y,
        endX: world.x,
        endY: world.y,
      });
      event.currentTarget.setPointerCapture?.(event.pointerId);
      return;
    }
    onBackgroundClear();
  };
  const onPointerMove = (event) => {
    const state = pointerStateRef.current;
    if (!state || state.pointerId !== event.pointerId) return;
    if (state.type === "pan") {
      if (lockCanvas) return;
      const dx = event.clientX - state.startX;
      const dy = event.clientY - state.startY;
      const bounds = svgRef.current?.getBoundingClientRect();
      if (!bounds) return;
      setViewState((prev) => {
        const candidate = {
          ...prev,
          x: state.originX + dx,
          y: state.originY + dy,
        };
        return clampViewStateToPlayspace(
          candidate,
          bounds.width,
          bounds.height,
        );
      });
      return;
    }
    if (state.type === "rect") {
      const bounds = svgRef.current?.getBoundingClientRect();
      if (!bounds) return;
      const local = {
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      };
      const world = toWorld(local, viewState);
      setDragRect((prev) =>
        prev ? { ...prev, endX: world.x, endY: world.y } : prev,
      );
      return;
    }
    if (state.type === "drag-node") {
      const bounds = svgRef.current?.getBoundingClientRect();
      if (!bounds) return;
      const local = {
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      };
      const world = toWorld(local, viewState);
      onNodeMove({
        pointerId: event.pointerId,
        worldX: world.x,
        worldY: world.y,
        snapEnabled,
      });
    }
  };
  const onPointerUp = (event) => {
    const state = pointerStateRef.current;
    if (!state || state.pointerId !== event.pointerId) return;
    if (state.type === "rect" && dragRect) {
      onSelectNodes(getRectSelection(dragRect, graph.nodes));
    }
    if (state.type === "drag-node") {
      onNodePointerUp({ pointerId: event.pointerId, snapEnabled });
    }
    pointerStateRef.current = null;
    setDragRect(null);
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  };
  const handleNodePointerDown = (event, nodeId) => {
    if (mode === "draw") return;
    event.stopPropagation();
    const bounds = svgRef.current?.getBoundingClientRect();
    if (!bounds) return;
    const local = {
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    };
    const world = toWorld(local, viewState);
    pointerStateRef.current = { type: "drag-node", pointerId: event.pointerId };
    onNodePointerDown({
      pointerId: event.pointerId,
      nodeId,
      worldX: world.x,
      worldY: world.y,
      snapEnabled,
    });
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const markerId = "graphstudio-arrow";
  return (
    <div className="relative h-full bg-white font-inter text-on-surface dark:bg-gray-900 dark:text-dark-on-surface">
      {" "}
      <svg
        id="graph-studio-canvas-svg"
        xmlns="http://www.w3.org/2000/svg"
        ref={svgRef}
        className="w-full h-full"
        onPointerDown={onPointerDownBackground}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        onDoubleClick={(event) => {
          const bounds = svgRef.current?.getBoundingClientRect();
          if (!bounds) return;
          const local = {
            x: event.clientX - bounds.left,
            y: event.clientY - bounds.top,
          };
          const world = toWorld(local, viewState);
          onCanvasDoubleClick(world);
        }}
        style={{ touchAction: "none" }}
      >
        {" "}
        <defs>
          {" "}
          <pattern
            id="graphstudio-dot-grid"
            width="28"
            height="28"
            patternUnits="userSpaceOnUse"
          >
            {" "}
            <circle cx="1.2" cy="1.2" r="1.2" fill="#e2e2e2" />{" "}
          </pattern>{" "}
          <marker
            id={markerId}
            markerWidth="12"
            markerHeight="12"
            refX="10"
            refY="6"
            orient="auto"
            markerUnits="userSpaceOnUse"
          >
            {" "}
            <path d="M0,0 L0,12 L10,6 z" fill="#777777" />{" "}
          </marker>{" "}
        </defs>{" "}
        <rect
          width="100%"
          height="100%"
          fill="white"
          className="dark:fill-[#121212]"
        />{" "}
        <g
          transform={`translate(${viewState.x} ${viewState.y}) scale(${viewState.zoom})`}
        >
          {" "}
          {showGrid && (
            <rect
              x="-10000"
              y="-10000"
              width="20000"
              height="20000"
              fill="url(#graphstudio-dot-grid)"
            />
          )}{" "}
          {edgeRenderData.map(({ edge, pathD, labelPosition }) => {
            const selected =
              selectedObject?.type === "edge" &&
              String(selectedObject.id) === String(edge.id);
            const multiSelected = edgeBetweenSelected(edge, selectedNodeIds);
            const strokeWidth = edgeWidth;
            return (
              <GraphEdge
                key={edge.id}
                edge={edge}
                pathD={pathD}
                selected={selected}
                multiSelected={multiSelected}
                markerId={markerId}
                labelPosition={labelPosition}
                strokeWidth={strokeWidth}
                shouldAnimate={diff.changedEdges.has(String(edge.id))}
                onPointerDown={(event) => {
                  event.stopPropagation();
                  onSelectEdge(edge.id);
                }}
                onClick={(event) => {
                  event.stopPropagation();
                  onSelectEdge(edge.id);
                }}
              />
            );
          })}{" "}
          {graph.nodes
            .filter((node) => node.visible !== false)
            .map((node) => {
              const selected =
                selectedObject?.type === "node" &&
                String(selectedObject.id) === String(node.id);
              const multiSelected = selectedNodeIds.has(String(node.id));
              return (
                <GraphNode
                  key={node.id}
                  node={node}
                  nodeRadius={nodeRadius}
                  selected={selected}
                  multiSelected={multiSelected}
                  drawAnchor={String(drawFrom) === String(node.id)}
                  shouldAnimate={diff.changedNodes.has(String(node.id))}
                  mode={mode}
                  onPointerDown={(event) =>
                    handleNodePointerDown(event, node.id)
                  }
                  onClick={(event) => {
                    event.stopPropagation();
                    if (mode === "draw") {
                      onNodeClickForDraw(node.id);
                      return;
                    }
                    onSelectNode(node.id, event.shiftKey || event.metaKey);
                  }}
                />
              );
            })}{" "}
          {dragRect && (
            <rect
              x={Math.min(dragRect.startX, dragRect.endX)}
              y={Math.min(dragRect.startY, dragRect.endY)}
              width={Math.abs(dragRect.endX - dragRect.startX)}
              height={Math.abs(dragRect.endY - dragRect.startY)}
              fill="rgba(56, 189, 248, 0.12)"
              stroke="#000000"
              strokeDasharray="6 4"
              strokeWidth={1.2}
            />
          )}{" "}
        </g>{" "}
      </svg>{" "}
    </div>
  );
};
export default GraphCanvas;
