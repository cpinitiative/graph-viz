export const DEFAULT_CAPTION_OVERLAY = {
  enabled: false,
  position: {
    x: 0,
    y: 1,
  },
  style: 'subtle',
  size: 'medium',
  fontSize: 12,
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

export const CAPTION_FONT_SIZE_RANGE = {
  min: 12,
  max: 56,
};

export const CAPTION_SIZE_FONT_SIZES = {
  small: 12,
  medium: 12,
  large: 14,
};

const cloneJson = value => JSON.parse(JSON.stringify(value ?? null));

const clampNormalizedCoordinate = (value, fallback) => {
  const coordinate = Number(value);
  if (!Number.isFinite(coordinate)) return fallback;
  return Math.max(0, Math.min(1, coordinate));
};

const normalizePreset = (value, options, fallback) =>
  options.some(option => option.value === value) ? value : fallback;

const clampCaptionFontSize = value => {
  const size = Number(value);
  if (!Number.isFinite(size)) return null;
  return Math.max(
    CAPTION_FONT_SIZE_RANGE.min,
    Math.min(CAPTION_FONT_SIZE_RANGE.max, Math.round(size))
  );
};

export const getCaptionPresetFontSize = size =>
  CAPTION_SIZE_FONT_SIZES[size] ?? CAPTION_SIZE_FONT_SIZES.medium;

export const normalizeCaptionFontSize = (value, size = 'medium') =>
  clampCaptionFontSize(value) ?? getCaptionPresetFontSize(size);

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

  const size = normalizePreset(
    value.size,
    CAPTION_SIZE_OPTIONS,
    DEFAULT_CAPTION_OVERLAY.size
  );

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
    size,
    fontSize: normalizeCaptionFontSize(value.fontSize, size),
  };
};

export const resolveStepCaptionEnabled = (step, captionOverlay) => {
  if (typeof step?.captionVisible === 'boolean') return step.captionVisible;
  return normalizeCaptionOverlay(captionOverlay).enabled;
};
