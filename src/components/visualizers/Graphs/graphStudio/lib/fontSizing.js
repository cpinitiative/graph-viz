export const NODE_LABEL_FONT_SIZE_RANGE = {
  min: 10,
  max: 40,
};

export const EDGE_LABEL_FONT_SIZE_RANGE = {
  min: 10,
  max: 32,
};

export const DEFAULT_NODE_SIZE = 22;
export const DEFAULT_EDGE_WIDTH = 2.2;

export const clampNumber = (value, min, max) =>
  Math.max(min, Math.min(max, value));

const roundPixel = value => Number(value.toFixed(1));

export const getDefaultNodeLabelFontSize = nodeSize => {
  const normalizedNodeSize = Number.isFinite(Number(nodeSize))
    ? Number(nodeSize)
    : DEFAULT_NODE_SIZE;
  return clampNumber(roundPixel(normalizedNodeSize * 0.55), 12, 28);
};

export const getDefaultEdgeLabelFontSize = edgeWidth => {
  const normalizedEdgeWidth = Number.isFinite(Number(edgeWidth))
    ? Number(edgeWidth)
    : DEFAULT_EDGE_WIDTH;
  return clampNumber(roundPixel(normalizedEdgeWidth * 2.5 + 10), 12, 22);
};

export const normalizeNodeLabelFontSize = value =>
  Number.isFinite(Number(value))
    ? clampNumber(
        roundPixel(Number(value)),
        NODE_LABEL_FONT_SIZE_RANGE.min,
        NODE_LABEL_FONT_SIZE_RANGE.max
      )
    : getDefaultNodeLabelFontSize(DEFAULT_NODE_SIZE);

export const normalizeEdgeLabelFontSize = value =>
  Number.isFinite(Number(value))
    ? clampNumber(
        roundPixel(Number(value)),
        EDGE_LABEL_FONT_SIZE_RANGE.min,
        EDGE_LABEL_FONT_SIZE_RANGE.max
      )
    : getDefaultEdgeLabelFontSize(DEFAULT_EDGE_WIDTH);
