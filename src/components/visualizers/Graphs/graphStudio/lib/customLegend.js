export const CUSTOM_LEGEND_POSITIONS = [
  'top-left',
  'top-right',
  'bottom-left',
  'bottom-right',
];

export const CUSTOM_LEGEND_KINDS = ['node', 'edge'];

export const DEFAULT_CUSTOM_LEGEND_ENTRIES = [
  {
    group: 'Nodes',
    kind: 'node',
    label: 'Default node',
    color: '#E2E8F0',
  },
  {
    group: 'Nodes',
    kind: 'node',
    label: 'Active node',
    color: '#3B82F6',
  },
  {
    group: 'Nodes',
    kind: 'node',
    label: 'Queued node',
    color: '#EAB308',
  },
  {
    group: 'Nodes',
    kind: 'node',
    label: 'Visited node',
    color: '#22C55E',
  },
  {
    group: 'Edges',
    kind: 'edge',
    label: 'Highlighted edge',
    color: '#F59E0B',
  },
  {
    group: 'Edges',
    kind: 'edge',
    label: 'Selected edge',
    color: '#0F172A',
  },
];

export const DEFAULT_CUSTOM_LEGEND = {
  enabled: false,
  title: 'Legend',
  position: 'bottom-right',
  entries: DEFAULT_CUSTOM_LEGEND_ENTRIES,
};

const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

const cloneJson = value => JSON.parse(JSON.stringify(value ?? null));

export const isValidLegendColor = value =>
  typeof value === 'string' && HEX_COLOR_PATTERN.test(value);

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
    color: isValidLegendColor(entry.color) ? entry.color : '#64748B',
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
  };
};
