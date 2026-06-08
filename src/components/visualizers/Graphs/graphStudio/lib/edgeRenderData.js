import {
  buildEdgePath,
  chooseBestLabelPosition,
  insetSegment,
  measureLabelRect,
} from '../graphCanvasUtils';

export const getEdgeRenderData = ({
  edges,
  nodes,
  nodeMap,
  edgeRouting,
  edgeCurvature,
  nodeRadius,
}) => {
  const visibleEdges = edges.filter(edge => edge.visible !== false);
  const segmentsById = new Map();
  const placedLabelRects = [];
  const edgeGroups = new Map();

  visibleEdges.forEach(edge => {
    const from = String(edge.from);
    const to = String(edge.to);
    const key = [from, to].sort().join('-');
    if (!edgeGroups.has(key)) edgeGroups.set(key, []);
    edgeGroups.get(key).push(edge);
  });

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

      const key = [String(from.id), String(to.id)].sort().join('-');
      const group = edgeGroups.get(key) || [];
      const edgeIndex = group.findIndex(e => String(e.id) === String(edge.id));
      const edgeCount = group.length;
      const geometry = buildEdgePath({
        edge,
        from,
        to,
        routing: edgeRouting,
        nodes,
        edgeCurvature,
        nodeRadius,
        edgeIndex,
        edgeCount,
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
          })
        : null;

      if (labelPosition && labelText) {
        placedLabelRects.push(measureLabelRect(labelPosition, labelText));
      }

      return { edge, pathD: geometry.d, labelPosition };
    })
    .filter(Boolean);
};
