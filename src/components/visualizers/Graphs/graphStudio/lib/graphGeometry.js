import {
  GRID_SIZE,
  NODE_RADIUS,
  VIEWBOX_HEIGHT,
  VIEWBOX_WIDTH,
} from '../constants.js';

export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export const clampNodePosition = ({ x, y }) => ({
  x: clamp(x, NODE_RADIUS + 8, VIEWBOX_WIDTH - NODE_RADIUS - 8),
  y: clamp(y, NODE_RADIUS + 8, VIEWBOX_HEIGHT - NODE_RADIUS - 8),
});

// Authored coordinates share the project-file budget. Automatic layouts retain
// their compact default workspace through clampNodePosition above.
export const clampAuthoredNodePosition = ({ x, y }) => ({
  x: clamp(x, -1e7, 1e7),
  y: clamp(y, -1e7, 1e7),
});

export const AUTHORING_VIEW_BOUNDS = Object.freeze({
  x: -1e7 - 10000,
  y: -1e7 - 10000,
  width: 2e7 + 20000,
  height: 2e7 + 20000,
});

export const snapToGrid = (value, gridSize = GRID_SIZE) =>
  Math.round(value / gridSize) * gridSize;
