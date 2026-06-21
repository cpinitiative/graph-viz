import { motion } from 'framer-motion';
import { EDGE_LABEL_FONT_SIZE, measureLabelRect } from './graphCanvasUtils';

const GraphEdge = ({
  edge,
  pathD,
  selected,
  multiSelected,
  shouldAnimate,
  markerId,
  labelPosition,
  onPointerDown,
  onClick,
  strokeWidth,
}) => {
  const labelRect =
    edge.label && labelPosition
      ? measureLabelRect(labelPosition, edge.label)
      : null;

  // Determine line color dynamically based on selection state.
  // Uses transparent fallback or edge color if not selected.
  const getLineStroke = () => {
    if (selected || multiSelected) {
      return 'currentColor'; // Defers to the text- color classes set below
    }
    return edge.color ?? '#77777766';
  };

  return (
    <g style={{ cursor: 'pointer' }}>
      <path
        d={pathD}
        fill="none"
        stroke="rgba(0,0,0,0)"
        strokeWidth={Math.max(16, strokeWidth + 12)}
        strokeLinecap="round"
        onPointerDown={onPointerDown}
        onClick={onClick}
      />
      <motion.path
        d={pathD}
        fill="none"
        stroke={getLineStroke()}
        strokeWidth={
          selected
            ? strokeWidth + 1.5
            : multiSelected
              ? strokeWidth + 0.5
              : strokeWidth
        }
        strokeLinecap="round"
        markerEnd={edge.directed ? `url(#${markerId})` : undefined}
        layoutId={`edge-${edge.id}`}
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
        // Uses Tailwind classes to handle line color transitions for selected states
        className={`transition-colors duration-200 ${
          selected || multiSelected
            ? 'text-neutral-900 dark:text-neutral-100'
            : ''
        }`}
        style={{
          filter:
            selected || multiSelected
              ? 'drop-shadow(0 8px 32px rgba(27, 27, 27, 0.04))'
              : 'none',
        }}
      />
      {edge.label && labelPosition && labelRect && (
        <g pointerEvents="none" data-edge-label-id={edge.id} aria-hidden="true">
          <rect
            data-edge-label-background="true"
            x={labelRect.left}
            y={labelRect.top}
            width={labelRect.width}
            height={labelRect.height}
            rx="3"
            fill="#FFFFFF"
            stroke="#D4D4D4"
            strokeWidth="0.75"
            className="fill-white stroke-neutral-300 transition-colors duration-200 dark:fill-neutral-900 dark:stroke-neutral-600"
          />
          <text
            data-edge-label-text="true"
            x={labelPosition.x}
            y={labelPosition.y + 4}
            textAnchor="middle"
            fill="#262626"
            fontSize={EDGE_LABEL_FONT_SIZE}
            fontWeight="700"
            fontFamily="Arial, sans-serif"
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
