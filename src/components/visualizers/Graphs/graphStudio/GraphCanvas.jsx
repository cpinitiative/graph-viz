import { useEffect, useMemo, useRef, useState } from 'react';
import { useTheme } from '../../../../context/useTheme';
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
const DEFAULT_EDGE_COLOR = '#64748B';
const SELECTED_EDGE_COLORS = {
  light: '#171717',
  dark: '#F5F5F5',
};
const LEGEND_PALETTES = {
  light: {
    background: '#FFFFFF',
    border: '#CBD5E1',
    title: '#0F172A',
    text: '#334155',
    secondaryText: '#64748B',
    separator: '#E2E8F0',
    nodeStroke: '#334155',
  },
  dark: {
    background: '#111827',
    border: '#475569',
    title: '#F8FAFC',
    text: '#E2E8F0',
    secondaryText: '#94A3B8',
    separator: '#334155',
    nodeStroke: '#CBD5E1',
  },
};

const getEffectiveEdgeColor = ({ edge, selected, multiSelected, theme }) => {
  if (selected || multiSelected) {
    return SELECTED_EDGE_COLORS[theme] ?? SELECTED_EDGE_COLORS.light;
  }
  return edge.color ?? DEFAULT_EDGE_COLOR;
};

const hashMarkerColor = color => {
  let hash = 2166136261;
  for (let index = 0; index < color.length; index += 1) {
    hash ^= color.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
};

const getArrowMarkerId = color => {
  const normalizedColor = String(color).trim().toLowerCase();
  const hexMatch = normalizedColor.match(/^#([0-9a-f]{3,8})$/);
  if (hexMatch) return `graphstudio-arrow-${hexMatch[1]}`;

  const safeColor =
    normalizedColor
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 24) || 'color';
  return `graphstudio-arrow-${safeColor}-${hashMarkerColor(normalizedColor)}`;
};

const truncateLegendText = (value, maxLength = 34) => {
  const text = String(value ?? '').trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 3))}...`;
};

const buildLegendRows = (
  entries,
  { groupMaxLength = 28, entryMaxLength = 34 } = {}
) => {
  const groupedEntries = new Map();
  entries.forEach((entry, index) => {
    const group = String(entry.group ?? '').trim();
    const groupKey = group.toLowerCase();
    if (!groupedEntries.has(groupKey)) {
      groupedEntries.set(groupKey, {
        label: group,
        entries: [],
      });
    }
    groupedEntries.get(groupKey).entries.push({ entry, index });
  });

  const rows = [];
  Array.from(groupedEntries.values()).forEach((group, groupIndex) => {
    if (group.label) {
      rows.push({
        type: 'group',
        key: `group-${groupIndex}-${group.label}`,
        label: truncateLegendText(group.label, groupMaxLength),
        separated: groupIndex > 0,
      });
    }
    group.entries.forEach(({ entry, index }) => {
      rows.push({
        type: 'entry',
        key: `entry-${index}-${entry.label}`,
        entry,
        label: truncateLegendText(entry.label, entryMaxLength),
      });
    });
  });
  return rows;
};

const getLegendRowHeight = row =>
  row.type === 'group' ? (row.separated ? 24 : 18) : 22;

const resolveLegendPosition = position =>
  position === 'auto' ? 'bottom-right' : position;

const getLegendOrigin = ({
  canvasSize,
  boxWidth,
  boxHeight,
  margin,
  position,
  customPosition,
}) => {
  const maxX = Math.max(0, canvasSize.width - boxWidth);
  const maxY = Math.max(0, canvasSize.height - boxHeight);
  const leftX = Math.min(margin, maxX);
  const topY = Math.min(margin, maxY);
  const rightX = Math.max(0, maxX - margin);
  const bottomY = Math.max(0, maxY - margin);
  const resolvedPosition = resolveLegendPosition(position);

  if (resolvedPosition === 'custom') {
    return {
      x: leftX + (rightX - leftX) * customPosition.x,
      y: topY + (bottomY - topY) * customPosition.y,
    };
  }

  return {
    x: resolvedPosition.includes('right') ? rightX : leftX,
    y: resolvedPosition.includes('bottom') ? bottomY : topY,
  };
};

const LegendSwatch = ({ entry, nodeStroke }) => {
  if (entry.kind === 'edge') {
    return (
      <line
        x1="0"
        y1="0"
        x2="18"
        y2="0"
        stroke={entry.color}
        strokeWidth="3"
        strokeLinecap="square"
      />
    );
  }

  return (
    <circle
      cx="7"
      cy="0"
      r="6"
      fill={entry.color}
      stroke={nodeStroke}
      strokeWidth="1"
    />
  );
};

const Legend = ({ customLegend, setCustomLegend, canvasSize, svgRef }) => {
  const { theme } = useTheme();
  const legend = normalizeCustomLegend(customLegend);
  const palette = LEGEND_PALETTES[theme] ?? LEGEND_PALETTES.light;
  const dragStateRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
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
    (height, row) => height + getLegendRowHeight(row),
    0
  );
  const boxHeight = Math.min(maxBoxHeight, 42 + rowsHeight);
  const availableRowsHeight = Math.max(0, boxHeight - 42);
  const visibleRows = [];
  let usedRowsHeight = 0;
  for (const row of rows) {
    const rowHeight = getLegendRowHeight(row);
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
    customPosition: legend.customPosition,
  });
  const leftX = Math.min(margin, Math.max(0, canvasSize.width - boxWidth));
  const topY = Math.min(margin, Math.max(0, canvasSize.height - boxHeight));
  const rightX = Math.max(0, Math.max(0, canvasSize.width - boxWidth) - margin);
  const bottomY = Math.max(
    0,
    Math.max(0, canvasSize.height - boxHeight) - margin
  );
  const updateCustomPosition = event => {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    const svgBounds = svgRef.current?.getBoundingClientRect();
    if (!svgBounds || svgBounds.width <= 0 || svgBounds.height <= 0) return;
    const scaleX = canvasSize.width / svgBounds.width;
    const scaleY = canvasSize.height / svgBounds.height;
    const nextX =
      dragState.originX + (event.clientX - dragState.startClientX) * scaleX;
    const nextY =
      dragState.originY + (event.clientY - dragState.startClientY) * scaleY;
    const normalizedX =
      rightX > leftX
        ? Math.max(0, Math.min(1, (nextX - leftX) / (rightX - leftX)))
        : 0;
    const normalizedY =
      bottomY > topY
        ? Math.max(0, Math.min(1, (nextY - topY) / (bottomY - topY)))
        : 0;
    setCustomLegend?.(prev => ({
      ...normalizeCustomLegend(prev),
      position: 'custom',
      customPosition: {
        x: normalizedX,
        y: normalizedY,
      },
    }));
  };
  const finishDragging = event => {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    dragStateRef.current = null;
    setIsDragging(false);
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  };

  return (
    <g
      data-testid="custom-export-legend"
      data-legend-position={legend.position}
      data-custom-position-x={legend.customPosition.x}
      data-custom-position-y={legend.customPosition.y}
      data-legend-theme={theme}
      aria-label="Legend preview"
      pointerEvents="all"
      transform={`translate(${x} ${y})`}
      onPointerDown={event => {
        event.preventDefault();
        event.stopPropagation();
        dragStateRef.current = {
          pointerId: event.pointerId,
          startClientX: event.clientX,
          startClientY: event.clientY,
          originX: x,
          originY: y,
        };
        setIsDragging(true);
        event.currentTarget.setPointerCapture?.(event.pointerId);
      }}
      onPointerMove={updateCustomPosition}
      onPointerUp={finishDragging}
      onPointerCancel={finishDragging}
      style={{
        cursor: isDragging ? 'grabbing' : 'grab',
        touchAction: 'none',
      }}
    >
      <rect
        x="0"
        y="0"
        width={boxWidth}
        height={boxHeight}
        fill={palette.background}
        stroke={palette.border}
        strokeWidth="1"
      />
      <text
        x="12"
        y="20"
        fill={palette.title}
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
        stroke={palette.separator}
        strokeWidth="1"
      />
      {visibleRows.map((row, index) => {
        const rowY =
          42 +
          visibleRows
            .slice(0, index)
            .reduce(
              (height, previous) => height + getLegendRowHeight(previous),
              0
            );
        if (row.type === 'group') {
          return (
            <g key={row.key}>
              {row.separated && (
                <line
                  x1="12"
                  y1={rowY - 7}
                  x2={boxWidth - 12}
                  y2={rowY - 7}
                  stroke={palette.separator}
                  strokeWidth="1"
                />
              )}
              <text
                x="12"
                y={rowY + (row.separated ? 5 : 0)}
                fill={palette.secondaryText}
                fontFamily="Arial, sans-serif"
                fontSize="10"
                fontWeight="700"
                letterSpacing="0"
              >
                {row.label}
              </text>
            </g>
          );
        }

        return (
          <g key={row.key} transform={`translate(12 ${rowY + 3})`}>
            <LegendSwatch entry={row.entry} nodeStroke={palette.nodeStroke} />
            <text
              x="22"
              y="4"
              fill={palette.text}
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
  setCustomLegend,
  snapEnabled,
  lockCanvas,
  edgeRouting,
  edgeCurvature,
  nodeRadius = NODE_RADIUS,
  edgeWidth = 2.2,
  resetViewTrigger = 0,
  svgElementId = 'graph-studio-canvas-svg',
  svgTestId = 'graph-canvas-svg',
  svgResourcePrefix = '',
  layoutIdPrefix = '',
  onSelectNode,
  onSelectEdge,
  onSelectNodes,
  onBackgroundClear,
  onNodePointerDown,
  onNodeMove,
  onNodePointerUp,
  onNodeClickForDraw,
  onCanvasAddNode,
}) => {
  const { theme } = useTheme();
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
  const edgeVisualData = useMemo(
    () =>
      edgeRenderData.map(renderData => {
        const { edge } = renderData;
        const selected =
          selectedObject?.type === 'edge' &&
          String(selectedObject.id) === String(edge.id);
        const multiSelected = edgeBetweenSelected(edge, selectedNodeIds);
        const strokeColor = getEffectiveEdgeColor({
          edge,
          selected,
          multiSelected,
          theme,
        });
        return {
          ...renderData,
          selected,
          multiSelected,
          strokeColor,
          markerId: `${svgResourcePrefix ? `${svgResourcePrefix}-` : ''}${getArrowMarkerId(strokeColor)}`,
        };
      }),
    [edgeRenderData, selectedNodeIds, selectedObject, svgResourcePrefix, theme]
  );
  const arrowMarkers = useMemo(() => {
    const markers = new Map();
    edgeVisualData.forEach(({ edge, markerId, strokeColor }) => {
      if (edge.directed) markers.set(markerId, strokeColor);
    });
    return Array.from(markers, ([id, color]) => ({ id, color }));
  }, [edgeVisualData]);
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
    svgRef.current?.focus();
    const bounds = svgRef.current?.getBoundingClientRect();
    if (!bounds) return;
    const local = {
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    };
    const world = toWorld(local, viewState);
    if (mode === 'add') {
      onCanvasAddNode(world);
      return;
    }
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
    svgRef.current?.focus();
    if (mode === 'pan') return;
    if (mode === 'draw' || mode === 'add') {
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
  return (
    <div className="relative h-full bg-white font-inter text-on-surface dark:bg-gray-900 dark:text-dark-on-surface">
      <svg
        id={svgElementId}
        data-testid={svgTestId}
        xmlns="http://www.w3.org/2000/svg"
        ref={svgRef}
        className="h-full w-full"
        aria-label="Graph canvas"
        data-frame-navigation-surface="true"
        data-mode={mode}
        data-view-x={viewState.x}
        data-view-y={viewState.y}
        data-view-zoom={viewState.zoom}
        tabIndex="0"
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
          if (mode === 'select') onCanvasAddNode(world);
        }}
        style={{
          touchAction: 'none',
          cursor:
            mode === 'pan'
              ? 'grab'
              : mode === 'add' || mode === 'draw'
                ? 'crosshair'
                : 'default',
        }}
      >
        <defs>
          <pattern
            id={`${svgResourcePrefix ? `${svgResourcePrefix}-` : ''}graphstudio-dot-grid`}
            width="28"
            height="28"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="1.2" cy="1.2" r="1.2" fill="#e2e2e2" />
          </pattern>
          {arrowMarkers.map(({ id, color }) => (
            <marker
              key={id}
              id={id}
              data-edge-color={color}
              markerWidth="12"
              markerHeight="12"
              refX="10"
              refY="6"
              orient="auto"
              markerUnits="userSpaceOnUse"
            >
              <path d="M0,0 L0,12 L10,6 z" fill={color} />
            </marker>
          ))}
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
              fill={`url(#${svgResourcePrefix ? `${svgResourcePrefix}-` : ''}graphstudio-dot-grid)`}
            />
          )}
          <g data-export-content="true">
            {edgeVisualData.map(
              ({
                edge,
                pathD,
                labelPosition,
                selected,
                multiSelected,
                strokeColor,
                markerId,
              }) => {
                const endpointMoved =
                  diff.changedNodes.has(String(edge.from)) ||
                  diff.changedNodes.has(String(edge.to));
                const strokeWidth = edgeWidth;
                return (
                  <GraphEdge
                    key={edge.id}
                    edge={edge}
                    pathD={pathD}
                    strokeColor={strokeColor}
                    selected={selected}
                    multiSelected={multiSelected}
                    markerId={markerId}
                    labelPosition={labelPosition}
                    strokeWidth={strokeWidth}
                    layoutIdPrefix={layoutIdPrefix}
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
              }
            )}
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
                    layoutIdPrefix={layoutIdPrefix}
                    mode={mode}
                    onPointerDown={event =>
                      handleNodePointerDown(event, node.id)
                    }
                    onClick={event => {
                      event.stopPropagation();
                      if (mode === 'pan' || mode === 'add') return;
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
        <Legend
          customLegend={customLegend}
          setCustomLegend={setCustomLegend}
          canvasSize={canvasSize}
          svgRef={svgRef}
        />
      </svg>
    </div>
  );
};

export default GraphCanvas;
