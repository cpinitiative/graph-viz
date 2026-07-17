import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  clampFitZoom,
  clampZoom,
  computeMinZoom,
  createFitViewState,
} from '../../src/components/visualizers/Graphs/graphStudio/graphCanvasUtils.js';

const mapBoundsToViewport = (bounds, viewState) => ({
  left: bounds.x * viewState.zoom + viewState.x,
  top: bounds.y * viewState.zoom + viewState.y,
  right: (bounds.x + bounds.width) * viewState.zoom + viewState.x,
  bottom: (bounds.y + bounds.height) * viewState.zoom + viewState.y,
});

test('fit view centers complete asymmetric bounds with fixed screen padding', () => {
  const bounds = { x: -120, y: 80, width: 1560, height: 920 };
  const viewState = createFitViewState({
    bounds,
    viewportWidth: 1040,
    viewportHeight: 585,
    padding: 24,
    minZoom: 0.05,
    maxZoom: 1,
  });
  const mapped = mapBoundsToViewport(bounds, viewState);

  assert.ok(mapped.left >= 24 - 1e-9);
  assert.ok(mapped.top >= 24 - 1e-9);
  assert.ok(mapped.right <= 1040 - 24 + 1e-9);
  assert.ok(mapped.bottom <= 585 - 24 + 1e-9);
  assert.ok(Math.abs(mapped.left - (1040 - mapped.right)) < 1e-9);
  assert.ok(Math.abs(mapped.top - (585 - mapped.bottom)) < 1e-9);
});

test('fit view caps magnification for compact content', () => {
  assert.deepEqual(
    createFitViewState({
      bounds: { x: 400, y: 250, width: 120, height: 80 },
      viewportWidth: 1040,
      viewportHeight: 585,
      padding: 24,
      minZoom: 0.05,
      maxZoom: 1,
    }),
    { zoom: 1, x: 60, y: 2.5 }
  );
});

test('fit view can zoom below the canonical grid-fill scale', () => {
  const bounds = { x: -800, y: -600, width: 3800, height: 2400 };
  const viewState = createFitViewState({
    bounds,
    viewportWidth: 900,
    viewportHeight: 600,
    padding: 30,
    minZoom: 0.05,
    maxZoom: 1,
  });
  const mapped = mapBoundsToViewport(bounds, viewState);

  assert.ok(viewState.zoom < 0.4);
  assert.ok(mapped.left >= 30 - 1e-9);
  assert.ok(mapped.top >= 30 - 1e-9);
  assert.ok(mapped.right <= 870 + 1e-9);
  assert.ok(mapped.bottom <= 570 + 1e-9);
});

test('fit view rejects invalid geometry and editor zoom honors five percent', () => {
  assert.equal(
    createFitViewState({
      bounds: { x: 0, y: 0, width: Number.NaN, height: 10 },
      viewportWidth: 800,
      viewportHeight: 600,
    }),
    null
  );
  assert.equal(clampZoom(0.01, 800, 600), 0.05);
});

test('empty-canvas initialization retains the viewport grid-fill scale', () => {
  assert.equal(computeMinZoom(), 0.05);
  assert.equal(computeMinZoom(1100, 700), 0.5);
});

test('fit view can go below the manual zoom floor for unbounded content', () => {
  const viewState = createFitViewState({
    bounds: { x: -50000, y: -2000, width: 100000, height: 4000 },
    viewportWidth: 1000,
    viewportHeight: 600,
    padding: 20,
  });
  const mapped = mapBoundsToViewport(
    { x: -50000, y: -2000, width: 100000, height: 4000 },
    viewState
  );

  assert.ok(viewState.zoom < 0.05);
  assert.ok(mapped.left >= 20 - 1e-9);
  assert.ok(mapped.right <= 980 + 1e-9);
  assert.equal(clampFitZoom(0.0001), 0.001);
  assert.equal(clampZoom(0.0001), 0.05);
});
