import { motion } from 'framer-motion';
import { useMemo } from 'react';
import { useTheme } from '../../../../context/useTheme';

const EDGE_LABEL_TONES = {
  light: {
    text: '#0F172A',
  },
  dark: {
    text: '#F8FAFC',
  },
};

const getEdgeLabelTone = theme =>
  EDGE_LABEL_TONES[theme] ?? EDGE_LABEL_TONES.light;

const clampNumber = (value, min, max) => Math.max(min, Math.min(max, value));

const formatNumber = value => Number(value.toFixed(3));

const formatPathPoint = point =>
  `${formatNumber(point.x)} ${formatNumber(point.y)}`;

const ARROW_BODY_OVERLAP = 0.85;

const getArrowMetrics = strokeWidth => {
  const width = Math.max(1, Number(strokeWidth) || 2.2);
  return {
    length: clampNumber(width * 4.2 + 8, 15, 58),
    baseWidth: clampNumber(width * 2.8 + 8, 14, 42),
  };
};

const normalizeVector = vector => {
  const length = Math.hypot(vector.x, vector.y);
  if (!Number.isFinite(length) || length <= 1e-6) return { x: 1, y: 0 };
  return { x: vector.x / length, y: vector.y / length };
};

const getArrowPolygon = ({ tip, baseCenter, baseWidth }) => {
  const direction = normalizeVector({
    x: tip.x - baseCenter.x,
    y: tip.y - baseCenter.y,
  });
  const normal = { x: -direction.y, y: direction.x };
  const halfBase = baseWidth / 2;
  const baseLeft = {
    x: baseCenter.x + normal.x * halfBase,
    y: baseCenter.y + normal.y * halfBase,
  };
  const baseRight = {
    x: baseCenter.x - normal.x * halfBase,
    y: baseCenter.y - normal.y * halfBase,
  };

  return {
    points: [tip, baseLeft, baseRight]
      .map(point => `${formatNumber(point.x)},${formatNumber(point.y)}`)
      .join(' '),
    tip,
    baseCenter,
  };
};

const getArrowBodyEnd = ({ tip, baseCenter, arrowLength }) => {
  const direction = normalizeVector({
    x: tip.x - baseCenter.x,
    y: tip.y - baseCenter.y,
  });
  const overlap = Math.min(ARROW_BODY_OVERLAP, Math.max(0, arrowLength * 0.35));
  return {
    x: baseCenter.x + direction.x * overlap,
    y: baseCenter.y + direction.y * overlap,
  };
};

const getLineArrowGeometry = ({ pathPoints, pathD, strokeWidth }) => {
  const [start, tip] = pathPoints;
  const lineLength = Math.hypot(tip.x - start.x, tip.y - start.y);
  if (!Number.isFinite(lineLength) || lineLength <= 1e-6) {
    return { bodyPathD: pathD, arrow: null };
  }

  const metrics = getArrowMetrics(strokeWidth);
  const arrowLength = Math.min(metrics.length, lineLength * 0.58);
  const direction = normalizeVector({ x: tip.x - start.x, y: tip.y - start.y });
  const baseCenter = {
    x: tip.x - direction.x * arrowLength,
    y: tip.y - direction.y * arrowLength,
  };
  const bodyEnd = getArrowBodyEnd({ tip, baseCenter, arrowLength });

  return {
    bodyPathD: `M ${formatPathPoint(start)} L ${formatPathPoint(bodyEnd)}`,
    arrow: {
      ...getArrowPolygon({
        tip,
        baseCenter,
        baseWidth: Math.min(metrics.baseWidth, lineLength * 0.75),
      }),
      length: arrowLength,
      baseWidth: metrics.baseWidth,
    },
  };
};

const lerpPoint = (from, to, t) => ({
  x: from.x + (to.x - from.x) * t,
  y: from.y + (to.y - from.y) * t,
});

const cubicPoint = ([p0, p1, p2, p3], t) => {
  const p01 = lerpPoint(p0, p1, t);
  const p12 = lerpPoint(p1, p2, t);
  const p23 = lerpPoint(p2, p3, t);
  const p012 = lerpPoint(p01, p12, t);
  const p123 = lerpPoint(p12, p23, t);
  return lerpPoint(p012, p123, t);
};

const splitCubicAt = ([p0, p1, p2, p3], t) => {
  const p01 = lerpPoint(p0, p1, t);
  const p12 = lerpPoint(p1, p2, t);
  const p23 = lerpPoint(p2, p3, t);
  const p012 = lerpPoint(p01, p12, t);
  const p123 = lerpPoint(p12, p23, t);
  const p0123 = lerpPoint(p012, p123, t);
  return [p0, p01, p012, p0123];
};

const getCubicSamples = pathPoints => {
  const samples = [{ t: 0, point: pathPoints[0], length: 0 }];
  let previous = pathPoints[0];
  let length = 0;
  for (let index = 1; index <= 32; index += 1) {
    const t = index / 32;
    const point = cubicPoint(pathPoints, t);
    length += Math.hypot(point.x - previous.x, point.y - previous.y);
    samples.push({ t, point, length });
    previous = point;
  }
  return samples;
};

const getCubicTrimT = (samples, trimLength) => {
  const totalLength = samples[samples.length - 1]?.length ?? 0;
  const targetLength = Math.max(0, totalLength - trimLength);
  for (let index = 1; index < samples.length; index += 1) {
    const current = samples[index];
    const previous = samples[index - 1];
    if (current.length >= targetLength) {
      const segmentLength = Math.max(1e-6, current.length - previous.length);
      const ratio = (targetLength - previous.length) / segmentLength;
      return previous.t + (current.t - previous.t) * ratio;
    }
  }
  return 0.92;
};

const getCubicArrowGeometry = ({ pathPoints, pathD, strokeWidth }) => {
  if (pathPoints.length !== 4) return { bodyPathD: pathD, arrow: null };
  const samples = getCubicSamples(pathPoints);
  const totalLength = samples[samples.length - 1]?.length ?? 0;
  if (!Number.isFinite(totalLength) || totalLength <= 1e-6) {
    return { bodyPathD: pathD, arrow: null };
  }

  const metrics = getArrowMetrics(strokeWidth);
  const arrowLength = Math.min(metrics.length, totalLength * 0.42);
  const trimT = getCubicTrimT(samples, arrowLength);
  const trimmed = splitCubicAt(pathPoints, trimT);
  const baseCenter = trimmed[3];
  const tip = pathPoints[3];
  const bodyEnd = getArrowBodyEnd({ tip, baseCenter, arrowLength });

  return {
    bodyPathD: `M ${formatPathPoint(trimmed[0])} C ${formatPathPoint(trimmed[1])}, ${formatPathPoint(trimmed[2])}, ${formatPathPoint(trimmed[3])} L ${formatPathPoint(bodyEnd)}`,
    arrow: {
      ...getArrowPolygon({
        tip,
        baseCenter,
        baseWidth: Math.min(metrics.baseWidth, totalLength * 0.45),
      }),
      length: arrowLength,
      baseWidth: metrics.baseWidth,
    },
  };
};

const getDirectedEdgeGeometry = ({
  edge,
  pathD,
  pathType,
  pathPoints,
  strokeWidth,
}) => {
  if (!edge.directed || !Array.isArray(pathPoints)) {
    return { bodyPathD: pathD, arrow: null };
  }
  if (pathType === 'line' && pathPoints.length >= 2) {
    return getLineArrowGeometry({ pathPoints, pathD, strokeWidth });
  }
  if (pathType === 'cubic' && pathPoints.length === 4) {
    return getCubicArrowGeometry({ pathPoints, pathD, strokeWidth });
  }
  return { bodyPathD: pathD, arrow: null };
};

const GraphEdge = ({
  edge,
  pathD,
  pathType,
  pathPoints,
  strokeColor,
  selected,
  multiSelected,
  shouldAnimate,
  layoutIdPrefix = '',
  labelPosition,
  labelFontSize = 12,
  onPointerDown,
  onClick,
  strokeWidth,
}) => {
  const { theme } = useTheme();
  const isHighlighted = selected || multiSelected;
  const labelTone = getEdgeLabelTone(theme);
  const labelText = String(edge.label ?? '');
  const labelY = labelPosition ? labelPosition.y + labelFontSize * 0.35 : 0;
  const labelTextProps = labelPosition
    ? {
        x: labelPosition.x,
        y: labelY,
        textAnchor: 'middle',
        fontSize: labelFontSize,
        fontWeight: '650',
        fontFamily: 'Arial, sans-serif',
      }
    : null;
  const { bodyPathD, arrow } = useMemo(
    () =>
      getDirectedEdgeGeometry({
        edge,
        pathD,
        pathType,
        pathPoints,
        strokeWidth,
      }),
    [edge, pathD, pathPoints, pathType, strokeWidth]
  );

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
        d={bodyPathD}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeLinecap={edge.directed ? 'butt' : 'round'}
        layoutId={`${layoutIdPrefix}edge-${edge.id}`}
        initial={false}
        animate={{ d: bodyPathD }}
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
      {arrow && (
        <motion.polygon
          data-edge-arrowhead-id={edge.id}
          data-edge-arrow-tip-x={formatNumber(arrow.tip.x)}
          data-edge-arrow-tip-y={formatNumber(arrow.tip.y)}
          data-edge-arrow-base-x={formatNumber(arrow.baseCenter.x)}
          data-edge-arrow-base-y={formatNumber(arrow.baseCenter.y)}
          data-edge-arrow-length={formatNumber(arrow.length)}
          data-edge-arrow-base-width={formatNumber(arrow.baseWidth)}
          data-edge-color={strokeColor}
          points={arrow.points}
          fill={strokeColor}
          stroke={strokeColor}
          strokeWidth="0"
          strokeLinejoin="miter"
          pointerEvents="none"
          initial={false}
          animate={{ points: arrow.points }}
          transition={
            shouldAnimate
              ? { duration: 0.16, ease: 'easeOut' }
              : { duration: 0 }
          }
        />
      )}
      {labelText && labelPosition && labelTextProps && (
        <g
          pointerEvents="none"
          data-edge-label-id={edge.id}
          data-edge-label-theme={theme}
          aria-hidden="true"
          style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
        >
          <text
            data-edge-label-text="true"
            {...labelTextProps}
            fill={labelTone.text}
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
