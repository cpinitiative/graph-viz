export const isNodeVisible = node => Boolean(node) && node.visible !== false;

export const isEdgeExplicitlyVisible = edge => edge?.visible !== false;

export const isEdgeEffectivelyVisible = (edge, nodeMap) => {
  if (!isEdgeExplicitlyVisible(edge)) return false;
  const fromNode = nodeMap?.get(String(edge?.from));
  const toNode = nodeMap?.get(String(edge?.to));
  return isNodeVisible(fromNode) && isNodeVisible(toNode);
};

export const getVisibleNodes = nodes =>
  (Array.isArray(nodes) ? nodes : []).filter(isNodeVisible);
