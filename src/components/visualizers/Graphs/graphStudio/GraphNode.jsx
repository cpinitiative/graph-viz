import { motion } from 'framer-motion';
import { useTheme } from '../../../../context/useTheme';
import { NODE_RADIUS } from './constants';
import {
  getDefaultNodeLabelFontSize,
  normalizeNodeLabelFontSize,
} from './lib/fontSizing';
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

  return (
    <g
      data-node-id={node.id}
      data-graph-object="node"
      data-node-status={node.status ?? 'default'}
      className={isExporting ? undefined : 'graphstudio-object'}
      role={isExporting ? 'img' : 'button'}
      tabIndex={isExporting ? undefined : tabIndex}
      aria-label={`Node ${node.annotation || node.label}${node.annotation ? `. ${node.annotation}` : ''}. ${node.resolvedStateLabel ?? NODE_STATES[getSemanticNodeStatus(node)]?.label ?? 'Default'}${drawAnchor ? '. Edge source' : ''}`}
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
      <motion.circle
        cx={node.x}
        cy={node.y}
        r={nodeRadius}
        fill={palette.fill}
        stroke={palette.stroke}
        strokeWidth={getSemanticNodeStatus(node) === 'active' ? 3.5 : 2}
        strokeDasharray={palette.dash}
        layoutId={`${layoutIdPrefix}node-${node.id}`}
        initial={false}
        animate={{ cx: node.x, cy: node.y }}
        transition={
          shouldAnimate
            ? { duration: 0.32, ease: 'easeInOut' }
            : { duration: 0 }
        }
      />
      {(selected || multiSelected) && (
        <motion.circle
          data-node-selection-ring-id={node.id}
          data-node-selection-ring-kind={selected ? 'primary' : 'multi'}
          cx={node.x}
          cy={node.y}
          r={nodeRadius + 3}
          fill="none"
          stroke={selectionRingColor}
          strokeWidth={selected ? 1.5 : 1.25}
          pointerEvents="none"
          animate={{ cx: node.x, cy: node.y }}
          transition={
            shouldAnimate
              ? { duration: 0.32, ease: 'easeInOut' }
              : { duration: 0 }
          }
        />
      )}
      {drawAnchor && (
        <motion.circle
          data-node-draw-source-ring-id={node.id}
          cx={node.x}
          cy={node.y}
          r={nodeRadius + 4}
          fill="none"
          stroke={ringColors.drawAnchor}
          strokeWidth="1.5"
          strokeDasharray="2.5 4"
          pointerEvents="none"
          animate={{ cx: node.x, cy: node.y }}
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
        fill={palette.text}
        style={{
          fontSize: `${effectiveLabelFontSize}px`,
          fontWeight: 600,
          userSelect: 'none',
          pointerEvents: 'none',
          fontFamily: 'sans-serif',
        }}
      >
        {node.annotation || node.label}
      </text>
    </g>
  );
};

export default GraphNode;
