import {
  GRID_SIZE,
  NODE_RADIUS,
  VIEWBOX_HEIGHT,
  VIEWBOX_WIDTH,
} from '../constants';

export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export const clampNodePosition = ({ x, y }) => ({
  x: clamp(x, NODE_RADIUS + 8, VIEWBOX_WIDTH - NODE_RADIUS - 8),
  y: clamp(y, NODE_RADIUS + 8, VIEWBOX_HEIGHT - NODE_RADIUS - 8),
});

export const snapToGrid = (value, gridSize = GRID_SIZE) =>
  Math.round(value / gridSize) * gridSize;
