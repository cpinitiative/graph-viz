import { GRAPH_STATE_COLORS } from './stateColors';

export const CUSTOM_LEGEND_POSITIONS = [
  'auto',
  'top-left',
  'top-right',
  'bottom-left',
  'bottom-right',
  'custom',
];

export const CUSTOM_LEGEND_POSITION_LABELS = {
  auto: 'Auto',
  'top-left': 'Top Left',
  'top-right': 'Top Right',
  'bottom-left': 'Bottom Left',
  'bottom-right': 'Bottom Right',
  custom: 'Custom',
};

export const CUSTOM_LEGEND_KINDS = ['node', 'edge'];

export const CUSTOM_LEGEND_FALLBACK_COLOR = GRAPH_STATE_COLORS.edgeDefault;

export const DEFAULT_CUSTOM_LEGEND_ENTRIES = [
  {
    group: 'Nodes',
    kind: 'node',
    label: 'Default node',
    color: GRAPH_STATE_COLORS.nodeDefault,
  },
  {
    group: 'Nodes',
    kind: 'node',
    label: 'Active node',
    color: GRAPH_STATE_COLORS.nodeActive,
  },
  {
    group: 'Nodes',
    kind: 'node',
    label: 'Queued node',
    color: GRAPH_STATE_COLORS.nodeQueued,
  },
  {
    group: 'Nodes',
    kind: 'node',
    label: 'Visited node',
    color: GRAPH_STATE_COLORS.nodeVisited,
  },
  {
    group: 'Edges',
    kind: 'edge',
    label: 'Highlighted edge',
    color: GRAPH_STATE_COLORS.edgeHighlighted,
  },
  {
    group: 'Edges',
    kind: 'edge',
    label: 'Selected edge',
    color: GRAPH_STATE_COLORS.edgeSelected,
  },
];

export const DEFAULT_CUSTOM_LEGEND = {
  enabled: false,
  title: 'Legend',
  position: 'auto',
  customPosition: {
    x: 0.75,
    y: 0.15,
  },
  entries: DEFAULT_CUSTOM_LEGEND_ENTRIES,
};

const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

const cloneJson = value => JSON.parse(JSON.stringify(value ?? null));
const clampNormalizedCoordinate = value => {
  const coordinate = Number(value);
  if (!Number.isFinite(coordinate)) return null;
  return Math.max(0, Math.min(1, coordinate));
};

export const isValidLegendColor = value =>
  typeof value === 'string' && HEX_COLOR_PATTERN.test(value);

export const getLegendEntryFallbackGroup = kind =>
  kind === 'edge' ? 'Edges' : 'Nodes';

export const getLegendEntryGroup = entry => {
  const kind = entry?.kind === 'edge' ? 'edge' : 'node';
  const group = String(entry?.group ?? '').trim();
  return group || getLegendEntryFallbackGroup(kind);
};

const normalizeLegendEntry = entry => {
  if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) {
    return null;
  }

  const label = String(entry.label ?? '').trim();
  if (!label) return null;

  const group = String(entry.group ?? '').trim();
  const kind = CUSTOM_LEGEND_KINDS.includes(entry.kind)
    ? entry.kind
    : DEFAULT_CUSTOM_LEGEND_ENTRIES[0].kind;

  return {
    ...(group ? { group } : {}),
    kind,
    label,
    color: isValidLegendColor(entry.color)
      ? entry.color
      : CUSTOM_LEGEND_FALLBACK_COLOR,
  };
};

export const normalizeCustomLegend = value => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return cloneJson(DEFAULT_CUSTOM_LEGEND);
  }

  const title = String(value.title ?? DEFAULT_CUSTOM_LEGEND.title).trim();
  const rawEntries = Array.isArray(value.entries)
    ? value.entries
    : DEFAULT_CUSTOM_LEGEND.entries;
  const entries = rawEntries.map(normalizeLegendEntry).filter(Boolean);
  const customPositionValue =
    value.customPosition !== null &&
    typeof value.customPosition === 'object' &&
    !Array.isArray(value.customPosition)
      ? value.customPosition
      : {};
  const x = clampNormalizedCoordinate(customPositionValue.x);
  const y = clampNormalizedCoordinate(customPositionValue.y);

  return {
    enabled:
      typeof value.enabled === 'boolean'
        ? value.enabled
        : DEFAULT_CUSTOM_LEGEND.enabled,
    title: title || DEFAULT_CUSTOM_LEGEND.title,
    entries,
    position: CUSTOM_LEGEND_POSITIONS.includes(value.position)
      ? value.position
      : DEFAULT_CUSTOM_LEGEND.position,
    customPosition: {
      x: x ?? DEFAULT_CUSTOM_LEGEND.customPosition.x,
      y: y ?? DEFAULT_CUSTOM_LEGEND.customPosition.y,
    },
  };
};
