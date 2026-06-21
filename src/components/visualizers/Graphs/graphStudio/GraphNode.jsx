import { motion } from 'framer-motion';
import { NODE_RADIUS, NODE_STATUS_COLORS } from './constants';
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
  const palette = getNodePalette(node);
  return (
    <g
      style={{ cursor: mode === 'draw' ? 'crosshair' : 'grab' }}
      onClick={onClick}
      onPointerDown={onPointerDown}
    >
      <motion.circle
        cx={node.x}
        cy={node.y}
        r={selected ? nodeRadius + 2 : nodeRadius}
        fill={palette.fill}
        stroke={
          drawAnchor
            ? '#000000'
            : selected || multiSelected
              ? '#000000'
              : palette.stroke
        }
        strokeWidth={selected ? 4 : multiSelected ? 3 : 2}
        layoutId={`${layoutIdPrefix}node-${node.id}`}
        animate={{ cx: node.x, cy: node.y }}
        transition={
          shouldAnimate
            ? { duration: 0.32, ease: 'easeInOut' }
            : { duration: 0 }
        }
        style={{
          filter:
            selected || multiSelected
              ? 'drop-shadow(0 8px 32px rgba(27, 27, 27, 0.04))'
              : 'none',
        }}
      />
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
