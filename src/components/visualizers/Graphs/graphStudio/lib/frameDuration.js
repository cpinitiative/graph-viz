export const DEFAULT_FRAME_DURATION_MS = 600;
export const MIN_FRAME_DURATION_MS = 80;
export const MAX_FRAME_DURATION_MS = 8000;

export const normalizeFrameDuration = value => {
  if (
    value === null ||
    value === undefined ||
    (typeof value === 'string' && value.trim() === '')
  ) {
    return DEFAULT_FRAME_DURATION_MS;
  }
  const duration = Number(value);
  if (!Number.isFinite(duration)) {
    return DEFAULT_FRAME_DURATION_MS;
  }
  return Math.max(
    MIN_FRAME_DURATION_MS,
    Math.min(MAX_FRAME_DURATION_MS, duration)
  );
};
