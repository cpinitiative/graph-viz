import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  isEdgeEffectivelyVisible,
  isNodeVisible,
} from '../../src/components/visualizers/Graphs/graphStudio/lib/effectiveVisibility.js';
import { resolveFrameGraph } from '../../src/components/visualizers/Graphs/graphStudio/lib/temporalGraphState.js';

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

test('hidden source node hides incident edge effectively', () => {
  const graph = resolveFrameGraph(
    { nodes, edges },
    { nodeOverrides: { A: { visible: false } }, edgeOverrides: {} }
  );
  const nodeMap = new Map(graph.nodes.map(node => [String(node.id), node]));

  assert.equal(isEdgeEffectivelyVisible(graph.edges[1], nodeMap), false);
});

test('hidden target node hides incident edge effectively', () => {
  const graph = resolveFrameGraph(
    { nodes: nodes.map(node => ({ ...node, visible: true })), edges },
    { nodeOverrides: { C: { visible: false } }, edgeOverrides: {} }
  );
  const nodeMap = new Map(graph.nodes.map(node => [String(node.id), node]));

  assert.equal(isEdgeEffectivelyVisible(graph.edges[1], nodeMap), false);
});

test('explicitly hidden edge stays hidden when endpoints are visible', () => {
  const visibleNodes = nodes.map(node => ({ ...node, visible: true }));
  const graph = resolveFrameGraph(
    { nodes: visibleNodes, edges },
    { nodeOverrides: {}, edgeOverrides: { eAC: { visible: false } } }
  );
  const nodeMap = new Map(graph.nodes.map(node => [String(node.id), node]));

  assert.equal(isEdgeEffectivelyVisible(graph.edges[1], nodeMap), false);
});

test('edge reappears when endpoints are visible again and edge is not hidden', () => {
  const visibleNodes = nodes.map(node => ({ ...node, visible: true }));
  const baseGraph = { nodes: visibleNodes, edges };
  const hiddenFrame = resolveFrameGraph(baseGraph, {
    nodeOverrides: { C: { visible: false } },
    edgeOverrides: {},
  });
  const visibleFrame = resolveFrameGraph(baseGraph, {
    nodeOverrides: {},
    edgeOverrides: {},
  });
  const hiddenNodeMap = new Map(
    hiddenFrame.nodes.map(node => [String(node.id), node])
  );
  const visibleNodeMap = new Map(
    visibleFrame.nodes.map(node => [String(node.id), node])
  );

  assert.equal(
    isEdgeEffectivelyVisible(hiddenFrame.edges[1], hiddenNodeMap),
    false
  );
  assert.equal(
    isEdgeEffectivelyVisible(visibleFrame.edges[1], visibleNodeMap),
    true
  );
});

test('effective edge visibility does not write derived edge overrides', () => {
  const step = {
    nodeOverrides: { B: { visible: false } },
    edgeOverrides: {},
  };
  const graph = resolveFrameGraph({ nodes, edges }, step);
  const nodeMap = new Map(graph.nodes.map(node => [String(node.id), node]));

  assert.equal(isEdgeEffectivelyVisible(graph.edges[0], nodeMap), false);
  assert.deepEqual(step.edgeOverrides, {});
  assert.equal(edges[0].visible, true);
});
