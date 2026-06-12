import { clamp } from './graphGeometry';

export const EXPORT_FRAME_RANGE_MODES = ['all', 'current', 'range'];

export const DEFAULT_EXPORT_FRAME_RANGE = {
  mode: 'all',
  startFrame: 1,
  endFrame: 1,
};

const normalizeMode = mode =>
  EXPORT_FRAME_RANGE_MODES.includes(mode) ? mode : 'all';

export const clampExportFrameRange = (range, frameCount) => {
  const maxFrame = Math.max(1, Number(frameCount) || 1);
  const startFrame = clamp(Number(range?.startFrame ?? 1), 1, maxFrame);
  const endFrame = clamp(Number(range?.endFrame ?? maxFrame), 1, maxFrame);
  const orderedStart = Math.min(startFrame, endFrame);
  const orderedEnd = Math.max(startFrame, endFrame);

  return {
    mode: normalizeMode(range?.mode),
    startFrame: orderedStart,
    endFrame: orderedEnd,
  };
};

export const resolveExportFrameIndexes = ({
  frameCount,
  currentFrame,
  range,
}) => {
  const count = Math.max(0, Number(frameCount) || 0);
  if (!count) return [];

  const validCurrentFrame = clamp(Number(currentFrame) || 0, 0, count - 1);
  const normalizedRange = clampExportFrameRange(range, count);

  if (normalizedRange.mode === 'current') {
    return [validCurrentFrame];
  }

  if (normalizedRange.mode === 'range') {
    const startIndex = normalizedRange.startFrame - 1;
    const endIndex = normalizedRange.endFrame - 1;
    return Array.from(
      { length: endIndex - startIndex + 1 },
      (_, offset) => startIndex + offset
    );
  }

  return Array.from({ length: count }, (_, index) => index);
};
