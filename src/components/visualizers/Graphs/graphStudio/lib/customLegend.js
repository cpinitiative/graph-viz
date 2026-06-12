export const CUSTOM_LEGEND_POSITIONS = [
  'top-left',
  'top-right',
  'bottom-left',
  'bottom-right',
];

export const DEFAULT_CUSTOM_LEGEND = {
  enabled: false,
  title: 'Legend',
  entries: [],
  position: 'bottom-right',
};

const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

const cloneJson = value => JSON.parse(JSON.stringify(value ?? null));

export const isValidLegendColor = value =>
  typeof value === 'string' && HEX_COLOR_PATTERN.test(value);

export const normalizeCustomLegend = value => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return cloneJson(DEFAULT_CUSTOM_LEGEND);
  }

  const title = String(value.title ?? DEFAULT_CUSTOM_LEGEND.title).trim();
  const rawEntries = Array.isArray(value.entries) ? value.entries : [];
  const entries = rawEntries
    .filter(entry => entry && typeof entry === 'object')
    .map(entry => ({
      label: String(entry.label ?? '').trim(),
      color: isValidLegendColor(entry.color) ? entry.color : '#64748B',
    }))
    .filter(entry => entry.label);

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
