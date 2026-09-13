import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  getGraphContentViewport,
  getUnobscuredViewport,
} from '../../src/components/visualizers/Graphs/graphStudio/lib/graphFraming.js';

const viewport = { x: 0, y: 0, width: 600, height: 350 };
const topLegend = { x: 16, y: 16, width: 568, height: 90 };
const bottomCaption = { x: 16, y: 286, width: 160, height: 48 };

test('unmarked and custom overlays retain the existing floating fit policy', () => {
  assert.deepEqual(getUnobscuredViewport(viewport), viewport);
  assert.deepEqual(
    getUnobscuredViewport(viewport, [topLegend, bottomCaption]),
    { x: 188, y: 118, width: 412, height: 232 }
  );
  assert.deepEqual(
    getUnobscuredViewport(viewport, [
      topLegend,
      { ...bottomCaption, dock: 'custom' },
    ]),
    { x: 188, y: 118, width: 412, height: 232 }
  );
});

test('top and bottom docks reserve full bands independent of their order', () => {
  const obstacles = [
    { ...topLegend, dock: 'top' },
    { ...bottomCaption, dock: 'bottom' },
  ];
  const expected = { x: 0, y: 118, width: 600, height: 156 };
  assert.deepEqual(getUnobscuredViewport(viewport, obstacles), expected);
  assert.deepEqual(
    getUnobscuredViewport(viewport, [...obstacles].reverse()),
    expected
  );
});

test('short docked captions do not shift graphs sideways as panel height changes', () => {
  for (const height of [300, 350, 400, 500, 650]) {
    const area = getUnobscuredViewport({ ...viewport, height }, [
      { ...topLegend, dock: 'top' },
      { ...bottomCaption, y: height - 64, dock: 'bottom' },
    ]);
    assert.equal(area.x + area.width / 2, 300);
    assert.equal(area.y, 118);
    assert.equal(area.y + area.height, height - 76);
  }
});

test('multiple docks use the deepest band and respect nonzero viewport origins', () => {
  const shiftedViewport = { x: -50, y: -20, width: 600, height: 400 };
  const obstacles = [
    { x: -34, y: -4, width: 160, height: 32, dock: 'top' },
    { x: 150, y: -4, width: 160, height: 72, dock: 'top' },
    { x: 50, y: 316, width: 180, height: 48, dock: 'bottom' },
    { x: 1000, y: 150, width: 100, height: 80, dock: 'bottom' },
  ];
  const expected = { x: -50, y: 80, width: 600, height: 224 };
  assert.deepEqual(getUnobscuredViewport(shiftedViewport, obstacles), expected);
  assert.deepEqual(
    getUnobscuredViewport(shiftedViewport, [...obstacles].reverse()),
    expected
  );
});

test('overlapping dock bands retain a finite content area inside small viewports', () => {
  for (const height of [40, 100, 160]) {
    const smallViewport = { x: 20, y: 30, width: 320, height };
    const obstacles = [
      { x: 36, y: 30, width: 200, height: 110, dock: 'top' },
      { x: 36, y: height - 20, width: 200, height: 80, dock: 'bottom' },
    ];
    const area = getUnobscuredViewport(smallViewport, obstacles);
    assert.deepEqual(
      area,
      getUnobscuredViewport(smallViewport, [...obstacles].reverse())
    );
    assert.equal(area.x, smallViewport.x);
    assert.equal(area.width, smallViewport.width);
    assert.equal(area.height, Math.min(60, height));
    assert.ok(area.y >= smallViewport.y);
    assert.ok(area.y + area.height <= smallViewport.y + height);
    assert.ok(Object.values(area).every(Number.isFinite));
  }
});

test('floating custom overlays are avoided within the docked content area', () => {
  const floating = { x: 250, y: 175, width: 100, height: 60 };
  const obstacles = [
    { ...topLegend, dock: 'top' },
    floating,
    { ...bottomCaption, dock: 'bottom' },
  ];
  const area = getUnobscuredViewport(viewport, obstacles);
  assert.ok(area.y >= 118 && area.y + area.height <= 274);
  assert.ok(
    area.x + area.width <= floating.x - 12 ||
      area.x >= floating.x + floating.width + 12 ||
      area.y + area.height <= floating.y - 12 ||
      area.y >= floating.y + floating.height + 12
  );
  assert.deepEqual(
    area,
    getUnobscuredViewport(viewport, [obstacles[2], obstacles[1], obstacles[0]])
  );
});

test('SVG adapter reads explicit dock attributes and translated overlay geometry', () => {
  const overlay = ({ x, y, width, height, dock }) => ({
    getBBox: () => ({ x: 0, y: 0, width, height }),
    transform: {
      baseVal: { consolidate: () => ({ matrix: { e: x, f: y } }) },
    },
    getAttribute: name =>
      name === 'data-overlay-dock' ? (dock ?? null) : null,
  });
  const svg = {
    querySelectorAll: () => [
      overlay({ ...topLegend, dock: 'top' }),
      overlay({ ...bottomCaption, dock: 'bottom' }),
    ],
  };
  assert.deepEqual(getGraphContentViewport(svg, viewport), {
    x: 0,
    y: 118,
    width: 600,
    height: 156,
  });
});
