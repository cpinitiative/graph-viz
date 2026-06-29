import {
  buildEdgePath,
  chooseBestLabelPosition,
  insetSegment,
  measureLabelRect,
} from '../graphCanvasUtils';

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
  edgeLabelSize = 12,
}) => {
  const visibleEdges = edges.filter(edge => edge.visible !== false);
  const segmentsById = new Map();
  const placedLabelRects = [];
  const edgePairMetadata = buildEdgePairMetadata(edges);

  visibleEdges.forEach(edge => {
    const from = nodeMap.get(String(edge.from));
    const to = nodeMap.get(String(edge.to));
    if (!from || !to) return;
    if (String(from.id) !== String(to.id)) {
      segmentsById.set(
        String(edge.id),
        insetSegment(from, to, edge.directed, nodeRadius)
      );
    }
  });

  return visibleEdges
    .map(edge => {
      const from = nodeMap.get(String(edge.from));
      const to = nodeMap.get(String(edge.to));
      if (!from || !to) return null;

      const pairMetadata = edgePairMetadata.get(String(edge.id));
      const geometry = buildEdgePath({
        edge,
        from,
        to,
        routing: edgeRouting,
        nodes,
        edgeCurvature,
        nodeRadius,
        ...pairMetadata,
      });
      const labelText = String(edge.label ?? '');
      const labelPosition = labelText
        ? chooseBestLabelPosition({
            edge,
            labelText,
            labelOptions: geometry.labelOptions,
            nodes,
            segmentsById,
            placedLabelRects,
            nodeRadius,
            labelFontSize: edgeLabelSize,
          })
        : null;

      if (labelPosition && labelText) {
        placedLabelRects.push(
          measureLabelRect(labelPosition, labelText, edgeLabelSize)
        );
      }

      return { edge, pathD: geometry.d, labelPosition };
    })
    .filter(Boolean);
};
