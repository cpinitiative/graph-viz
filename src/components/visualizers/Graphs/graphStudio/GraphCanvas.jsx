/* eslint-disable react/prop-types */
import React, { useEffect, useMemo, useRef, useState } from "react";
import GraphNode from "./GraphNode";
import GraphEdge from "./GraphEdge";
import {
  EDGE_ROUTING,
  NODE_RADIUS,
  VIEWBOX_HEIGHT,
  VIEWBOX_WIDTH,
} from "./constants";
import { edgeBetweenSelected } from "./graphStudioUtils";
const MIN_ZOOM_FLOOR = 0.1;
const MAX_ZOOM = 2.6;
const computeMinZoom = (viewportW, viewportH) => {
  if (!viewportW || !viewportH) return MIN_ZOOM_FLOOR;
  return Math.max(
    MIN_ZOOM_FLOOR,
    Math.min(viewportW / VIEWBOX_WIDTH, viewportH / VIEWBOX_HEIGHT),
  );
};
const clampZoom = (zoom, viewportW = 0, viewportH = 0) => {
  const minZoom = computeMinZoom(viewportW, viewportH);
  return Math.max(minZoom, Math.min(MAX_ZOOM, zoom));
};
const EPSILON = 0.001;
const toWorld = ({ x, y }, viewState) => ({
  x: (x - viewState.x) / viewState.zoom,
  y: (y - viewState.y) / viewState.zoom,
});
const clampViewStateToPlayspace = (
  candidate,
  viewportWidth,
  viewportHeight,
) => {
  if (!viewportWidth || !viewportHeight) return candidate;
  // Enforce dynamic minimum zoom so grid always fills the viewport
  const minZoom = computeMinZoom(viewportWidth, viewportHeight);
  const zoom = Math.max(minZoom, Math.min(MAX_ZOOM, candidate.zoom));
  const worldWidthPx = VIEWBOX_WIDTH * zoom;
  const worldHeightPx = VIEWBOX_HEIGHT * zoom;
  let nextX = candidate.x;
  let nextY = candidate.y;
  // If zoom level changed (clamped to min), re-center so grid fills view
  if (zoom !== candidate.zoom) {
    nextX = (viewportWidth - worldWidthPx) / 2;
    nextY = (viewportHeight - worldHeightPx) / 2;
  } else {
    if (worldWidthPx <= viewportWidth) {
      const minX = 0;
      const maxX = viewportWidth - worldWidthPx;
      nextX = Math.max(minX, Math.min(maxX, nextX));
    } else {
      const minX = viewportWidth - worldWidthPx;
      const maxX = 0;
      nextX = Math.max(minX, Math.min(maxX, nextX));
    }
    if (worldHeightPx <= viewportHeight) {
      const minY = 0;
      const maxY = viewportHeight - worldHeightPx;
      nextY = Math.max(minY, Math.min(maxY, nextY));
    } else {
      const minY = viewportHeight - worldHeightPx;
      const maxY = 0;
      nextY = Math.max(minY, Math.min(maxY, nextY));
    }
  }
  return { ...candidate, zoom, x: nextX, y: nextY };
};
const insetSegment = (from, to, directed, nodeRadius = NODE_RADIUS) => {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.max(1, Math.sqrt(dx * dx + dy * dy));
  const ux = dx / length;
  const uy = dy / length;
  const startInset = nodeRadius * 0.94;
  const endInset = directed ? nodeRadius + 4 : nodeRadius * 0.94;
  return {
    x1: from.x + ux * startInset,
    y1: from.y + uy * startInset,
    x2: to.x - ux * endInset,
    y2: to.y - uy * endInset,
    nx: -uy,
    ny: ux,
  };
};
const getAvoidanceShift = (
  segment,
  edge,
  nodes,
  baseShift,
  nodeRadius = NODE_RADIUS,
) => {
  const midX = (segment.x1 + segment.x2) / 2;
  const midY = (segment.y1 + segment.y2) / 2;
  let shift = baseShift;
  nodes.forEach((node) => {
    const sameEndpoint =
      String(node.id) === String(edge.from) ||
      String(node.id) === String(edge.to);
    if (sameEndpoint) return;
    const dx = node.x - midX;
    const dy = node.y - midY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance < nodeRadius * 2.2) {
      const bump = (nodeRadius * 2.2 - distance) * 0.7;
      shift += bump;
    }
  });
  return shift;
};
const cubicBezierPoint = (p0, p1, p2, p3, t) => {
  const invT = 1 - t;
  const invT2 = invT * invT;
  const invT3 = invT2 * invT;
  const t2 = t * t;
  const t3 = t2 * t;
  return {
    x: invT3 * p0.x + 3 * invT2 * t * p1.x + 3 * invT * t2 * p2.x + t3 * p3.x,
    y: invT3 * p0.y + 3 * invT2 * t * p1.y + 3 * invT * t2 * p2.y + t3 * p3.y,
  };
};
const cubicBezierTangent = (p0, p1, p2, p3, t) => {
  const invT = 1 - t;
  return {
    x:
      3 * invT * invT * (p1.x - p0.x) +
      6 * invT * t * (p2.x - p1.x) +
      3 * t * t * (p3.x - p2.x),
    y:
      3 * invT * invT * (p1.y - p0.y) +
      6 * invT * t * (p2.y - p1.y) +
      3 * t * t * (p3.y - p2.y),
  };
};
const offsetFromTangent = (point, tangent, distance, side = 1) => {
  const length = Math.max(
    1e-6,
    Math.sqrt(tangent.x * tangent.x + tangent.y * tangent.y),
  );
  const nx = (-tangent.y / length) * side;
  const ny = (tangent.x / length) * side;
  return { x: point.x + nx * distance, y: point.y + ny * distance };
};
const pointToSegmentDistance = (pointX, pointY, x1, y1, x2, y2) => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq <= 1e-6) {
    const px = pointX - x1;
    const py = pointY - y1;
    return Math.sqrt(px * px + py * py);
  }
  const t = Math.max(
    0,
    Math.min(1, ((pointX - x1) * dx + (pointY - y1) * dy) / lengthSq),
  );
  const projX = x1 + t * dx;
  const projY = y1 + t * dy;
  const diffX = pointX - projX;
  const diffY = pointY - projY;
  return Math.sqrt(diffX * diffX + diffY * diffY);
};
const measureLabelRect = (point, labelText) => {
  const text = String(labelText ?? "");
  const width = Math.max(22, text.length * 6.9 + 10);
  const height = 15;
  return {
    left: point.x - width / 2,
    right: point.x + width / 2,
    top: point.y - height / 2,
    bottom: point.y + height / 2,
    width,
    height,
  };
};
const rectOverlapArea = (rectA, rectB) => {
  const overlapX = Math.max(
    0,
    Math.min(rectA.right, rectB.right) - Math.max(rectA.left, rectB.left),
  );
  const overlapY = Math.max(
    0,
    Math.min(rectA.bottom, rectB.bottom) - Math.max(rectA.top, rectB.top),
  );
  return overlapX * overlapY;
};
const scoreLabelCandidate = ({
  candidate,
  edge,
  labelText,
  labelIndex,
  nodes,
  segmentsById,
  placedLabelRects,
  nodeRadius,
}) => {
  let score = 0;
  if (labelIndex === 0) score += 5;
  const margin = 12;
  if (candidate.x < margin) score -= (margin - candidate.x) * 8;
  if (candidate.x > VIEWBOX_WIDTH - margin)
    score -= (candidate.x - (VIEWBOX_WIDTH - margin)) * 8;
  if (candidate.y < margin) score -= (margin - candidate.y) * 8;
  if (candidate.y > VIEWBOX_HEIGHT - margin)
    score -= (candidate.y - (VIEWBOX_HEIGHT - margin)) * 8;
  const rect = measureLabelRect(candidate, labelText);
  placedLabelRects.forEach((placedRect) => {
    const overlap = rectOverlapArea(rect, placedRect);
    if (overlap > 0) score -= 900 + overlap * 2.2;
  });
  nodes.forEach((node) => {
    const isEndpoint =
      String(node.id) === String(edge.from) ||
      String(node.id) === String(edge.to);
    if (isEndpoint) return;
    const dx = candidate.x - node.x;
    const dy = candidate.y - node.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance < nodeRadius * 1.6)
      score -= (nodeRadius * 1.6 - distance) * 18;
  });
  segmentsById.forEach((segment, segmentEdgeId) => {
    if (String(segmentEdgeId) === String(edge.id)) return;
    const distance = pointToSegmentDistance(
      candidate.x,
      candidate.y,
      segment.x1,
      segment.y1,
      segment.x2,
      segment.y2,
    );
    if (distance < 14) score -= (14 - distance) * 14;
    else score += Math.min(distance, 40) * 0.18;
  });
  return score;
};
const chooseBestLabelPosition = ({
  edge,
  labelText,
  labelOptions,
  nodes,
  segmentsById,
  placedLabelRects,
  nodeRadius,
}) => {
  if (!Array.isArray(labelOptions) || !labelOptions.length) return null;
  let best = labelOptions[0];
  let bestScore = Number.NEGATIVE_INFINITY;
  labelOptions.forEach((candidate, index) => {
    const score = scoreLabelCandidate({
      candidate,
      edge,
      labelText,
      labelIndex: index,
      nodes,
      segmentsById,
      placedLabelRects,
      nodeRadius,
    });
    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  });
  return best;
};
const buildEdgePath = ({
  edge,
  from,
  to,
  routing,
  nodes,
  edgeCurvature,
  nodeRadius,
  edgeIndex = 0,
  edgeCount = 1,
}) => {
  if (String(from.id) === String(to.id)) {
    const loopRadius = nodeRadius * 1.5 + edgeIndex * 15;
    const startX = from.x - nodeRadius * 0.5;
    const startY = from.y - nodeRadius * 0.866;
    const endX = from.x + nodeRadius * 0.5;
    const endY = from.y - nodeRadius * 0.866;
    const d = `M ${startX} ${startY} C ${from.x - loopRadius * 1.5} ${from.y - loopRadius * 2.5}, ${from.x + loopRadius * 1.5} ${from.y - loopRadius * 2.5}, ${endX} ${endY}`;
    return { d, labelOptions: [{ x: from.x, y: from.y - loopRadius * 2.2 }] };
  }
  const segment = insetSegment(from, to, edge.directed, nodeRadius);
  let multiShift = 0;
  if (edgeCount > 1) {
    const centerIndex = (edgeCount - 1) / 2;
    const offset = edgeIndex - centerIndex;
    const directionMultiplier = String(from.id) < String(to.id) ? 1 : -1;
    multiShift = offset * 25 * directionMultiplier;
  }
  if (routing === EDGE_ROUTING.bezier || edgeCount > 1) {
    const seed = String(edge.id)
      .split("")
      .reduce((sum, part) => sum + part.charCodeAt(0), 0);
    const side = seed % 2 === 0 ? 1 : -1;
    const baseShift = Math.max(18, edgeCurvature) * side;
    const shift =
      getAvoidanceShift(segment, edge, nodes, baseShift, nodeRadius) +
      multiShift;
    const c1x =
      segment.x1 + (segment.x2 - segment.x1) * 0.25 + segment.nx * shift;
    const c1y =
      segment.y1 + (segment.y2 - segment.y1) * 0.25 + segment.ny * shift;
    const c2x =
      segment.x1 + (segment.x2 - segment.x1) * 0.75 + segment.nx * shift;
    const c2y =
      segment.y1 + (segment.y2 - segment.y1) * 0.75 + segment.ny * shift;
    const midpoint = cubicBezierPoint(
      { x: segment.x1, y: segment.y1 },
      { x: c1x, y: c1y },
      { x: c2x, y: c2y },
      { x: segment.x2, y: segment.y2 },
      0.5,
    );
    const tangent = cubicBezierTangent(
      { x: segment.x1, y: segment.y1 },
      { x: c1x, y: c1y },
      { x: c2x, y: c2y },
      { x: segment.x2, y: segment.y2 },
      0.5,
    );
    const preferredSide = shift >= 0 ? 1 : -1;
    const labelPrimary = offsetFromTangent(
      midpoint,
      tangent,
      14,
      preferredSide,
    );
    const labelSecondary = offsetFromTangent(
      midpoint,
      tangent,
      14,
      -preferredSide,
    );
    return {
      d: `M ${segment.x1} ${segment.y1} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${segment.x2} ${segment.y2}`,
      labelOptions: [labelPrimary, labelSecondary],
    };
  }
  const seed = String(edge.id)
    .split("")
    .reduce((sum, part) => sum + part.charCodeAt(0), 0);
  const side = seed % 2 === 0 ? 1 : -1;
  const straightMidpoint = {
    x: (segment.x1 + segment.x2) / 2,
    y: (segment.y1 + segment.y2) / 2,
  };
  return {
    d: `M ${segment.x1} ${segment.y1} L ${segment.x2} ${segment.y2}`,
    labelOptions: [
      {
        x: straightMidpoint.x + segment.nx * 14 * side,
        y: straightMidpoint.y + segment.ny * 14 * side,
      },
      {
        x: straightMidpoint.x - segment.nx * 14 * side,
        y: straightMidpoint.y - segment.ny * 14 * side,
      },
    ],
  };
};
const getRectSelection = (rect, nodes) => {
  if (!rect) return [];
  const minX = Math.min(rect.startX, rect.endX);
  const maxX = Math.max(rect.startX, rect.endX);
  const minY = Math.min(rect.startY, rect.endY);
  const maxY = Math.max(rect.startY, rect.endY);
  return nodes
    .filter(
      (node) =>
        node.x >= minX && node.x <= maxX && node.y >= minY && node.y <= maxY,
    )
    .map((node) => String(node.id));
};
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
    <div className="relative h-full bg-white font-inter text-on-surface">
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
        <rect width="100%" height="100%" fill="#0b1220" />{" "}
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
