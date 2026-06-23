import { motion } from 'framer-motion';

const EDGE_LABEL_FONT_SIZE = 12;

const GraphEdge = ({
  edge,
  pathD,
  strokeColor,
  selected,
  multiSelected,
  shouldAnimate,
  layoutIdPrefix = '',
  markerId,
  labelPosition,
  onPointerDown,
  onClick,
  strokeWidth,
}) => {
  return (
    <g data-edge-id={edge.id} style={{ cursor: 'pointer' }}>
      <path
        data-edge-hit-target-id={edge.id}
        d={pathD}
        fill="none"
        stroke="rgba(0,0,0,0)"
        strokeWidth={Math.max(16, strokeWidth + 12)}
        strokeLinecap="round"
        onPointerDown={onPointerDown}
        onClick={onClick}
      />
      <motion.path
        data-edge-path-id={edge.id}
        d={pathD}
        fill="none"
        stroke={strokeColor}
        strokeWidth={
          selected
            ? strokeWidth + 1.5
            : multiSelected
              ? strokeWidth + 0.5
              : strokeWidth
        }
        strokeLinecap="round"
        markerEnd={edge.directed ? `url(#${markerId})` : undefined}
        layoutId={`${layoutIdPrefix}edge-${edge.id}`}
        initial={false}
        animate={{ d: pathD }}
        transition={
          shouldAnimate
            ? {
                duration: Math.max((edge.duration ?? 450) / 1000, 0.1),
                ease: 'easeInOut',
              }
            : { duration: 0 }
        }
        pointerEvents="none"
        className="transition-colors duration-200"
        style={{
          filter:
            selected || multiSelected
              ? 'drop-shadow(0 8px 32px rgba(27, 27, 27, 0.04))'
              : 'none',
        }}
      />
      {edge.label && labelPosition && (
        <g
          pointerEvents="none"
          data-edge-label-id={edge.id}
          aria-hidden="true"
          style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
        >
          <text
            data-edge-label-text="true"
            x={labelPosition.x}
            y={labelPosition.y + 4}
            textAnchor="middle"
            fill="#262626"
            fontSize={EDGE_LABEL_FONT_SIZE}
            fontWeight="700"
            fontFamily="Arial, sans-serif"
            style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
            // Handles light mode (neutral-800) and dark mode (neutral-200)
            className="fill-neutral-800 font-bold transition-colors duration-200 dark:fill-neutral-200"
          >
            {edge.label}
          </text>
        </g>
      )}
    </g>
  );
};

export default GraphEdge;
