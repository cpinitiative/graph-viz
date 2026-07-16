import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  getContainedViewState,
  getVisibleWorldBounds,
} from '../../src/components/visualizers/Graphs/graphStudio/graphCanvasUtils.js';
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

test('viewport framing contains the complete captured world region across editor shapes', () => {
  const targetViewport = {
    width: SLIDE_EXPORT_WIDTH,
    height: SLIDE_EXPORT_HEIGHT,
  };
  const camera = { x: -873.25, y: 412.5, zoom: 2.35 };
  const editorViewports = [
    { width: 600, height: 400 },
    { width: 1400.49, height: 280.37 },
    { width: 320, height: 900 },
  ];
  const epsilon = 1e-7;

  editorViewports.forEach(sourceViewport => {
    const sourceBounds = getVisibleWorldBounds({
      viewState: camera,
      viewport: sourceViewport,
    });
    const exportViewState = getContainedViewState({
      viewState: camera,
      sourceViewport,
      targetViewport,
    });
    assert.ok(sourceBounds);
    assert.ok(exportViewState);

    const mappedBounds = {
      minX: sourceBounds.minX * exportViewState.zoom + exportViewState.x,
      minY: sourceBounds.minY * exportViewState.zoom + exportViewState.y,
      maxX: sourceBounds.maxX * exportViewState.zoom + exportViewState.x,
      maxY: sourceBounds.maxY * exportViewState.zoom + exportViewState.y,
    };
    assert.ok(mappedBounds.minX >= -epsilon);
    assert.ok(mappedBounds.minY >= -epsilon);
    assert.ok(mappedBounds.maxX <= targetViewport.width + epsilon);
    assert.ok(mappedBounds.maxY <= targetViewport.height + epsilon);

    const mappedWidth = mappedBounds.maxX - mappedBounds.minX;
    const mappedHeight = mappedBounds.maxY - mappedBounds.minY;
    const sourceWidth = sourceBounds.maxX - sourceBounds.minX;
    const sourceHeight = sourceBounds.maxY - sourceBounds.minY;
    assert.ok(
      Math.abs(mappedWidth / sourceWidth - mappedHeight / sourceHeight) <
        epsilon
    );
    assert.ok(
      Math.abs(mappedWidth - targetViewport.width) < epsilon ||
        Math.abs(mappedHeight - targetViewport.height) < epsilon
    );

    const exportWorldBounds = getVisibleWorldBounds({
      viewState: exportViewState,
      viewport: targetViewport,
    });
    assert.ok(exportWorldBounds.minX <= sourceBounds.minX + epsilon);
    assert.ok(exportWorldBounds.minY <= sourceBounds.minY + epsilon);
    assert.ok(exportWorldBounds.maxX >= sourceBounds.maxX - epsilon);
    assert.ok(exportWorldBounds.maxY >= sourceBounds.maxY - epsilon);
  });
});

test('viewport framing remains owned by the dimensions captured at review time', () => {
  const viewState = { x: -220, y: 135, zoom: 1.8 };
  const capturedViewport = { width: 600, height: 400 };
  const resizedLiveViewport = { width: 1320, height: 260 };
  const targetViewport = {
    width: SLIDE_EXPORT_WIDTH,
    height: SLIDE_EXPORT_HEIGHT,
  };

  const reviewedTransform = getContainedViewState({
    viewState,
    sourceViewport: { ...capturedViewport },
    targetViewport,
  });
  const sameReviewedTransformAfterResize = getContainedViewState({
    viewState,
    sourceViewport: capturedViewport,
    targetViewport,
  });
  const liveResizeTransform = getContainedViewState({
    viewState,
    sourceViewport: resizedLiveViewport,
    targetViewport,
  });

  assert.deepEqual(sameReviewedTransformAfterResize, reviewedTransform);
  assert.notDeepEqual(liveResizeTransform, reviewedTransform);
});
