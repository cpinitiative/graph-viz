import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  exportEdgeListText,
  parseEdgeListText,
} from '../../src/components/visualizers/Graphs/graphStudio/graphStudioUtils.js';

const getTopology = graph =>
  graph.edges.map(edge => ({
    from: Number(edge.from),
    to: Number(edge.to),
    label: edge.label,
  }));

test('the Multi-Edge / Loop export is valid strict input', () => {
  const graph = {
    nodes: [0, 1, 2].map(id => ({ id })),
    edges: [
      { from: 0, to: 1, label: 'Path 1' },
      { from: 0, to: 1, label: 'Path 2' },
      { from: 0, to: 1, label: 'Path 3' },
      { from: 1, to: 1, label: 'Loop' },
      { from: 1, to: 2, label: 'To C' },
      { from: 2, to: 0, label: 'Back to A' },
    ],
  };

  const exported = exportEdgeListText(graph);
  assert.equal(
    exported,
    ['3 6', '0 1', '0 1', '0 1', '1 1', '1 2', '2 0'].join('\n')
  );
  assert.deepEqual(getTopology(parseEdgeListText(exported).graph), [
    { from: 0, to: 1, label: '' },
    { from: 0, to: 1, label: '' },
    { from: 0, to: 1, label: '' },
    { from: 1, to: 1, label: '' },
    { from: 1, to: 2, label: '' },
    { from: 2, to: 0, label: '' },
  ]);
});

test('edge-list export remaps node IDs and preserves only parser-safe weights', () => {
  const graph = {
    nodes: [{ id: 'A' }, { id: 42 }, { id: 'tail' }],
    edges: [
      { from: 'A', to: 42, label: '-3.5' },
      { from: 42, to: 'tail', label: '.75' },
      { from: 'tail', to: 'A', label: '1e3' },
      { from: 'A', to: 'missing', label: '2' },
    ],
  };

  const exported = exportEdgeListText(graph);
  assert.equal(exported, ['3 3', '0 1 -3.5', '1 2 .75', '2 0'].join('\n'));
  assert.deepEqual(getTopology(parseEdgeListText(exported).graph), [
    { from: 0, to: 1, label: '-3.5' },
    { from: 1, to: 2, label: '.75' },
    { from: 2, to: 0, label: '' },
  ]);
});
