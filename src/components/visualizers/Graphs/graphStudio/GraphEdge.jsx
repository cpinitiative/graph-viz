import { motion } from 'framer-motion';
import { useTheme } from '../../../../context/useTheme';

const EDGE_LABEL_FONT_SIZE = 12;
const EDGE_LABEL_HALO_WIDTH_RATIO = 0.22;
const EDGE_LABEL_COLORS = {
  light: {
    fill: '#0F172A',
    halo: '#FFFFFF',
  },
  dark: {
    fill: '#F8FAFC',
    halo: '#121212',
  },
};

const getLabelHaloWidth = fontSize =>
  Math.max(2.2, Math.min(3.2, fontSize * EDGE_LABEL_HALO_WIDTH_RATIO));

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
  labelFontSize = EDGE_LABEL_FONT_SIZE,
}) => {
  const { theme } = useTheme();
  const labelColors = EDGE_LABEL_COLORS[theme] ?? EDGE_LABEL_COLORS.light;
  const labelText = String(edge.label ?? '');
  const labelY = labelPosition ? labelPosition.y + 4 : 0;
  const labelTextProps = labelPosition
    ? {
        x: labelPosition.x,
        y: labelY,
        textAnchor: 'middle',
        fontSize: labelFontSize,
        fontWeight: '700',
        fontFamily: 'Arial, sans-serif',
      }
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
      {labelText && labelPosition && labelTextProps && (
        <g
          pointerEvents="none"
          data-edge-label-id={edge.id}
          aria-hidden="true"
          style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
        >
          <text
            data-edge-label-halo="true"
            {...labelTextProps}
            fill="none"
            stroke={labelColors.halo}
            strokeWidth={getLabelHaloWidth(labelFontSize)}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
          >
            {labelText}
          </text>
          <text
            data-edge-label-text="true"
            {...labelTextProps}
            fill={labelColors.fill}
            stroke="none"
            style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
          >
            {labelText}
          </text>
        </g>
      )}
    </g>
  );
};

export default GraphEdge;
