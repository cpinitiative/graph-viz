import { motion } from 'framer-motion';
import { useTheme } from '../../../../context/useTheme';

const getEdgeLabelTone = theme =>
  theme === 'dark'
    ? {
        text: '#F8FAFC',
        wideHalo: '#0F172A',
        fineHalo: '#111827',
      }
    : {
        text: '#1E293B',
        wideHalo: '#FFFFFF',
        fineHalo: '#F8FAFC',
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
  const { theme } = useTheme();
  const isHighlighted = selected || multiSelected;
  const labelTone = getEdgeLabelTone(theme);
  const labelY = labelPosition ? labelPosition.y + labelFontSize * 0.35 : 0;
  const wideHaloWidth = Math.max(2.8, labelFontSize * 0.28);
  const fineHaloWidth = Math.max(1.2, labelFontSize * 0.12);

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
          data-edge-label-theme={theme}
          aria-hidden="true"
          style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
        >
          <text
            data-edge-label-halo="wide"
            x={labelPosition.x}
            y={labelY}
            textAnchor="middle"
            fill="none"
            stroke={labelTone.wideHalo}
            strokeWidth={wideHaloWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            fontSize={labelFontSize}
            fontWeight="650"
            fontFamily="Arial, sans-serif"
            opacity="0.92"
            paintOrder="stroke"
            style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
          >
            {edge.label}
          </text>
          <text
            data-edge-label-halo="fine"
            x={labelPosition.x}
            y={labelY}
            textAnchor="middle"
            fill="none"
            stroke={labelTone.fineHalo}
            strokeWidth={fineHaloWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            fontSize={labelFontSize}
            fontWeight="650"
            fontFamily="Arial, sans-serif"
            opacity="0.78"
            paintOrder="stroke"
            style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
          >
            {edge.label}
          </text>
          <text
            data-edge-label-text="true"
            x={labelPosition.x}
            y={labelY}
            textAnchor="middle"
            fill={labelTone.text}
            fontSize={labelFontSize}
            fontWeight="650"
            fontFamily="Arial, sans-serif"
            style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
          >
            {edge.label}
          </text>
        </g>
      )}
    </g>
  );
};

export default GraphEdge;
