import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  FORCE_LAYOUT_ITERATIONS,
  FORCE_STRENGTH_MAX,
  FORCE_STRENGTH_MIN,
  forceDirectedLayout,
  getForceLayoutOptions,
  normalizeForceStrength,
} from '../../src/components/visualizers/Graphs/graphStudio/lib/graphLayouts.js';

const sampleGraph = {
  nodes: [
    { id: '0', label: '0', x: 520, y: 420, visible: true },
    { id: '1', label: '1', x: 700, y: 360, visible: true },
    { id: '2', label: '2', x: 900, y: 430, visible: true },
    { id: '3', label: '3', x: 780, y: 600, visible: true },
    { id: '4', label: '4', x: 600, y: 620, visible: true },
  ],
  edges: [
    { id: 'e0', from: '0', to: '1', visible: true },
    { id: 'e1', from: '1', to: '2', visible: true },
    { id: 'e2', from: '0', to: '3', visible: true },
    { id: 'e3', from: '3', to: '4', visible: true },
  ],
};

const getPairDistances = graph => {
  const distances = [];
  graph.nodes.forEach((node, index) => {
    graph.nodes.slice(index + 1).forEach(otherNode => {
      distances.push(Math.hypot(node.x - otherNode.x, node.y - otherNode.y));
    });
  });
  return distances;
};

const getMedianPairDistance = graph => {
  const distances = getPairDistances(graph).sort((left, right) => left - right);
  const middle = Math.floor(distances.length / 2);
  return distances.length % 2 === 0
    ? (distances[middle - 1] + distances[middle]) / 2
    : distances[middle];
};

const getMaxNodeMovement = (before, after) =>
  Math.max(
    ...before.nodes.map((node, index) =>
      Math.hypot(node.x - after.nodes[index].x, node.y - after.nodes[index].y)
    )
  );

const assertFiniteAndInBounds = graph => {
  graph.nodes.forEach(node => {
    assert.equal(Number.isFinite(node.x), true);
    assert.equal(Number.isFinite(node.y), true);
    assert.ok(node.x >= 30 && node.x <= 2170);
    assert.ok(node.y >= 30 && node.y <= 1370);
  });
};

test('force options normalize strength around one fixed iteration budget', () => {
  assert.equal(normalizeForceStrength(Number.NaN), 1);
  assert.equal(normalizeForceStrength(-100), FORCE_STRENGTH_MIN);
  assert.equal(normalizeForceStrength(100), FORCE_STRENGTH_MAX);
  assert.deepEqual(getForceLayoutOptions(1.2), {
    strength: 1.2,
    iterations: FORCE_LAYOUT_ITERATIONS,
  });
  assert.equal(
    getForceLayoutOptions(FORCE_STRENGTH_MIN).iterations,
    getForceLayoutOptions(FORCE_STRENGTH_MAX).iterations
  );
});

test('force layout is deterministic and separates coincident nodes', () => {
  const coincidentGraph = {
    nodes: ['a', 'b', 'c', 'd'].map(id => ({
      id,
      label: id,
      x: 500,
      y: 500,
      visible: true,
    })),
    edges: [
      { id: 'ab', from: 'a', to: 'b' },
      { id: 'bc', from: 'b', to: 'c' },
      { id: 'cd', from: 'c', to: 'd' },
    ],
  };
  const options = getForceLayoutOptions(1);
  const first = forceDirectedLayout(coincidentGraph, options);
  const second = forceDirectedLayout(coincidentGraph, options);

  assert.deepEqual(first, second);
  assert.ok(Math.min(...getPairDistances(first)) > 44);
  assertFiniteAndInBounds(first);
});

test('force layout preserves the legacy strength argument overload', () => {
  const first = forceDirectedLayout(sampleGraph, 70, 2);
  assert.deepEqual(first, forceDirectedLayout(sampleGraph, 70, 2));
  assert.notDeepEqual(first, forceDirectedLayout(sampleGraph, 1, 2));
  assert.notDeepEqual(first, forceDirectedLayout(sampleGraph, 70, 0.2));
});

test('force strength increases median spacing without invalid coordinates', () => {
  const low = forceDirectedLayout(sampleGraph, getForceLayoutOptions(0.2));
  const medium = forceDirectedLayout(sampleGraph, getForceLayoutOptions(1));
  const high = forceDirectedLayout(sampleGraph, getForceLayoutOptions(2));

  const lowSpacing = getMedianPairDistance(low);
  const mediumSpacing = getMedianPairDistance(medium);
  const highSpacing = getMedianPairDistance(high);

  assert.ok(lowSpacing < mediumSpacing);
  assert.ok(mediumSpacing < highSpacing);
  assert.ok(highSpacing > lowSpacing * 1.5);
  [low, medium, high].forEach(assertFiniteAndInBounds);
});

test('repeating a settled force pass remains stable', () => {
  for (const strength of [0.2, 1, 2]) {
    const options = getForceLayoutOptions(strength);
    const first = forceDirectedLayout(sampleGraph, options);
    const second = forceDirectedLayout(first, options);

    assert.ok(
      getMaxNodeMovement(first, second) < 2,
      `strength ${strength} should not materially drift on a repeated pass`
    );
    assertFiniteAndInBounds(second);
  }
});
