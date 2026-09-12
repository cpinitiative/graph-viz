import {
  buildEdgePath,
  chooseBestLabelPosition,
  cubicBezierPoint,
  cubicBezierTangent,
  insetSegment,
  measureLabelRect,
  offsetFromTangent,
  rectOverlapArea,
  scoreLabelCandidate,
} from '../graphCanvasUtils.js';
import {
  getVisibleNodes,
  isEdgeEffectivelyVisible,
} from './effectiveVisibility.js';
import {
  estimateNodeTextWidth,
  getNodeBoundaryPoint,
  getNodeDisplayText,
  getNodeShape,
  getNodeShapeBounds,
} from './nodeGeometry.js';

const getClippedLabelOptions = (geometry, points, pairMetadata = {}) => {
  const curved = geometry.pathType === 'cubic';
  const { edgeIndex = 0, edgeCount = 1 } = pairMetadata;
  const preferredT =
    curved && edgeCount > 1 ? 0.32 + (edgeIndex / (edgeCount - 1)) * 0.36 : 0.5;
  const tValues = curved
    ? [...new Set([preferredT, 0.5, 0.38, 0.62, 0.28, 0.72])]
    : [0.5];
  const pointAt = (path, t) =>
    curved
      ? cubicBezierPoint(...path, t)
      : {
          x: path[0].x + (path[1].x - path[0].x) * t,
          y: path[0].y + (path[1].y - path[0].y) * t,
        };
  const tangentAt = (path, t) =>
    curved
      ? cubicBezierTangent(...path, t)
      : { x: path[1].x - path[0].x, y: path[1].y - path[0].y };
  const originalPoint = pointAt(geometry.pathPoints, preferredT);
  const originalTangent = tangentAt(geometry.pathPoints, preferredT);
  const firstLabel = geometry.labelOptions?.[0] ?? originalPoint;
  const preferredSide =
    Math.sign(
      -(firstLabel.x - originalPoint.x) * originalTangent.y +
        (firstLabel.y - originalPoint.y) * originalTangent.x
    ) || 1;
  return tValues.flatMap(t => {
    const point = pointAt(points, t);
    const tangent = tangentAt(points, t);
    return [
      offsetFromTangent(point, tangent, 14, preferredSide),
      offsetFromTangent(point, tangent, 14, -preferredSide),
    ];
  });
};

// Additional occupied rectangles apply only to new geometry/separated text;
// the existing circle-only label layout remains unchanged.
const getAdditionalLabelObstacles = (nodes, nodeRadius, nodeLabelSize) =>
  nodes.flatMap(node => {
    const bounds = getNodeShapeBounds(node, nodeRadius, nodeLabelSize);
    const obstacles = [];
    if (getNodeShape(node) !== 'circle') {
      obstacles.push({
        left: bounds.x - 4,
        right: bounds.x + bounds.width + 4,
        top: bounds.y - 4,
        bottom: bounds.y + bounds.height + 4,
      });
    }
    const annotation = getNodeDisplayText(node).annotation;
    if (annotation) {
      const fontSize = Math.max(10, Math.min(14, nodeLabelSize || 14));
      const width = estimateNodeTextWidth(annotation, fontSize);
      const baseline = bounds.y + bounds.height + fontSize + 7;
      obstacles.push({
        left: node.x - width / 2 - 3,
        right: node.x + width / 2 + 3,
        top: baseline - fontSize - 3,
        bottom: baseline + 5,
      });
    }
    return obstacles;
  });

const chooseShapeAwareLabelPosition = (options, obstacles) => {
  if (!obstacles.length) return chooseBestLabelPosition(options);
  let best = null;
  let bestScore = Number.NEGATIVE_INFINITY;
  options.labelOptions.forEach((candidate, labelIndex) => {
    let score = scoreLabelCandidate({ ...options, candidate, labelIndex });
    const rect = measureLabelRect(
      candidate,
      options.labelText,
      options.labelFontSize
    );
    obstacles.forEach(obstacle => {
      const overlap = rectOverlapArea(rect, obstacle);
      if (overlap > 0) score -= 900 + overlap * 2.2;
    });
    if (score > bestScore) {
      best = candidate;
      bestScore = score;
    }
  });
  return best;
};

// Preserve legacy circle paths exactly. New shapes use the first/last curve
// tangent to choose an edge port on their actual outline, including self-loops.
export const clipEdgeGeometryToNodeShapes = (
  geometry,
  from,
  to,
  nodeRadius,
  nodeLabelSize,
  pairMetadata
) => {
  if (getNodeShape(from) === 'circle' && getNodeShape(to) === 'circle')
    return geometry;
  const points = geometry.pathPoints.map(point => ({ ...point }));
  if (getNodeShape(from) !== 'circle') {
    points[0] = getNodeBoundaryPoint(
      from,
      points[1],
      nodeRadius,
      nodeLabelSize
    );
  }
  if (getNodeShape(to) !== 'circle') {
    points[points.length - 1] = getNodeBoundaryPoint(
      to,
      points[points.length - 2],
      nodeRadius,
      nodeLabelSize
    );
  }
  const d =
    geometry.pathType === 'cubic'
      ? `M ${points[0].x} ${points[0].y} C ${points[1].x} ${points[1].y}, ${points[2].x} ${points[2].y}, ${points[3].x} ${points[3].y}`
      : `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  return {
    ...geometry,
    d,
    pathPoints: points,
    labelOptions: getClippedLabelOptions(geometry, points, pairMetadata),
  };
};

const compareStableStrings = (left, right) => {
  if (left === right) return 0;
  return left < right ? -1 : 1;
};

const getPairIdentity = edge => {
  const from = String(edge.from);
  const to = String(edge.to);
  if (from === to) {
    return {
      key: JSON.stringify(['loop', from]),
      firstId: from,
      secondId: to,
      selfLoop: true,
    };
  }
  const [firstId, secondId] =
    compareStableStrings(from, to) <= 0 ? [from, to] : [to, from];
  return {
    key: JSON.stringify(['pair', firstId, secondId]),
    firstId,
    secondId,
    selfLoop: false,
  };
};

const getDirectionRank = (edge, firstId) => {
  if (!edge.directed) return 1;
  return String(edge.from) === firstId ? 0 : 2;
};

const getDirectionKey = edge =>
  edge.directed
    ? JSON.stringify(['directed', String(edge.from), String(edge.to)])
    : 'undirected';

const buildEdgePairMetadata = edges => {
  const groups = new Map();

  edges.forEach((edge, sourceIndex) => {
    const pair = getPairIdentity(edge);
    if (!groups.has(pair.key)) {
      groups.set(pair.key, {
        ...pair,
        entries: [],
      });
    }
    groups.get(pair.key).entries.push({ edge, sourceIndex });
  });

  const metadataByEdgeId = new Map();
  groups.forEach(group => {
    const orderedEntries = [...group.entries].sort((left, right) => {
      if (!group.selfLoop) {
        const directionDifference =
          getDirectionRank(left.edge, group.firstId) -
          getDirectionRank(right.edge, group.firstId);
        if (directionDifference !== 0) return directionDifference;
      }
      const idDifference = compareStableStrings(
        String(left.edge.id),
        String(right.edge.id)
      );
      return idDifference || left.sourceIndex - right.sourceIndex;
    });
    const directedForwardCount = orderedEntries.filter(
      ({ edge }) => edge.directed && String(edge.from) === String(group.firstId)
    ).length;
    const directedReverseCount = orderedEntries.filter(
      ({ edge }) =>
        edge.directed && String(edge.from) === String(group.secondId)
    ).length;
    const hasOppositeDirections =
      !group.selfLoop && directedForwardCount > 0 && directedReverseCount > 0;
    const directionEntries = new Map();

    orderedEntries.forEach(entry => {
      const directionKey = getDirectionKey(entry.edge);
      if (!directionEntries.has(directionKey)) {
        directionEntries.set(directionKey, []);
      }
      directionEntries.get(directionKey).push(entry);
    });

    const directionMetadataByEdgeId = new Map();
    directionEntries.forEach(entries => {
      entries.forEach((entry, directionIndex) => {
        directionMetadataByEdgeId.set(String(entry.edge.id), {
          directionIndex,
          directionCount: entries.length,
        });
      });
    });

    orderedEntries.forEach((entry, parallelIndex) => {
      const { directionIndex = 0, directionCount = 1 } =
        directionMetadataByEdgeId.get(String(entry.edge.id)) ?? {};
      metadataByEdgeId.set(String(entry.edge.id), {
        edgeIndex: parallelIndex,
        edgeCount: orderedEntries.length,
        parallelOffset: parallelIndex - (orderedEntries.length - 1) / 2,
        directionOffset: directionIndex - (directionCount - 1) / 2,
        directionCount,
        pairDirectionMultiplier:
          String(entry.edge.from) === String(group.firstId) ? 1 : -1,
        pairKey: group.key,
        hasOppositeDirections,
      });
    });
  });

  return metadataByEdgeId;
};

export const getEdgeRenderData = ({
  edges,
  nodes,
  nodeMap,
  edgeRouting,
  edgeCurvature,
  nodeRadius,
  nodeLabelSize,
  edgeLabelSize = 12,
}) => {
  const visibleNodes = getVisibleNodes(nodes);
  const visibleEdges = edges.filter(edge =>
    isEdgeEffectivelyVisible(edge, nodeMap)
  );
  const segmentsById = new Map();
  const placedLabelRects = [];
  const edgePairMetadata = buildEdgePairMetadata(visibleEdges);
  const additionalLabelObstacles = getAdditionalLabelObstacles(
    visibleNodes,
    nodeRadius,
    nodeLabelSize
  );

  visibleEdges.forEach(edge => {
    const from = nodeMap.get(String(edge.from));
    const to = nodeMap.get(String(edge.to));
    if (!from || !to) return;
    if (String(from.id) !== String(to.id)) {
      const segment = insetSegment(from, to, edge.directed, nodeRadius);
      if (getNodeShape(from) !== 'circle') {
        const point = getNodeBoundaryPoint(from, to, nodeRadius, nodeLabelSize);
        segment.x1 = point.x;
        segment.y1 = point.y;
      }
      if (getNodeShape(to) !== 'circle') {
        const point = getNodeBoundaryPoint(to, from, nodeRadius, nodeLabelSize);
        segment.x2 = point.x;
        segment.y2 = point.y;
      }
      segmentsById.set(String(edge.id), segment);
    }
  });

  return visibleEdges
    .map(edge => {
      const from = nodeMap.get(String(edge.from));
      const to = nodeMap.get(String(edge.to));
      if (!from || !to) return null;

      const pairMetadata = edgePairMetadata.get(String(edge.id));
      const geometry = clipEdgeGeometryToNodeShapes(
        buildEdgePath({
          edge,
          from,
          to,
          routing: edgeRouting,
          nodes: visibleNodes,
          edgeCurvature,
          nodeRadius,
          ...pairMetadata,
        }),
        from,
        to,
        nodeRadius,
        nodeLabelSize,
        pairMetadata
      );
      const labelText = String(edge.label ?? '');
      const labelPosition = labelText
        ? chooseShapeAwareLabelPosition(
            {
              edge,
              labelText,
              labelOptions: geometry.labelOptions,
              nodes: visibleNodes,
              segmentsById,
              placedLabelRects,
              nodeRadius,
              labelFontSize: edgeLabelSize,
            },
            additionalLabelObstacles
          )
        : null;

      if (labelPosition && labelText) {
        placedLabelRects.push(
          measureLabelRect(labelPosition, labelText, edgeLabelSize)
        );
      }

      return {
        edge,
        pathD: geometry.d,
        pathType: geometry.pathType,
        pathPoints: geometry.pathPoints,
        labelPosition,
      };
    })
    .filter(Boolean);
};
