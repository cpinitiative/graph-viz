import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  buildVideoFramePlan,
  VIDEO_EXPORT_FPS,
} from '../../src/components/visualizers/Graphs/graphStudio/lib/exportTimelineVideo.js';

test('video frame plan preserves selected order and normalized durations', () => {
  const steps = [
    { durationMs: 0 },
    { durationMs: 1200 },
    { durationMs: Number.POSITIVE_INFINITY },
  ];

  assert.deepEqual(buildVideoFramePlan({ steps, frameIndexes: [2, 0, 1] }), [
    {
      frameIndex: 2,
      durationMs: 600,
      outputFrameCount: 18,
      outputFrameOffset: 0,
    },
    {
      frameIndex: 0,
      durationMs: 80,
      outputFrameCount: 2,
      outputFrameOffset: 18,
    },
    {
      frameIndex: 1,
      durationMs: 1200,
      outputFrameCount: 36,
      outputFrameOffset: 20,
    },
  ]);
  assert.equal(VIDEO_EXPORT_FPS, 30);
});

test('video frame plan drops invalid requested frames', () => {
  assert.deepEqual(
    buildVideoFramePlan({
      steps: [{ durationMs: 100 }, { durationMs: 200 }],
      frameIndexes: [-1, 1, 9, 0.5],
    }).map(entry => entry.frameIndex),
    [1]
  );
});
