import { motion } from 'framer-motion';
import { useTheme } from '../../../../context/useTheme';
import { NODE_RADIUS } from './constants';
import {
  getDefaultNodeLabelFontSize,
  normalizeNodeLabelFontSize,
} from './lib/fontSizing';
import {
  getNodeAccessibleName,
  getNodeAnnotationFontSize,
  getNodeDisplayText,
  getNodeShape,
  getNodeShapeBounds,
} from './lib/nodeGeometry.js';
import {
  getContrastText,
  isGraphColor,
  NODE_STATES,
} from './lib/visualProperties';

const EDITOR_RING_COLORS = {
  light: {
    selected: '#2F6FD6',
    multiSelected: '#64748B',
    drawAnchor: '#0F766E',
  },
  dark: {
    selected: '#38BDF8',
    multiSelected: '#93C5FD',
    drawAnchor: '#5EEAD4',
  },
};

const getSemanticNodeStatus = node => {
  const explicitStatus = String(node?.status ?? 'default').toLowerCase();
  if (explicitStatus !== 'default') return explicitStatus;
  const cue =
    `${node?.stateId ?? ''} ${node?.resolvedStateLabel ?? ''}`.toLowerCase();
  if (/queued|waiting|frontier/.test(cue)) return 'queued';
  if (/visited|done|finished|completed|finalized/.test(cue)) return 'visited';
  if (/discarded|rejected|skipped/.test(cue)) return 'discarded';
  if (/active|current|minimum|source/.test(cue)) return 'active';
  return 'default';
};

const getNodePalette = (node, theme) => {
  const state = NODE_STATES[getSemanticNodeStatus(node)] ?? NODE_STATES.default;
  const fill =
    isGraphColor(node?.color) && node.color ? node.color : state.color;
  return {
    fill,
    stroke: theme === 'dark' ? '#E2E8F0' : '#334155',
    text: getContrastText(fill),
    dash: state.dash,
  };
};

const NodeOutline = ({
  node,
  nodeRadius,
  labelFontSize,
  padding = 0,
  ...props
}) => {
  const shape = getNodeShape(node);
  const bounds = getNodeShapeBounds(node, nodeRadius, labelFontSize);
  const halfWidth = bounds.width / 2 + padding;
  const halfHeight = bounds.height / 2 + padding;
  if (shape === 'circle') {
    return (
      <motion.circle
        {...props}
        cx={node.x}
        cy={node.y}
        r={halfWidth}
        animate={{ cx: node.x, cy: node.y }}
      />
    );
  }
  if (shape === 'diamond') {
    const d = `M ${node.x} ${node.y - halfHeight} L ${node.x + halfWidth} ${node.y} L ${node.x} ${node.y + halfHeight} L ${node.x - halfWidth} ${node.y} Z`;
    return <motion.path {...props} d={d} animate={{ d }} />;
  }
  return (
    <motion.rect
      {...props}
      x={node.x - halfWidth}
      y={node.y - halfHeight}
      width={halfWidth * 2}
      height={halfHeight * 2}
      animate={{ attrX: node.x - halfWidth, attrY: node.y - halfHeight }}
    />
  );
};

const GraphNode = ({
  node,
  selected,
  multiSelected,
  drawAnchor,
  shouldAnimate,
  layoutIdPrefix = '',
  onPointerDown,
  onClick,
  onKeyDown,
  tabIndex = 0,
  mode,
  isExporting = false,
  themeOverride,
  nodeRadius = NODE_RADIUS,
  labelFontSize,
}) => {
  const { theme: contextTheme } = useTheme();
  const theme = themeOverride ?? contextTheme;
  const palette = getNodePalette(node, theme);
  const ringColors = EDITOR_RING_COLORS[theme] ?? EDITOR_RING_COLORS.light;
  const selectionRingColor = selected
    ? ringColors.selected
    : ringColors.multiSelected;
  const effectiveLabelFontSize = Number.isFinite(Number(labelFontSize))
    ? normalizeNodeLabelFontSize(labelFontSize)
    : getDefaultNodeLabelFontSize(nodeRadius);
  const shape = getNodeShape(node);
  const text = getNodeDisplayText(node);
  const shapeBounds = getNodeShapeBounds(
    node,
    nodeRadius,
    effectiveLabelFontSize
  );
  const annotationFontSize = getNodeAnnotationFontSize(effectiveLabelFontSize);
  const annotationColor = theme === 'dark' ? '#CBD5E1' : '#334155';

  return (
    <g
      data-node-id={node.id}
      data-graph-object="node"
      data-node-status={node.status ?? 'default'}
      data-node-shape={shape}
      className={isExporting ? undefined : 'graphstudio-object'}
      role={isExporting ? 'img' : 'button'}
      tabIndex={isExporting ? undefined : tabIndex}
      aria-label={getNodeAccessibleName(
        node,
        node.resolvedStateLabel ??
          NODE_STATES[getSemanticNodeStatus(node)]?.label ??
          'Default',
        drawAnchor
      )}
      aria-pressed={
        isExporting ? undefined : Boolean(selected || multiSelected)
      }
      onKeyDown={isExporting ? undefined : onKeyDown}
      style={
        isExporting
          ? undefined
          : {
              cursor:
                mode === 'draw'
                  ? 'crosshair'
                  : mode === 'add'
                    ? 'not-allowed'
                    : 'grab',
            }
      }
      onClick={isExporting ? undefined : onClick}
      onPointerDown={isExporting ? undefined : onPointerDown}
    >
      <NodeOutline
        node={node}
        nodeRadius={nodeRadius}
        labelFontSize={effectiveLabelFontSize}
        data-node-outline-id={node.id}
        fill={shape === 'text' ? 'transparent' : palette.fill}
        stroke={shape === 'text' ? 'none' : palette.stroke}
        strokeWidth={getSemanticNodeStatus(node) === 'active' ? 3.5 : 2}
        strokeDasharray={palette.dash}
        layoutId={`${layoutIdPrefix}node-${node.id}`}
        initial={false}
        transition={
          shouldAnimate
            ? { duration: 0.32, ease: 'easeInOut' }
            : { duration: 0 }
        }
      />
      {(selected || multiSelected) && (
        <NodeOutline
          node={node}
          nodeRadius={nodeRadius}
          labelFontSize={effectiveLabelFontSize}
          padding={3}
          data-node-selection-ring-id={node.id}
          data-node-selection-ring-kind={selected ? 'primary' : 'multi'}
          fill="none"
          stroke={selectionRingColor}
          strokeWidth={selected ? 1.5 : 1.25}
          pointerEvents="none"
          transition={
            shouldAnimate
              ? { duration: 0.32, ease: 'easeInOut' }
              : { duration: 0 }
          }
        />
      )}
      {drawAnchor && (
        <NodeOutline
          node={node}
          nodeRadius={nodeRadius}
          labelFontSize={effectiveLabelFontSize}
          padding={4}
          data-node-draw-source-ring-id={node.id}
          fill="none"
          stroke={ringColors.drawAnchor}
          strokeWidth="1.5"
          strokeDasharray="2.5 4"
          pointerEvents="none"
          transition={
            shouldAnimate
              ? { duration: 0.32, ease: 'easeInOut' }
              : { duration: 0 }
          }
        />
      )}
      <text
        data-node-label-id={node.id}
        x={node.x}
        y={node.y + effectiveLabelFontSize * 0.35}
        textAnchor="middle"
        fill={
          shape === 'text'
            ? theme === 'dark'
              ? '#F8FAFC'
              : '#0F172A'
            : palette.text
        }
        style={{
          fontSize: `${effectiveLabelFontSize}px`,
          fontWeight: 600,
          userSelect: 'none',
          pointerEvents: 'none',
          fontFamily: 'sans-serif',
        }}
      >
        {text.label}
      </text>
      {text.annotation && (
        <text
          data-node-annotation-id={node.id}
          x={node.x}
          y={shapeBounds.y + shapeBounds.height + annotationFontSize + 7}
          textAnchor="middle"
          fill={annotationColor}
          stroke={theme === 'dark' ? '#0F172A' : '#FFFFFF'}
          strokeWidth="3"
          paintOrder="stroke"
          style={{
            fontSize: `${annotationFontSize}px`,
            fontWeight: 500,
            fontFamily: 'sans-serif',
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          {text.annotation}
        </text>
      )}
    </g>
  );
};

export default GraphNode;
