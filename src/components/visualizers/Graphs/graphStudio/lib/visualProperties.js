import { GRAPH_STATE_COLORS } from './stateColors.js';

export const NODE_STATES = Object.freeze({
  default: {
    label: 'Default',
    color: GRAPH_STATE_COLORS.nodeDefault,
    dash: undefined,
  },
  active: {
    label: 'Active',
    color: GRAPH_STATE_COLORS.nodeActive,
    dash: undefined,
  },
  queued: {
    label: 'Queued',
    color: GRAPH_STATE_COLORS.nodeQueued,
    dash: '6 3',
  },
  visited: {
    label: 'Visited',
    color: GRAPH_STATE_COLORS.nodeVisited,
    dash: '2 3',
  },
  discarded: { label: 'Discarded', color: '#FFFFFF', dash: '8 3 2 3' },
});

export const isGraphColor = color =>
  typeof color === 'string' && /^(?:|#[\da-f]{3}|#[\da-f]{6})$/i.test(color);

export const getContrastText = color => {
  if (!isGraphColor(color) || !color) return '#0F172A';
  const hex =
    color.length === 4
      ? color
          .slice(1)
          .split('')
          .map(c => c + c)
          .join('')
      : color.slice(1);
  const rgb = hex
    .match(/../g)
    .map(c => parseInt(c, 16) / 255)
    .map(c => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  const luminance = rgb.reduce(
    (sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i],
    0
  );
  return luminance > 0.179 ? '#000000' : '#FFFFFF';
};

export const isVisualPropertyValid = (type, key, value) => {
  if (value === undefined) return true;
  if (key === 'annotation')
    return type === 'node' && typeof value === 'string' && value.length <= 200;
  if (key === 'color') return isGraphColor(value);
  if (key === 'visible') return typeof value === 'boolean';
  if (key === 'status')
    return (
      typeof value === 'string' &&
      (type === 'node'
        ? Object.hasOwn(NODE_STATES, value)
        : /^(default|active|queued|visited|discarded|highlighted|completed|rejected)$/.test(
            value
          ))
    );
  return true;
};

export const validateVisualProperties = (type, value, label) => {
  for (const key of ['color', 'status', 'visible', 'annotation']) {
    if (!isVisualPropertyValid(type, key, value[key])) {
      throw new Error(
        `${label}: invalid ${key}${key === 'color' ? ' (use a hex color such as #3B82F6)' : ''}`
      );
    }
  }
};
