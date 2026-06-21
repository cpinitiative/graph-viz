import { useEffect, useMemo, useRef, useState } from 'react';
import GraphEdge from './GraphEdge';
import GraphNode from './GraphNode';
import { NODE_RADIUS, VIEWBOX_HEIGHT, VIEWBOX_WIDTH } from './constants';
import {
  clampViewStateToPlayspace,
  clampZoom,
  computeMinZoom,
  EPSILON,
  getRectSelection,
  toWorld,
} from './graphCanvasUtils';
import { edgeBetweenSelected } from './graphStudioUtils';
import { normalizeCustomLegend } from './lib/customLegend';
import { getEdgeRenderData } from './lib/edgeRenderData';

const NODE_DRAG_THRESHOLD_PX = 4;

const truncateLegendText = (value, maxLength = 34) => {
  const text = String(value ?? '').trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 3))}...`;
};

const buildLegendRows = (
  entries,
  { groupMaxLength = 28, entryMaxLength = 34 } = {}
) => {
  const rows = [];
  let activeGroup = null;
  entries.forEach((entry, index) => {
    const group = entry.group || '';
    if (group && group !== activeGroup) {
      rows.push({
        type: 'group',
        key: `group-${index}-${group}`,
        label: truncateLegendText(group, groupMaxLength),
      });
      activeGroup = group;
    }
    rows.push({
      type: 'entry',
      key: `entry-${index}-${entry.label}`,
      entry,
      label: truncateLegendText(entry.label, entryMaxLength),
    });
  });
  return rows;
};

const resolveLegendPosition = position =>
  position === 'auto' ? 'bottom-right' : position;

const getLegendOrigin = ({
  canvasSize,
  boxWidth,
  boxHeight,
  margin,
  position,
}) => {
  const maxX = Math.max(0, canvasSize.width - boxWidth);
  const maxY = Math.max(0, canvasSize.height - boxHeight);
  const leftX = Math.min(margin, maxX);
  const topY = Math.min(margin, maxY);
  const rightX = Math.max(0, maxX - margin);
  const bottomY = Math.max(0, maxY - margin);
  const resolvedPosition = resolveLegendPosition(position);

  return {
    x: resolvedPosition.includes('right') ? rightX : leftX,
    y: resolvedPosition.includes('bottom') ? bottomY : topY,
  };
};

const LegendSwatch = ({ entry }) => {
  if (entry.kind === 'edge') {
    return (
      <line
        x1="0"
        y1="-3"
        x2="18"
        y2="-3"
        stroke={entry.color}
        strokeWidth="3"
        strokeLinecap="square"
      />
    );
  }

  return (
    <circle
      cx="7"
      cy="-4"
      r="6"
      fill={entry.color}
      stroke="#334155"
      strokeWidth="1"
    />
  );
};

const Legend = ({ customLegend, canvasSize }) => {
  const legend = normalizeCustomLegend(customLegend);
  if (!legend.enabled || canvasSize.width <= 0 || canvasSize.height <= 0) {
    return null;
  }

  const title = truncateLegendText(legend.title || 'Legend', 32);
  const entries = legend.entries.map(entry => ({
    ...entry,
    label: truncateLegendText(entry.label, 34),
  }));
  const initialRows = buildLegendRows(entries);
  const maxTextLength = Math.max(
    title.length,
    ...initialRows.map(row => row.label.length),
    10
  );
  const margin = Math.min(
    16,
    Math.max(
      4,
      Math.floor(Math.min(canvasSize.width, canvasSize.height) * 0.04)
    )
  );
  const maxBoxWidth = Math.max(1, canvasSize.width - margin * 2);
  const maxBoxHeight = Math.max(1, canvasSize.height - margin * 2);
  const boxWidth = Math.min(
    maxBoxWidth,
    300,
    Math.max(168, 48 + maxTextLength * 7)
  );
  const titleMaxLength = Math.max(4, Math.floor((boxWidth - 24) / 7));
  const rowMaxLength = Math.max(4, Math.floor((boxWidth - 48) / 7));
  const fittedTitle = truncateLegendText(title, titleMaxLength);
  const fittedEntries = legend.entries.map(entry => ({
    ...entry,
    label: truncateLegendText(entry.label, rowMaxLength),
  }));
  const rows = buildLegendRows(fittedEntries, {
    groupMaxLength: rowMaxLength,
    entryMaxLength: rowMaxLength,
  });
  const rowsHeight = rows.reduce(
    (height, row) => height + (row.type === 'group' ? 18 : 22),
    0
  );
  const boxHeight = Math.min(maxBoxHeight, 42 + rowsHeight);
  const availableRowsHeight = Math.max(0, boxHeight - 42);
  const visibleRows = [];
  let usedRowsHeight = 0;
  for (const row of rows) {
    const rowHeight = row.type === 'group' ? 18 : 22;
    if (usedRowsHeight + rowHeight > availableRowsHeight) break;
    visibleRows.push(row);
    usedRowsHeight += rowHeight;
  }
  const { x, y } = getLegendOrigin({
    canvasSize,
    boxWidth,
    boxHeight,
    margin,
    position: legend.position,
  });

  return (
    <g
      data-testid="custom-export-legend"
      aria-label="Legend preview"
      pointerEvents="none"
      transform={`translate(${x} ${y})`}
    >
      <rect
        x="0"
        y="0"
        width={boxWidth}
        height={boxHeight}
        fill="#FFFFFF"
        stroke="#CBD5E1"
        strokeWidth="1"
      />
      <text
        x="12"
        y="20"
        fill="#0F172A"
        fontFamily="Arial, sans-serif"
        fontSize="12"
        fontWeight="700"
        letterSpacing="0"
      >
        {fittedTitle}
      </text>
      <line
        x1="12"
        y1="28"
        x2={boxWidth - 12}
        y2="28"
        stroke="#E2E8F0"
        strokeWidth="1"
      />
      {visibleRows.map((row, index) => {
        const rowY =
          42 +
          visibleRows
            .slice(0, index)
            .reduce(
              (height, previous) =>
                height + (previous.type === 'group' ? 18 : 22),
              0
            );
        if (row.type === 'group') {
          return (
            <text
              key={row.key}
              x="12"
              y={rowY}
              fill="#64748B"
              fontFamily="Arial, sans-serif"
              fontSize="10"
              fontWeight="700"
              letterSpacing="0"
            >
              {row.label}
            </text>
          );
        }

        return (
          <g key={row.key} transform={`translate(12 ${rowY + 5})`}>
            <LegendSwatch entry={row.entry} />
            <text
              x="22"
              y="2"
              fill="#334155"
              fontFamily="Arial, sans-serif"
              fontSize="11"
              fontWeight="500"
              letterSpacing="0"
            >
              {row.label}
            </text>
          </g>
        );
      })}
    </g>
  );
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
  customLegend,
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
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [dragRect, setDragRect] = useState(null);
  const pointerStateRef = useRef(null);
  const hasInitializedViewRef = useRef(false);
  const nodeMap = useMemo(() => {
    const map = new Map();
    graph.nodes.forEach(node => map.set(String(node.id), node));
    return map;
  }, [graph.nodes]);
  const edgeRenderData = useMemo(() => {
    return getEdgeRenderData({
      edges: graph.edges,
      nodes: graph.nodes,
      nodeMap,
      edgeRouting,
      edgeCurvature,
      nodeRadius,
    });
  }, [
    graph.edges,
    graph.nodes,
    nodeMap,
    edgeRouting,
    edgeCurvature,
    nodeRadius,
  ]);
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return undefined;
    const updateCanvasSize = () => {
      const bounds = el.getBoundingClientRect();
      setCanvasSize(prev => {
        const next = {
          width: Math.max(0, Math.round(bounds.width)),
          height: Math.max(0, Math.round(bounds.height)),
        };
        return prev.width === next.width && prev.height === next.height
          ? prev
          : next;
      });
    };
    updateCanvasSize();
    const ro = new ResizeObserver(updateCanvasSize);
    ro.observe(el);
    window.addEventListener('resize', updateCanvasSize);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', updateCanvasSize);
    };
  }, []);
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
      const visibleNodes = graph.nodes.filter(node => node.visible !== false);
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
      const xs = visibleNodes.map(node => node.x);
      const ys = visibleNodes.map(node => node.y);
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
        1
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
        window.removeEventListener('resize', onWindowResize);
      }
    };
    window.addEventListener('resize', onWindowResize);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', onWindowResize);
    };
  }, [graph.nodes, nodeRadius, setViewState, resetViewTrigger]);
  useEffect(() => {
    const bounds = svgRef.current?.getBoundingClientRect();
    if (!bounds) return;
    setViewState(prev => {
      const clamped = clampViewStateToPlayspace(
        prev,
        bounds.width,
        bounds.height
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
    const handleWheel = event => {
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
        bounds.height
      );
      setViewState(prev => {
        const candidate = {
          ...prev,
          zoom: nextZoom,
          x: cursorX - worldBefore.x * nextZoom,
          y: cursorY - worldBefore.y * nextZoom,
        };
        return clampViewStateToPlayspace(
          candidate,
          bounds.width,
          bounds.height
        );
      });
    };
    svg.addEventListener('wheel', handleWheel, { passive: false });
    return () => svg.removeEventListener('wheel', handleWheel);
  }, [lockCanvas, viewState, setViewState]);
  const onPointerDownBackground = event => {
    const bounds = svgRef.current?.getBoundingClientRect();
    if (!bounds) return;
    const local = {
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    };
    const world = toWorld(local, viewState);
    if (mode === 'pan') {
      if (lockCanvas) return;
      pointerStateRef.current = {
        type: 'pan',
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        originX: viewState.x,
        originY: viewState.y,
      };
      event.currentTarget.setPointerCapture?.(event.pointerId);
      return;
    }
    if (mode === 'select') {
      pointerStateRef.current = { type: 'rect', pointerId: event.pointerId };
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
  const onPointerMove = event => {
    const state = pointerStateRef.current;
    if (!state || state.pointerId !== event.pointerId) return;
    if (state.type === 'pan') {
      if (lockCanvas) return;
      const dx = event.clientX - state.startX;
      const dy = event.clientY - state.startY;
      const bounds = svgRef.current?.getBoundingClientRect();
      if (!bounds) return;
      setViewState(prev => {
        const candidate = {
          ...prev,
          x: state.originX + dx,
          y: state.originY + dy,
        };
        return clampViewStateToPlayspace(
          candidate,
          bounds.width,
          bounds.height
        );
      });
      return;
    }
    if (state.type === 'rect') {
      const bounds = svgRef.current?.getBoundingClientRect();
      if (!bounds) return;
      const local = {
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      };
      const world = toWorld(local, viewState);
      setDragRect(prev =>
        prev ? { ...prev, endX: world.x, endY: world.y } : prev
      );
      return;
    }
    if (state.type === 'node-press') {
      const dx = event.clientX - state.startClientX;
      const dy = event.clientY - state.startClientY;
      if (Math.hypot(dx, dy) < NODE_DRAG_THRESHOLD_PX) return;
      const bounds = svgRef.current?.getBoundingClientRect();
      if (!bounds) return;
      const local = {
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      };
      const world = toWorld(local, viewState);
      pointerStateRef.current = { ...state, type: 'drag-node' };
      onNodePointerDown({
        pointerId: event.pointerId,
        nodeId: state.nodeId,
        worldX: state.startWorldX,
        worldY: state.startWorldY,
        snapEnabled,
      });
      onNodeMove({
        pointerId: event.pointerId,
        worldX: world.x,
        worldY: world.y,
        snapEnabled,
      });
      return;
    }
    if (state.type === 'drag-node') {
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
  const onPointerUp = event => {
    const state = pointerStateRef.current;
    if (!state || state.pointerId !== event.pointerId) return;
    if (state.type === 'rect' && dragRect) {
      onSelectNodes(getRectSelection(dragRect, graph.nodes));
    }
    if (state.type === 'drag-node') {
      onNodePointerUp({ pointerId: event.pointerId, snapEnabled });
    }
    pointerStateRef.current = null;
    setDragRect(null);
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  };
  const handleNodePointerDown = (event, nodeId) => {
    if (mode === 'draw') {
      event.stopPropagation();
      return;
    }
    event.stopPropagation();
    const bounds = svgRef.current?.getBoundingClientRect();
    if (!bounds) return;
    const local = {
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    };
    const world = toWorld(local, viewState);
    pointerStateRef.current = {
      type: 'node-press',
      pointerId: event.pointerId,
      nodeId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startWorldX: world.x,
      startWorldY: world.y,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const markerId = 'graphstudio-arrow';
  return (
    <div className="relative h-full bg-white font-inter text-on-surface dark:bg-gray-900 dark:text-dark-on-surface">
      <svg
        id="graph-studio-canvas-svg"
        data-testid="graph-canvas-svg"
        xmlns="http://www.w3.org/2000/svg"
        ref={svgRef}
        className="h-full w-full"
        onPointerDown={onPointerDownBackground}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        onDoubleClick={event => {
          const bounds = svgRef.current?.getBoundingClientRect();
          if (!bounds) return;
          const local = {
            x: event.clientX - bounds.left,
            y: event.clientY - bounds.top,
          };
          const world = toWorld(local, viewState);
          onCanvasDoubleClick(world);
        }}
        style={{ touchAction: 'none' }}
      >
        <defs>
          <pattern
            id="graphstudio-dot-grid"
            width="28"
            height="28"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="1.2" cy="1.2" r="1.2" fill="#e2e2e2" />
          </pattern>
          <marker
            id={markerId}
            markerWidth="12"
            markerHeight="12"
            refX="10"
            refY="6"
            orient="auto"
            markerUnits="userSpaceOnUse"
          >
            <path d="M0,0 L0,12 L10,6 z" fill="context-stroke" />
          </marker>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="white"
          className="dark:fill-[#121212]"
        />
        <g
          transform={`translate(${viewState.x} ${viewState.y}) scale(${viewState.zoom})`}
        >
          {showGrid && (
            <rect
              x="-10000"
              y="-10000"
              width="20000"
              height="20000"
              fill="url(#graphstudio-dot-grid)"
            />
          )}
          <g data-export-content="true">
            {edgeRenderData.map(({ edge, pathD, labelPosition }) => {
              const selected =
                selectedObject?.type === 'edge' &&
                String(selectedObject.id) === String(edge.id);
              const multiSelected = edgeBetweenSelected(edge, selectedNodeIds);
              const endpointMoved =
                diff.changedNodes.has(String(edge.from)) ||
                diff.changedNodes.has(String(edge.to));
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
                  shouldAnimate={
                    endpointMoved || diff.changedEdges.has(String(edge.id))
                  }
                  onPointerDown={event => {
                    event.stopPropagation();
                    onSelectEdge(edge.id);
                  }}
                  onClick={event => {
                    event.stopPropagation();
                    onSelectEdge(edge.id);
                  }}
                />
              );
            })}
            {graph.nodes
              .filter(node => node.visible !== false)
              .map(node => {
                const selected =
                  selectedObject?.type === 'node' &&
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
                    onPointerDown={event =>
                      handleNodePointerDown(event, node.id)
                    }
                    onClick={event => {
                      event.stopPropagation();
                      if (mode === 'draw') {
                        onNodeClickForDraw(node.id);
                        return;
                      }
                      onSelectNode(node.id, event.shiftKey || event.metaKey);
                    }}
                  />
                );
              })}
          </g>
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
          )}
        </g>
        <Legend customLegend={customLegend} canvasSize={canvasSize} />
      </svg>
    </div>
  );
};

export default GraphCanvas;
