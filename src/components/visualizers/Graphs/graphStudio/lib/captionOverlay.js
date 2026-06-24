export const DEFAULT_CAPTION_OVERLAY = {
  enabled: false,
  position: {
    x: 0,
    y: 1,
  },
  style: 'subtle',
  size: 'medium',
};

export const CAPTION_STYLE_OPTIONS = [
  { value: 'subtle', label: 'Subtle' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'plain', label: 'Plain' },
];

export const CAPTION_SIZE_OPTIONS = [
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
];

const cloneJson = value => JSON.parse(JSON.stringify(value ?? null));

const clampNormalizedCoordinate = (value, fallback) => {
  const coordinate = Number(value);
  if (!Number.isFinite(coordinate)) return fallback;
  return Math.max(0, Math.min(1, coordinate));
};

const normalizePreset = (value, options, fallback) =>
  options.some(option => option.value === value) ? value : fallback;

export const normalizeCaptionOverlay = value => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return cloneJson(DEFAULT_CAPTION_OVERLAY);
  }

  const position =
    value.position !== null &&
    typeof value.position === 'object' &&
    !Array.isArray(value.position)
      ? value.position
      : {};

  return {
    enabled:
      typeof value.enabled === 'boolean'
        ? value.enabled
        : DEFAULT_CAPTION_OVERLAY.enabled,
    position: {
      x: clampNormalizedCoordinate(
        position.x,
        DEFAULT_CAPTION_OVERLAY.position.x
      ),
      y: clampNormalizedCoordinate(
        position.y,
        DEFAULT_CAPTION_OVERLAY.position.y
      ),
    },
    style: normalizePreset(
      value.style,
      CAPTION_STYLE_OPTIONS,
      DEFAULT_CAPTION_OVERLAY.style
    ),
    size: normalizePreset(
      value.size,
      CAPTION_SIZE_OPTIONS,
      DEFAULT_CAPTION_OVERLAY.size
    ),
  };
};
