import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  isEdgeEffectivelyVisible,
  isNodeVisible,
} from '../../src/components/visualizers/Graphs/graphStudio/lib/effectiveVisibility.js';

const nodes = [
  { id: 'A', label: 'A', x: 100, y: 100, visible: true },
  { id: 'B', label: 'B', x: 240, y: 100, visible: false },
  { id: 'C', label: 'C', x: 380, y: 100, visible: true },
];

const edges = [
  {
    id: 'eAB',
    from: 'A',
    to: 'B',
    directed: true,
    label: 'ab',
    color: '#64748b',
    visible: true,
  },
  {
    id: 'eAC',
    from: 'A',
    to: 'C',
    directed: true,
    label: 'ac',
    color: '#64748b',
    visible: true,
  },
  {
    id: 'eHidden',
    from: 'A',
    to: 'C',
    directed: true,
    label: 'hidden',
    color: '#64748b',
    visible: false,
  },
];

test('effective edge visibility requires visible edge and visible endpoints', () => {
  const nodeMap = new Map(nodes.map(node => [String(node.id), node]));

  assert.equal(isNodeVisible(nodes[1]), false);
  assert.equal(isEdgeEffectivelyVisible(edges[0], nodeMap), false);
  assert.equal(isEdgeEffectivelyVisible(edges[1], nodeMap), true);
  assert.equal(isEdgeEffectivelyVisible(edges[2], nodeMap), false);
  assert.equal(
    isEdgeEffectivelyVisible({ ...edges[1], to: 'missing' }, nodeMap),
    false
  );
});
