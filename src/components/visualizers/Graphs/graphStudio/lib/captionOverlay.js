export const DEFAULT_CAPTION_OVERLAY = {
  enabled: false,
  position: {
    x: 0,
    y: 1,
  },
};

const cloneJson = value => JSON.parse(JSON.stringify(value ?? null));

const clampNormalizedCoordinate = (value, fallback) => {
  const coordinate = Number(value);
  if (!Number.isFinite(coordinate)) return fallback;
  return Math.max(0, Math.min(1, coordinate));
};

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
  };
};
