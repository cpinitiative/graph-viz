import { motion } from 'framer-motion';
import { useTheme } from '../../../../context/useTheme';
import { NODE_RADIUS, NODE_STATUS_COLORS } from './constants';

const EDITOR_RING_COLORS = {
  light: {
    selected: '#2563EB',
    multiSelected: '#64748B',
    drawAnchor: '#D97706',
  },
  dark: {
    selected: '#38BDF8',
    multiSelected: '#93C5FD',
    drawAnchor: '#FBBF24',
  },
};

const getNodePalette = node => {
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
}) => {
  const { theme } = useTheme();
  const palette = getNodePalette(node);
  const ringColors = EDITOR_RING_COLORS[theme] ?? EDITOR_RING_COLORS.light;
  const selectionRingColor = selected
    ? ringColors.selected
    : ringColors.multiSelected;

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
          r={nodeRadius + 4}
          fill="none"
          stroke={selectionRingColor}
          strokeWidth={selected ? 2.25 : 1.75}
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
          r={nodeRadius + 6}
          fill="none"
          stroke={ringColors.drawAnchor}
          strokeWidth="2"
          strokeDasharray="3 4"
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
        x={node.x}
        y={node.y + 4}
        textAnchor="middle"
        fill={palette.text}
        style={{
          fontSize: '12px',
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
