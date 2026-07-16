import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createTimelinePlaybackController } from '../../src/components/visualizers/Graphs/graphStudio/lib/timelinePlayback.js';

const createFakeTimers = () => {
  let nextId = 0;
  const callbacks = new Map();
  const pending = new Map();
  const cleared = [];

  return {
    schedule(callback, delay) {
      const id = nextId;
      nextId += 1;
      const entry = { callback, delay };
      callbacks.set(id, entry);
      pending.set(id, entry);
      return id;
    },
    clear(id) {
      cleared.push(id);
      pending.delete(id);
    },
    invoke(id) {
      pending.delete(id);
      callbacks.get(id)?.callback();
    },
    get cleared() {
      return [...cleared];
    },
    get pending() {
      return [...pending.entries()];
    },
  };
};

const createHarness = ({ initialFrame = 0, initialSteps } = {}) => {
  let currentFrame = initialFrame;
  let steps = initialSteps ?? [
    { durationMs: 100 },
    { durationMs: 200 },
    { durationMs: 300 },
  ];
  const frameChanges = [];
  const playingChanges = [];
  const timers = createFakeTimers();
  let playAllowed = true;
  let blockedPlayCount = 0;
  const controller = createTimelinePlaybackController({
    getSteps: () => steps,
    getCurrentFrame: () => currentFrame,
    onFrameChange: frame => {
      currentFrame = frame;
      frameChanges.push(frame);
    },
    onPlayingChange: playing => playingChanges.push(playing),
    canPlay: () => playAllowed,
    onPlayBlocked: () => {
      blockedPlayCount += 1;
    },
    schedule: (callback, delay) => timers.schedule(callback, delay),
    clearSchedule: id => timers.clear(id),
  });

  return {
    controller,
    frameChanges,
    playingChanges,
    timers,
    getCurrentFrame: () => currentFrame,
    setSteps: nextSteps => {
      steps = nextSteps;
    },
    setPlayAllowed: allowed => {
      playAllowed = allowed;
    },
    getBlockedPlayCount: () => blockedPlayCount,
  };
};

test('starting playback twice leaves only one active timer', () => {
  const harness = createHarness();

  harness.controller.play();
  const firstTimerId = harness.timers.pending[0][0];
  harness.controller.play();

  assert.equal(harness.timers.pending.length, 1);
  assert.deepEqual(harness.timers.cleared, [firstTimerId]);
  harness.timers.invoke(firstTimerId);
  assert.deepEqual(harness.frameChanges, []);
  assert.equal(harness.timers.pending.length, 1);
});

test('stopping playback makes a captured delayed callback inert', () => {
  const harness = createHarness();

  harness.controller.play();
  const timerId = harness.timers.pending[0][0];
  harness.controller.stop();
  harness.setSteps([{ durationMs: 100 }]);
  harness.timers.invoke(timerId);

  assert.equal(harness.controller.isRunning(), false);
  assert.equal(harness.controller.hasPendingTimer(), false);
  assert.deepEqual(harness.frameChanges, []);
  assert.equal(harness.getCurrentFrame(), 0);
});

test('a live tick reads the latest frame count and never selects an invalid frame', () => {
  const harness = createHarness({ initialFrame: 1 });

  harness.controller.play();
  const timerId = harness.timers.pending[0][0];
  harness.setSteps([{ durationMs: 100 }, { durationMs: 200 }]);
  harness.timers.invoke(timerId);

  assert.deepEqual(harness.frameChanges, []);
  assert.equal(harness.getCurrentFrame(), 1);
  assert.equal(harness.controller.isRunning(), false);
});

test('future timers use the latest frame duration', () => {
  const harness = createHarness();

  harness.controller.play();
  const firstTimerId = harness.timers.pending[0][0];
  harness.setSteps([
    { durationMs: 100 },
    { durationMs: 725 },
    { durationMs: 300 },
  ]);
  harness.timers.invoke(firstTimerId);

  assert.deepEqual(harness.frameChanges, [1]);
  assert.equal(harness.timers.pending.length, 1);
  assert.equal(harness.timers.pending[0][1].delay, 725);
});

test('natural completion clears playing state and pending timers', () => {
  const harness = createHarness({
    initialSteps: [{ durationMs: 100 }, { durationMs: 200 }],
  });

  harness.controller.play();
  harness.timers.invoke(harness.timers.pending[0][0]);
  harness.timers.invoke(harness.timers.pending[0][0]);

  assert.deepEqual(harness.frameChanges, [1]);
  assert.deepEqual(harness.playingChanges, [true, false]);
  assert.equal(harness.controller.isRunning(), false);
  assert.equal(harness.controller.hasPendingTimer(), false);
});

test('disposing playback clears the timer and invalidates its callback', () => {
  const harness = createHarness();

  harness.controller.play();
  const timerId = harness.timers.pending[0][0];
  harness.controller.dispose();
  harness.timers.invoke(timerId);

  assert.deepEqual(harness.timers.cleared, [timerId]);
  assert.deepEqual(harness.frameChanges, []);
  assert.equal(harness.controller.isRunning(), false);
  assert.equal(harness.controller.hasPendingTimer(), false);
});

test('playback controller refuses to start while visual export is locked', () => {
  const harness = createHarness();
  harness.setPlayAllowed(false);

  assert.equal(harness.controller.play(), false);
  assert.equal(harness.controller.isRunning(), false);
  assert.equal(harness.controller.hasPendingTimer(), false);
  assert.equal(harness.getBlockedPlayCount(), 1);
  assert.deepEqual(harness.playingChanges, []);
  assert.deepEqual(harness.frameChanges, []);
});

test('a delayed playback callback becomes inert when export locks playback', () => {
  const harness = createHarness();

  harness.controller.play();
  const timerId = harness.timers.pending[0][0];
  harness.setPlayAllowed(false);
  harness.timers.invoke(timerId);

  assert.equal(harness.controller.isRunning(), false);
  assert.equal(harness.controller.hasPendingTimer(), false);
  assert.equal(harness.getCurrentFrame(), 0);
  assert.deepEqual(harness.frameChanges, []);
  assert.deepEqual(harness.playingChanges, [true, false]);
});
