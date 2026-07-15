import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  getLegendOrigin,
  getNormalizedOverlayOrigin,
  getOverlayPositionBounds,
} from '../../src/components/visualizers/Graphs/graphStudio/lib/exportOverlayGeometry.js';
import {
  CAPTURE_MODE,
  getFitContentTransform,
  normalizeCaptureDimensions,
  SLIDE_EXPORT_HEIGHT,
  SLIDE_EXPORT_WIDTH,
} from '../../src/components/visualizers/Graphs/graphStudio/lib/timelineFrameCapture.js';

test('static and slide capture preserve exact 1040 by 585 dimensions', () => {
  const requested = {
    width: SLIDE_EXPORT_WIDTH,
    height: SLIDE_EXPORT_HEIGHT,
  };

  assert.deepEqual(
    normalizeCaptureDimensions({ ...requested, mode: CAPTURE_MODE.static }),
    requested
  );
  assert.deepEqual(
    normalizeCaptureDimensions({ ...requested, mode: CAPTURE_MODE.slide }),
    requested
  );
});

test('even dimension normalization is video-only', () => {
  assert.deepEqual(
    normalizeCaptureDimensions({
      width: SLIDE_EXPORT_WIDTH,
      height: SLIDE_EXPORT_HEIGHT,
      mode: CAPTURE_MODE.video,
    }),
    { width: 1040, height: 584 }
  );
  assert.deepEqual(
    normalizeCaptureDimensions({
      width: Number.POSITIVE_INFINITY,
      height: Number.NaN,
      mode: CAPTURE_MODE.video,
    }),
    { width: 2, height: 2 }
  );
});

test('caption auto/default position is anchored to canonical export geometry', () => {
  const bounds = getOverlayPositionBounds({
    canvasSize: { width: 1040, height: 585 },
    boxWidth: 300,
    boxHeight: 60,
    margin: 16,
  });

  assert.deepEqual(
    getNormalizedOverlayOrigin({ bounds, position: { x: 0, y: 1 } }),
    { x: 16, y: 509 }
  );
  assert.deepEqual(
    getNormalizedOverlayOrigin({ bounds, position: { x: 0.25, y: 0.5 } }),
    { x: 193, y: 262.5 }
  );
});

test('legend auto and custom positions use canonical export geometry', () => {
  const geometry = {
    canvasSize: { width: 1040, height: 585 },
    boxWidth: 200,
    boxHeight: 140,
    margin: 16,
  };

  assert.deepEqual(getLegendOrigin({ ...geometry, position: 'auto' }), {
    x: 824,
    y: 429,
  });
  assert.deepEqual(
    getLegendOrigin({
      ...geometry,
      position: 'custom',
      customPosition: { x: 0.25, y: 0.75 },
    }),
    { x: 218, y: 325.75 }
  );
});

test('fit framing scales graph content inside fixed export geometry', () => {
  const transform = getFitContentTransform({
    bounds: { minX: 100, minY: 50, maxX: 300, maxY: 150 },
    viewport: { x: 0, y: 0, width: 1040, height: 585 },
    padding: 36,
  });

  assert.equal(transform.scale, 4.84);
  assert.equal(100 * transform.scale + transform.x, 36);
  assert.equal(300 * transform.scale + transform.x, 1004);
  assert.equal(50 * transform.scale + transform.y, 50.5);
  assert.equal(150 * transform.scale + transform.y, 534.5);
});
