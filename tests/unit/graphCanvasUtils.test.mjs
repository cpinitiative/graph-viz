import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  buildEdgePath,
  clampFitZoom,
  clampZoom,
  computeMinZoom,
  createFitViewState,
  cubicBezierPoint,
  getAvoidanceShift,
  getWheelZoomFactor,
  recenterViewStateForViewportResize,
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

test('viewport resize keeps the same world point at the canvas center', () => {
  const viewState = { x: -310, y: -180, zoom: 0.8 };
  const previousViewport = { width: 640, height: 420 };
  const nextViewport = { width: 980, height: 600 };
  const resized = recenterViewStateForViewportResize({
    viewState,
    previousViewport,
    nextViewport,
  });

  const previousWorldCenter = {
    x: (previousViewport.width / 2 - viewState.x) / viewState.zoom,
    y: (previousViewport.height / 2 - viewState.y) / viewState.zoom,
  };
  const nextWorldCenter = {
    x: (nextViewport.width / 2 - resized.x) / resized.zoom,
    y: (nextViewport.height / 2 - resized.y) / resized.zoom,
  };

  assert.deepEqual(nextWorldCenter, previousWorldCenter);
  assert.equal(resized.zoom, viewState.zoom);
  assert.equal(
    recenterViewStateForViewportResize({
      viewState,
      previousViewport: { width: 0, height: 420 },
      nextViewport,
    }),
    null
  );
});

test('wheel zoom scales smoothly with trackpad delta magnitude', () => {
  const tinyZoomIn = getWheelZoomFactor({ deltaY: -10 });
  const largeZoomIn = getWheelZoomFactor({ deltaY: -120 });
  const tinyZoomOut = getWheelZoomFactor({ deltaY: 10 });

  assert.ok(tinyZoomIn > 1);
  assert.ok(largeZoomIn > tinyZoomIn);
  assert.ok(tinyZoomOut < 1);
  assert.ok(Math.abs(tinyZoomIn - 1) < 0.02);
  assert.equal(getWheelZoomFactor({ deltaY: 0 }), 1);
  assert.equal(
    getWheelZoomFactor({ deltaY: -10000 }),
    getWheelZoomFactor({ deltaY: -240 })
  );
});

test('Bezier avoidance preserves both bend directions and clears a middle node', () => {
  const from = { id: 'A', x: 0, y: 0 };
  const to = { id: 'B', x: 400, y: 0 };
  const blocker = { id: 'C', x: 200, y: 0 };
  for (const [id, side] of [
    ['e0', -1],
    ['e1', 1],
  ]) {
    const options = {
      edge: { id, from: from.id, to: to.id, directed: true },
      from,
      to,
      routing: 'bezier',
      edgeCurvature: 46,
      nodeRadius: 32,
    };
    const original = buildEdgePath({ ...options, nodes: [from, to] });
    const avoided = buildEdgePath({ ...options, nodes: [from, to, blocker] });
    assert.deepEqual(avoided.pathPoints[0], original.pathPoints[0]);
    assert.deepEqual(avoided.pathPoints.at(-1), original.pathPoints.at(-1));
    const originalMiddle = cubicBezierPoint(...original.pathPoints, 0.5);
    const avoidedMiddle = cubicBezierPoint(...avoided.pathPoints, 0.5);
    assert.equal(Math.sign(avoidedMiddle.y), side);
    assert.ok(Math.abs(avoidedMiddle.y) > Math.abs(originalMiddle.y));
    for (let sample = 0; sample <= 200; sample += 1) {
      const point = cubicBezierPoint(...avoided.pathPoints, sample / 200);
      assert.ok(
        Math.hypot(point.x - blocker.x, point.y - blocker.y) >
          options.nodeRadius + 4,
        `${id} must clear the intermediate node on its chosen side`
      );
    }
  }
});

test('avoidance retains unobstructed shifts and does not change straight edges or loops', () => {
  const from = { id: 'A', x: 0, y: 0 };
  const to = { id: 'B', x: 400, y: 0 };
  const edge = { id: 'e0', from: from.id, to: to.id, directed: true };
  const segment = { x1: 30, y1: 0, x2: 368, y2: 0 };
  for (const shift of [-46, 0, 46]) {
    assert.equal(
      getAvoidanceShift(segment, edge, [from, to], shift, 32),
      shift
    );
  }
  for (const target of [to, from]) {
    const options = {
      edge: { ...edge, to: target.id },
      from,
      to: target,
      routing: 'straight',
      edgeCurvature: 46,
      nodeRadius: 32,
    };
    assert.deepEqual(
      buildEdgePath({
        ...options,
        nodes: [from, to, { id: 'C', x: 200, y: 0 }],
      }),
      buildEdgePath({ ...options, nodes: [from, to] })
    );
  }
});
