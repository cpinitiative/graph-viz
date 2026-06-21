import {
  EDGE_ROUTING,
  NODE_RADIUS,
  VIEWBOX_HEIGHT,
  VIEWBOX_WIDTH,
} from './constants';

const MIN_ZOOM_FLOOR = 0.1;
const MAX_ZOOM = 2.6;
const EPSILON = 0.001;
export const EDGE_LABEL_FONT_SIZE = 12;
const EDGE_LABEL_HORIZONTAL_PADDING = 6;
const EDGE_LABEL_HEIGHT = 18;
const EDGE_LABEL_CHARACTER_WIDTH = 7.4;

export const computeMinZoom = (viewportW, viewportH) => {
  if (!viewportW || !viewportH) return MIN_ZOOM_FLOOR;
  return Math.max(
    MIN_ZOOM_FLOOR,
    Math.min(viewportW / VIEWBOX_WIDTH, viewportH / VIEWBOX_HEIGHT)
  );
};

export const clampZoom = (zoom, viewportW = 0, viewportH = 0) => {
  const minZoom = computeMinZoom(viewportW, viewportH);
  return Math.max(minZoom, Math.min(MAX_ZOOM, zoom));
};

export const toWorld = ({ x, y }, viewState) => ({
  x: (x - viewState.x) / viewState.zoom,
  y: (y - viewState.y) / viewState.zoom,
});

export const clampViewStateToPlayspace = (
  candidate,
  viewportWidth,
  viewportHeight
) => {
  if (!viewportWidth || !viewportHeight) return candidate;
  // Enforce dynamic minimum zoom so grid always fills the viewport
  const minZoom = computeMinZoom(viewportWidth, viewportHeight);
  const zoom = Math.max(minZoom, Math.min(MAX_ZOOM, candidate.zoom));
  const worldWidthPx = VIEWBOX_WIDTH * zoom;
  const worldHeightPx = VIEWBOX_HEIGHT * zoom;
  let nextX = candidate.x;
  let nextY = candidate.y;
  // If zoom level changed (clamped to min), re-center so grid fills view
  if (zoom !== candidate.zoom) {
    nextX = (viewportWidth - worldWidthPx) / 2;
    nextY = (viewportHeight - worldHeightPx) / 2;
  } else {
    if (worldWidthPx <= viewportWidth) {
      const minX = 0;
      const maxX = viewportWidth - worldWidthPx;
      nextX = Math.max(minX, Math.min(maxX, nextX));
    } else {
      const minX = viewportWidth - worldWidthPx;
      const maxX = 0;
      nextX = Math.max(minX, Math.min(maxX, nextX));
    }
    if (worldHeightPx <= viewportHeight) {
      const minY = 0;
      const maxY = viewportHeight - worldHeightPx;
      nextY = Math.max(minY, Math.min(maxY, nextY));
    } else {
      const minY = viewportHeight - worldHeightPx;
      const maxY = 0;
      nextY = Math.max(minY, Math.min(maxY, nextY));
    }
  }
  return { ...candidate, zoom, x: nextX, y: nextY };
};

export const insetSegment = (from, to, directed, nodeRadius = NODE_RADIUS) => {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.max(1, Math.sqrt(dx * dx + dy * dy));
  const ux = dx / length;
  const uy = dy / length;
  const startInset = nodeRadius * 0.94;
  const endInset = directed ? nodeRadius : nodeRadius * 0.94;
  return {
    x1: from.x + ux * startInset,
    y1: from.y + uy * startInset,
    x2: to.x - ux * endInset,
    y2: to.y - uy * endInset,
    nx: -uy,
    ny: ux,
  };
};

export const getAvoidanceShift = (
  segment,
  edge,
  nodes,
  baseShift,
  nodeRadius = NODE_RADIUS
) => {
  const midX = (segment.x1 + segment.x2) / 2;
  const midY = (segment.y1 + segment.y2) / 2;
  let shift = baseShift;
  nodes.forEach(node => {
    const sameEndpoint =
      String(node.id) === String(edge.from) ||
      String(node.id) === String(edge.to);
    if (sameEndpoint) return;
    const dx = node.x - midX;
    const dy = node.y - midY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance < nodeRadius * 2.2) {
      const bump = (nodeRadius * 2.2 - distance) * 0.7;
      shift += bump;
    }
  });
  return shift;
};

export const cubicBezierPoint = (p0, p1, p2, p3, t) => {
  const invT = 1 - t;
  const invT2 = invT * invT;
  const invT3 = invT2 * invT;
  const t2 = t * t;
  const t3 = t2 * t;
  return {
    x: invT3 * p0.x + 3 * invT2 * t * p1.x + 3 * invT * t2 * p2.x + t3 * p3.x,
    y: invT3 * p0.y + 3 * invT2 * t * p1.y + 3 * invT * t2 * p2.y + t3 * p3.y,
  };
};

export const cubicBezierTangent = (p0, p1, p2, p3, t) => {
  const invT = 1 - t;
  return {
    x:
      3 * invT * invT * (p1.x - p0.x) +
      6 * invT * t * (p2.x - p1.x) +
      3 * t * t * (p3.x - p2.x),
    y:
      3 * invT * invT * (p1.y - p0.y) +
      6 * invT * t * (p2.y - p1.y) +
      3 * t * t * (p3.y - p2.y),
  };
};

export const offsetFromTangent = (point, tangent, distance, side = 1) => {
  const length = Math.max(
    1e-6,
    Math.sqrt(tangent.x * tangent.x + tangent.y * tangent.y)
  );
  const nx = (-tangent.y / length) * side;
  const ny = (tangent.x / length) * side;
  return { x: point.x + nx * distance, y: point.y + ny * distance };
};

export const pointToSegmentDistance = (pointX, pointY, x1, y1, x2, y2) => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq <= 1e-6) {
    const px = pointX - x1;
    const py = pointY - y1;
    return Math.sqrt(px * px + py * py);
  }
  const t = Math.max(
    0,
    Math.min(1, ((pointX - x1) * dx + (pointY - y1) * dy) / lengthSq)
  );
  const projX = x1 + t * dx;
  const projY = y1 + t * dy;
  const diffX = pointX - projX;
  const diffY = pointY - projY;
  return Math.sqrt(diffX * diffX + diffY * diffY);
};

export const measureLabelRect = (point, labelText) => {
  const text = String(labelText ?? '');
  const width = Math.max(
    24,
    text.length * EDGE_LABEL_CHARACTER_WIDTH + EDGE_LABEL_HORIZONTAL_PADDING * 2
  );
  const height = EDGE_LABEL_HEIGHT;
  return {
    left: point.x - width / 2,
    right: point.x + width / 2,
    top: point.y - height / 2,
    bottom: point.y + height / 2,
    width,
    height,
  };
};

export const rectOverlapArea = (rectA, rectB) => {
  const overlapX = Math.max(
    0,
    Math.min(rectA.right, rectB.right) - Math.max(rectA.left, rectB.left)
  );
  const overlapY = Math.max(
    0,
    Math.min(rectA.bottom, rectB.bottom) - Math.max(rectA.top, rectB.top)
  );
  return overlapX * overlapY;
};

export const scoreLabelCandidate = ({
  candidate,
  edge,
  labelText,
  labelIndex,
  nodes,
  segmentsById,
  placedLabelRects,
  nodeRadius,
}) => {
  let score = 0;
  if (labelIndex === 0) score += 5;
  const margin = 12;
  if (candidate.x < margin) score -= (margin - candidate.x) * 8;
  if (candidate.x > VIEWBOX_WIDTH - margin)
    score -= (candidate.x - (VIEWBOX_WIDTH - margin)) * 8;
  if (candidate.y < margin) score -= (margin - candidate.y) * 8;
  if (candidate.y > VIEWBOX_HEIGHT - margin)
    score -= (candidate.y - (VIEWBOX_HEIGHT - margin)) * 8;
  const rect = measureLabelRect(candidate, labelText);
  placedLabelRects.forEach(placedRect => {
    const overlap = rectOverlapArea(rect, placedRect);
    if (overlap > 0) score -= 900 + overlap * 2.2;
  });
  nodes.forEach(node => {
    const isEndpoint =
      String(node.id) === String(edge.from) ||
      String(node.id) === String(edge.to);
    if (isEndpoint) return;
    const dx = candidate.x - node.x;
    const dy = candidate.y - node.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance < nodeRadius * 1.6)
      score -= (nodeRadius * 1.6 - distance) * 18;
  });
  segmentsById.forEach((segment, segmentEdgeId) => {
    if (String(segmentEdgeId) === String(edge.id)) return;
    const distance = pointToSegmentDistance(
      candidate.x,
      candidate.y,
      segment.x1,
      segment.y1,
      segment.x2,
      segment.y2
    );
    if (distance < 14) score -= (14 - distance) * 14;
    else score += Math.min(distance, 40) * 0.18;
  });
  return score;
};

export const chooseBestLabelPosition = ({
  edge,
  labelText,
  labelOptions,
  nodes,
  segmentsById,
  placedLabelRects,
  nodeRadius,
}) => {
  if (!Array.isArray(labelOptions) || !labelOptions.length) return null;
  let best = labelOptions[0];
  let bestScore = Number.NEGATIVE_INFINITY;
  labelOptions.forEach((candidate, index) => {
    const score = scoreLabelCandidate({
      candidate,
      edge,
      labelText,
      labelIndex: index,
      nodes,
      segmentsById,
      placedLabelRects,
      nodeRadius,
    });
    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  });
  return best;
};

export const buildEdgePath = ({
  edge,
  from,
  to,
  routing,
  nodes,
  edgeCurvature,
  nodeRadius,
  edgeIndex = 0,
  edgeCount = 1,
}) => {
  if (String(from.id) === String(to.id)) {
    const loopRadius = nodeRadius * 1.5 + edgeIndex * 15;
    const startX = from.x - nodeRadius * 0.5;
    const startY = from.y - nodeRadius * 0.866;
    const endX = from.x + nodeRadius * 0.5;
    const endY = from.y - nodeRadius * 0.866;
    const d = `M ${startX} ${startY} C ${from.x - loopRadius * 1.5} ${from.y - loopRadius * 2.5}, ${from.x + loopRadius * 1.5} ${from.y - loopRadius * 2.5}, ${endX} ${endY}`;
    return { d, labelOptions: [{ x: from.x, y: from.y - loopRadius * 2.2 }] };
  }
  const segment = insetSegment(from, to, edge.directed, nodeRadius);
  let multiShift = 0;
  if (edgeCount > 1) {
    const centerIndex = (edgeCount - 1) / 2;
    const offset = edgeIndex - centerIndex;
    const directionMultiplier = String(from.id) < String(to.id) ? 1 : -1;
    multiShift = offset * 25 * directionMultiplier;
  }
  if (routing === EDGE_ROUTING.bezier || edgeCount > 1) {
    const seed = String(edge.id)
      .split('')
      .reduce((sum, part) => sum + part.charCodeAt(0), 0);
    const side = seed % 2 === 0 ? 1 : -1;
    const baseShift = Math.max(18, edgeCurvature) * side;
    const shift =
      getAvoidanceShift(segment, edge, nodes, baseShift, nodeRadius) +
      multiShift;
    const c1x =
      segment.x1 + (segment.x2 - segment.x1) * 0.25 + segment.nx * shift;
    const c1y =
      segment.y1 + (segment.y2 - segment.y1) * 0.25 + segment.ny * shift;
    const c2x =
      segment.x1 + (segment.x2 - segment.x1) * 0.75 + segment.nx * shift;
    const c2y =
      segment.y1 + (segment.y2 - segment.y1) * 0.75 + segment.ny * shift;
    const midpoint = cubicBezierPoint(
      { x: segment.x1, y: segment.y1 },
      { x: c1x, y: c1y },
      { x: c2x, y: c2y },
      { x: segment.x2, y: segment.y2 },
      0.5
    );
    const tangent = cubicBezierTangent(
      { x: segment.x1, y: segment.y1 },
      { x: c1x, y: c1y },
      { x: c2x, y: c2y },
      { x: segment.x2, y: segment.y2 },
      0.5
    );
    const preferredSide = shift >= 0 ? 1 : -1;
    const labelPrimary = offsetFromTangent(
      midpoint,
      tangent,
      14,
      preferredSide
    );
    const labelSecondary = offsetFromTangent(
      midpoint,
      tangent,
      14,
      -preferredSide
    );
    return {
      d: `M ${segment.x1} ${segment.y1} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${segment.x2} ${segment.y2}`,
      labelOptions: [labelPrimary, labelSecondary],
    };
  }
  const seed = String(edge.id)
    .split('')
    .reduce((sum, part) => sum + part.charCodeAt(0), 0);
  const side = seed % 2 === 0 ? 1 : -1;
  const straightMidpoint = {
    x: (segment.x1 + segment.x2) / 2,
    y: (segment.y1 + segment.y2) / 2,
  };
  return {
    d: `M ${segment.x1} ${segment.y1} L ${segment.x2} ${segment.y2}`,
    labelOptions: [
      {
        x: straightMidpoint.x + segment.nx * 14 * side,
        y: straightMidpoint.y + segment.ny * 14 * side,
      },
      {
        x: straightMidpoint.x - segment.nx * 14 * side,
        y: straightMidpoint.y - segment.ny * 14 * side,
      },
    ],
  };
};

export const getRectSelection = (rect, nodes) => {
  if (!rect) return [];
  const minX = Math.min(rect.startX, rect.endX);
  const maxX = Math.max(rect.startX, rect.endX);
  const minY = Math.min(rect.startY, rect.endY);
  const maxY = Math.max(rect.startY, rect.endY);
  return nodes
    .filter(
      node =>
        node.x >= minX && node.x <= maxX && node.y >= minY && node.y <= maxY
    )
    .map(node => String(node.id));
};

export { EPSILON };
