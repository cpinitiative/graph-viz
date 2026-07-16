import { normalizeFrameDuration } from './frameDuration.js';

const clampFrame = (frame, count) => {
  if (!count) return 0;
  const numericFrame = Number(frame);
  const safeFrame = Number.isFinite(numericFrame) ? numericFrame : 0;
  return Math.max(0, Math.min(Math.trunc(safeFrame), count - 1));
};

const defaultSchedule = (callback, delay) => window.setTimeout(callback, delay);
const defaultClearSchedule = timerId => window.clearTimeout(timerId);

export const createTimelinePlaybackController = ({
  getSteps,
  getCurrentFrame,
  onFrameChange,
  onPlayingChange,
  onCannotPlay,
  canPlay,
  onPlayBlocked,
  schedule = defaultSchedule,
  clearSchedule = defaultClearSchedule,
}) => {
  let timerId = null;
  let generation = 0;
  let running = false;

  const readSteps = () => {
    const value = getSteps?.();
    return Array.isArray(value) ? value : [];
  };
  const isPlayAllowed = () => canPlay?.() !== false;

  const clearPendingTimer = () => {
    if (timerId === null) return;
    clearSchedule(timerId);
    timerId = null;
  };

  const updateRunning = nextRunning => {
    if (running === nextRunning) return;
    running = nextRunning;
    onPlayingChange?.(nextRunning);
  };

  const stop = () => {
    generation += 1;
    clearPendingTimer();
    updateRunning(false);
  };

  const finish = runGeneration => {
    if (runGeneration !== generation) return;
    clearPendingTimer();
    updateRunning(false);
  };

  const scheduleNextFrame = runGeneration => {
    if (runGeneration !== generation || !running) return;
    if (!isPlayAllowed()) {
      stop();
      return;
    }
    const steps = readSteps();
    if (steps.length <= 1) {
      finish(runGeneration);
      return;
    }

    const currentFrame = clampFrame(getCurrentFrame?.(), steps.length);
    const durationMs = normalizeFrameDuration(steps[currentFrame]?.durationMs);
    timerId = schedule(() => {
      timerId = null;
      if (runGeneration !== generation || !running) return;
      if (!isPlayAllowed()) {
        stop();
        return;
      }

      const latestSteps = readSteps();
      if (latestSteps.length <= 1) {
        finish(runGeneration);
        return;
      }
      const latestFrame = clampFrame(getCurrentFrame?.(), latestSteps.length);
      const nextFrame = latestFrame + 1;
      if (nextFrame >= latestSteps.length) {
        finish(runGeneration);
        return;
      }

      onFrameChange?.(nextFrame, latestSteps.length);
      scheduleNextFrame(runGeneration);
    }, durationMs);
  };

  const play = () => {
    stop();
    if (!isPlayAllowed()) {
      onPlayBlocked?.();
      return false;
    }
    const steps = readSteps();
    if (steps.length <= 1) {
      onCannotPlay?.();
      return false;
    }

    const currentFrame = clampFrame(getCurrentFrame?.(), steps.length);
    if (currentFrame !== Number(getCurrentFrame?.())) {
      onFrameChange?.(currentFrame, steps.length);
    }
    updateRunning(true);
    const runGeneration = generation;
    scheduleNextFrame(runGeneration);
    return true;
  };

  const toggle = () => (running ? (stop(), false) : play());

  const dispose = () => {
    generation += 1;
    clearPendingTimer();
    running = false;
  };

  return {
    play,
    stop,
    toggle,
    dispose,
    isRunning: () => running,
    hasPendingTimer: () => timerId !== null,
  };
};
