import assert from 'node:assert/strict';
import { test } from 'node:test';
import { forceDirectedLayout } from '../../src/components/visualizers/Graphs/graphStudio/lib/graphLayouts.js';

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

const getAverageRadius = graph => {
  const center = graph.nodes.reduce(
    (sum, node) => ({
      x: sum.x + node.x / graph.nodes.length,
      y: sum.y + node.y / graph.nodes.length,
    }),
    { x: 0, y: 0 }
  );
  return (
    graph.nodes.reduce(
      (sum, node) => sum + Math.hypot(node.x - center.x, node.y - center.y),
      0
    ) / graph.nodes.length
  );
};

test('force strength visibly changes force-directed spread', () => {
  const lowStrength = 0.2;
  const highStrength = 2;
  const low = forceDirectedLayout(
    sampleGraph,
    Math.round(70 + 35 * lowStrength),
    lowStrength
  );
  const high = forceDirectedLayout(
    sampleGraph,
    Math.round(70 + 35 * highStrength),
    highStrength
  );

  assert.ok(
    getAverageRadius(high) > getAverageRadius(low) + 450,
    'high strength should create a visibly wider force layout'
  );
});
