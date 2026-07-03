import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  EDGE_ROUTING,
  NODE_RADIUS,
} from '../../src/components/visualizers/Graphs/graphStudio/constants.js';
import { getEdgeRenderData } from '../../src/components/visualizers/Graphs/graphStudio/lib/edgeRenderData.js';
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
    id: 'eNotShown',
    from: 'A',
    to: 'C',
    directed: true,
    label: 'not shown',
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

test('source node not shown removes incident edge effectively', () => {
  const graph = resolveFrameGraph(
    { nodes, edges },
    { nodeOverrides: { A: { visible: false } }, edgeOverrides: {} }
  );
  const nodeMap = new Map(graph.nodes.map(node => [String(node.id), node]));

  assert.equal(isEdgeEffectivelyVisible(graph.edges[1], nodeMap), false);
});

test('target node not shown removes incident edge effectively', () => {
  const graph = resolveFrameGraph(
    { nodes: nodes.map(node => ({ ...node, visible: true })), edges },
    { nodeOverrides: { C: { visible: false } }, edgeOverrides: {} }
  );
  const nodeMap = new Map(graph.nodes.map(node => [String(node.id), node]));

  assert.equal(isEdgeEffectivelyVisible(graph.edges[1], nodeMap), false);
});

test('explicitly not-shown edge stays not shown when endpoints are visible', () => {
  const visibleNodes = nodes.map(node => ({ ...node, visible: true }));
  const graph = resolveFrameGraph(
    { nodes: visibleNodes, edges },
    { nodeOverrides: {}, edgeOverrides: { eAC: { visible: false } } }
  );
  const nodeMap = new Map(graph.nodes.map(node => [String(node.id), node]));

  assert.equal(isEdgeEffectivelyVisible(graph.edges[1], nodeMap), false);
});

test('edge reappears when endpoints are visible again and edge is shown', () => {
  const visibleNodes = nodes.map(node => ({ ...node, visible: true }));
  const baseGraph = { nodes: visibleNodes, edges };
  const notShownFrame = resolveFrameGraph(baseGraph, {
    nodeOverrides: { C: { visible: false } },
    edgeOverrides: {},
  });
  const visibleFrame = resolveFrameGraph(baseGraph, {
    nodeOverrides: {},
    edgeOverrides: {},
  });
  const notShownNodeMap = new Map(
    notShownFrame.nodes.map(node => [String(node.id), node])
  );
  const visibleNodeMap = new Map(
    visibleFrame.nodes.map(node => [String(node.id), node])
  );

  assert.equal(
    isEdgeEffectivelyVisible(notShownFrame.edges[1], notShownNodeMap),
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

test('explicitly shown edge still does not render if endpoint node is not shown', () => {
  const visibleNodes = nodes.map(node => ({ ...node, visible: true }));
  const step = {
    nodeOverrides: { B: { visible: false } },
    edgeOverrides: { eAB: { visible: true } },
  };
  const graph = resolveFrameGraph({ nodes: visibleNodes, edges }, step);
  const nodeMap = new Map(graph.nodes.map(node => [String(node.id), node]));

  assert.equal(isEdgeEffectivelyVisible(graph.edges[0], nodeMap), false);
  assert.equal(step.edgeOverrides.eAB.visible, true);
});

test('edge render data omits incident edge when endpoint node is not shown', () => {
  const graph = resolveFrameGraph(
    { nodes: nodes.map(node => ({ ...node, visible: true })), edges },
    { nodeOverrides: { B: { visible: false } }, edgeOverrides: {} }
  );
  const nodeMap = new Map(graph.nodes.map(node => [String(node.id), node]));
  const renderData = getEdgeRenderData({
    edges: graph.edges,
    nodes: graph.nodes,
    nodeMap,
    edgeRouting: EDGE_ROUTING.straight,
    edgeCurvature: 46,
    nodeRadius: NODE_RADIUS,
  });

  assert.deepEqual(
    renderData.map(item => item.edge.id),
    ['eAC']
  );
});
