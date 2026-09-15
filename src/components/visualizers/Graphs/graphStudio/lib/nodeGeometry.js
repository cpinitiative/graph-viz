import { NODE_RADIUS } from '../constants.js';
import { getDefaultNodeLabelFontSize } from './fontSizing.js';

export const NODE_SHAPES = Object.freeze([
  'circle',
  'square',
  'rectangle',
  'diamond',
  'text',
]);
export const NODE_ANNOTATION_PLACEMENTS = Object.freeze(['replace', 'below']);

export const getNodeShape = node =>
  NODE_SHAPES.includes(node?.shape) ? node.shape : 'circle';

export const getNodeAnnotationPlacement = node =>
  node?.annotationPlacement === 'below' ? 'below' : 'replace';

export const getNodeAnnotationFontSize = labelFontSize =>
  Math.max(10, (Number(labelFontSize) || 14) * 0.85);

export const getNodeDisplayText = node => {
  const label = String(node?.label ?? node?.id ?? '');
  const annotation = String(node?.annotation ?? '');
  const separate = getNodeAnnotationPlacement(node) === 'below';
  return {
    identity: label,
    label: !separate && annotation ? annotation : label,
    annotation: separate ? annotation : '',
  };
};

// Text nodes need a stable hit target and edge boundary before SVG text has
// mounted. This conservative estimate is shared by rendering and geometry.
export const estimateNodeTextWidth = (text, fontSize) =>
  Array.from(String(text ?? '')).reduce((width, character) => {
    const factor = /[MW@%#]/.test(character)
      ? 0.95
      : /[ilI1.,:;!'| ]/.test(character)
        ? 0.36
        : /[A-Z0-9]/.test(character)
          ? 0.7
          : 0.62;
    return width + fontSize * factor;
  }, 0);

export const getNodeShapeBounds = (
  node,
  nodeRadius = NODE_RADIUS,
  labelFontSize = getDefaultNodeLabelFontSize(nodeRadius)
) => {
  const radius =
    Number.isFinite(Number(nodeRadius)) && Number(nodeRadius) > 0
      ? Number(nodeRadius)
      : NODE_RADIUS;
  const fontSize =
    Number.isFinite(Number(labelFontSize)) && Number(labelFontSize) > 0
      ? Number(labelFontSize)
      : getDefaultNodeLabelFontSize(radius);
  const shape = getNodeShape(node);
  const width =
    shape === 'rectangle'
      ? radius * 3
      : shape === 'text'
        ? Math.max(
            radius * 2,
            estimateNodeTextWidth(getNodeDisplayText(node).label, fontSize) + 16
          )
        : radius * 2;
  const height =
    shape === 'text' ? Math.max(24, fontSize * 1.5 + 8) : radius * 2;
  return {
    x: Number(node?.x ?? 0) - width / 2,
    y: Number(node?.y ?? 0) - height / 2,
    width,
    height,
  };
};

// Intersect a ray from the node center with the visible shape's boundary.
// Annotation text remains outside the shape and does not displace edge ports.
export const getNodeBoundaryPoint = (
  node,
  toward,
  nodeRadius = NODE_RADIUS,
  labelFontSize
) => {
  const bounds = getNodeShapeBounds(node, nodeRadius, labelFontSize);
  const cx = bounds.x + bounds.width / 2;
  const cy = bounds.y + bounds.height / 2;
  let dx = Number(toward?.x) - cx;
  let dy = Number(toward?.y) - cy;
  if (
    !Number.isFinite(dx) ||
    !Number.isFinite(dy) ||
    Math.hypot(dx, dy) < 1e-9
  ) {
    dx = 1;
    dy = 0;
  }
  const halfWidth = bounds.width / 2;
  const halfHeight = bounds.height / 2;
  const shape = getNodeShape(node);
  const denominator =
    shape === 'circle'
      ? Math.hypot(dx / halfWidth, dy / halfHeight)
      : shape === 'diamond'
        ? Math.abs(dx) / halfWidth + Math.abs(dy) / halfHeight
        : Math.max(Math.abs(dx) / halfWidth, Math.abs(dy) / halfHeight);
  return { x: cx + dx / denominator, y: cy + dy / denominator };
};

export const getNodeAccessibleIdentity = node => {
  const id = String(node?.id ?? '');
  const label = String(node?.label ?? id);
  return id && label !== id ? `${label} (${id})` : label;
};

export const getNodeAccessibleName = (
  node,
  stateLabel = 'Default',
  drawAnchor = false
) => {
  const label = String(node?.label ?? node?.id ?? '');
  const annotation = String(node?.annotation ?? '').trim();
  return [
    `Node ${getNodeAccessibleIdentity(node)}`,
    annotation && annotation !== label ? `Annotation: ${annotation}` : '',
    stateLabel,
    drawAnchor ? 'Edge source' : '',
  ]
    .filter(Boolean)
    .join('. ');
};
