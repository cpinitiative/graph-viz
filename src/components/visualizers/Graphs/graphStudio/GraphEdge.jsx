import { motion } from 'framer-motion';

const getEdgeLabelRect = (label, fontSize) => {
  const text = String(label ?? '');
  return {
    width: Math.max(22, text.length * fontSize * 0.58 + fontSize * 0.9),
    height: fontSize + 8,
  };
};

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
  labelFontSize = 12,
  onPointerDown,
  onClick,
  strokeWidth,
}) => {
  const isHighlighted = selected || multiSelected;
  const labelRect = edge.label
    ? getEdgeLabelRect(edge.label, labelFontSize)
    : null;

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
        strokeWidth={strokeWidth}
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
          filter: isHighlighted
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
          <rect
            data-edge-label-background="true"
            x={labelPosition.x - labelRect.width / 2}
            y={labelPosition.y - labelRect.height / 2}
            width={labelRect.width}
            height={labelRect.height}
            fill="#FFFFFF"
            stroke="#E2E8F0"
            strokeWidth="1"
            className="fill-white stroke-slate-200 transition-colors duration-200 dark:fill-[#111827] dark:stroke-slate-600"
          />
          <text
            data-edge-label-text="true"
            x={labelPosition.x}
            y={labelPosition.y + labelFontSize * 0.35}
            textAnchor="middle"
            fill="#262626"
            fontSize={labelFontSize}
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
