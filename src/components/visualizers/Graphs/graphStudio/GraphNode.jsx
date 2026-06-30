import { motion } from 'framer-motion';
import { useTheme } from '../../../../context/useTheme';
import { NODE_RADIUS, NODE_STATUS_COLORS } from './constants';
import {
  getDefaultNodeLabelFontSize,
  normalizeNodeLabelFontSize,
} from './lib/fontSizing';

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

const getNodePalette = (node, theme) => {
  if (theme === 'dark') {
    if (node?.color) {
      return { fill: node.color, stroke: '#E2E8F0', text: '#0F172A' };
    }
    const status = String(node?.status ?? 'default').toLowerCase();
    const darkPalettes = {
      default: { fill: '#FFFFFF', stroke: '#CBD5E1', text: '#0F172A' },
      active: { fill: '#000000', stroke: '#E2E8F0', text: '#FFFFFF' },
      queued: { fill: '#EEEEEE', stroke: '#CBD5E1', text: '#0F172A' },
      visited: { fill: '#E2E8F0', stroke: '#CBD5E1', text: '#0F172A' },
      discarded: { fill: '#FFFFFF', stroke: '#94A3B8', text: '#64748B' },
    };
    return darkPalettes[status] ?? darkPalettes.default;
  }

  if (node?.color) {
    return { fill: node.color, stroke: '#1b1b1b', text: '#1b1b1b' };
  }
  return (
    NODE_STATUS_COLORS[String(node?.status ?? 'default').toLowerCase()] ??
    NODE_STATUS_COLORS.default
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
  mode,
  nodeRadius = NODE_RADIUS,
  labelFontSize,
}) => {
  const { theme } = useTheme();
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
      style={{ cursor: mode === 'draw' ? 'crosshair' : 'grab' }}
      onClick={onClick}
      onPointerDown={onPointerDown}
    >
      <motion.circle
        cx={node.x}
        cy={node.y}
        r={nodeRadius}
        fill={palette.fill}
        stroke={palette.stroke}
        strokeWidth="2"
        layoutId={`${layoutIdPrefix}node-${node.id}`}
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
        {node.label}
      </text>
    </g>
  );
};

export default GraphNode;
