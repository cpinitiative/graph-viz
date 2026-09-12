import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createLocalDraftEnvelope,
  parseLocalDraftText,
} from '../../src/components/visualizers/Graphs/graphStudio/lib/localDraft.js';
import {
  exportProjectJson,
  parseProjectJson,
} from '../../src/components/visualizers/Graphs/graphStudio/lib/projectJson.js';
import { buildTimelineSteps } from '../../src/components/visualizers/Graphs/graphStudio/lib/scriptTrace.js';
import { resolveFrameGraph } from '../../src/components/visualizers/Graphs/graphStudio/lib/temporalGraphState.js';
import { NODE_STATES } from '../../src/components/visualizers/Graphs/graphStudio/lib/visualProperties.js';
import { resolveGraphVisualStates } from '../../src/components/visualizers/Graphs/graphStudio/lib/visualStates.js';

const visualStates = [
  { id: 'seed-node', kind: 'node', label: 'Original node', color: '#123456' },
  { id: 'seed-edge', kind: 'edge', label: 'Original edge', color: '#654321' },
];
const graph = {
  nodes: ['default', 'active', 'queued', 'visited', 'discarded'].map(
    (status, id) => ({
      id,
      label: status,
      x: id * 100 + 50,
      y: 100,
      stateId: 'seed-node',
      color: '#123456',
      visible: true,
    })
  ),
  edges: [
    {
      id: 'e0',
      from: 0,
      to: 1,
      stateId: 'seed-edge',
      color: '#654321',
      visible: true,
    },
  ],
};

const appearance = (baseGraph, steps, states) => {
  const resolved = resolveGraphVisualStates(
    resolveFrameGraph(baseGraph, steps.at(-1)),
    states
  );
  return {
    nodes: resolved.nodes.map(node => ({
      id: node.id,
      status: node.status,
      stateId: node.stateId,
      color: node.color,
      annotation: node.annotation,
      visible: node.visible,
    })),
    edges: resolved.edges.map(edge => ({
      id: edge.id,
      status: edge.status,
      stateId: edge.stateId,
      color: edge.color,
      visible: edge.visible,
    })),
  };
};

test('script statuses override inherited states and survive export and draft recovery', () => {
  const statuses = graph.nodes.map(node => node.label);
  const steps = buildTimelineSteps([
    ...statuses.map((status, id) => ({ type: 'node', id, status })),
    { type: 'edge', id: 'e0', color: '#0af' },
  ]);
  const expected = appearance(graph, steps, visualStates);
  assert.deepEqual(
    expected.nodes.map(node => node.color),
    statuses.map(status => NODE_STATES[status].color)
  );
  assert.ok(expected.nodes.every(node => node.stateId === ''));
  assert.equal(expected.edges[0].stateId, '');
  assert.equal(expected.edges[0].color, '#0af');

  const payload = exportProjectJson({
    baseGraph: graph,
    steps,
    currentFrame: steps.length - 1,
    settings: { visualStates },
  });
  const imported = parseProjectJson(JSON.stringify(payload));
  const restored = parseLocalDraftText(
    JSON.stringify(createLocalDraftEnvelope({ project: payload }))
  ).project;
  for (const project of [imported, restored]) {
    assert.deepEqual(
      appearance(
        project.graph,
        project.timeline.steps,
        project.settings.visualStates
      ),
      expected
    );
    assert.equal(project.settings.visualStates.length, visualStates.length);
  }
});

test('partial node and edge patches retain earlier annotations and visibility', () => {
  const trace = [
    {
      type: 'patch',
      nodeOverrides: {
        0: { status: 'queued', annotation: 'dist=2', visible: false },
      },
      edgeOverrides: {
        e0: { status: 'rejected', color: '#DC2626', visible: false },
      },
    },
    {
      type: 'patch',
      nodeOverrides: { 0: { color: '#22C55E' } },
      edgeOverrides: { e0: { color: '#3B82F6' } },
    },
  ];
  const original = structuredClone(trace);
  const steps = buildTimelineSteps(trace);
  assert.deepEqual(steps[2].nodeOverrides[0], {
    status: 'queued',
    annotation: 'dist=2',
    visible: false,
    stateId: '',
    color: '#22C55E',
  });
  assert.deepEqual(steps[2].edgeOverrides.e0, {
    status: 'rejected',
    visible: false,
    stateId: '',
    color: '#3B82F6',
  });
  assert.equal(steps[1].nodeOverrides[0].color, NODE_STATES.queued.color);
  assert.equal(steps[1].edgeOverrides.e0.color, '#DC2626');
  assert.deepEqual(trace, original);
});

test('raw commands replace earlier semantic state while annotation patches retain it', () => {
  const steps = buildTimelineSteps([
    {
      type: 'patch',
      nodeOverrides: { 0: { stateId: 'seed-node' } },
      edgeOverrides: { e0: { stateId: 'seed-edge' } },
    },
    { type: 'patch', nodeOverrides: { 0: { annotation: 'dist=2' } } },
    { type: 'node', id: 0, status: 'visited' },
    { type: 'edge', id: 'e0', color: '#F59E0B' },
  ]);
  assert.equal(steps[2].nodeOverrides[0].stateId, 'seed-node');
  assert.equal(steps[2].nodeOverrides[0].annotation, 'dist=2');
  const last = appearance(graph, steps, visualStates);
  assert.equal(last.nodes[0].color, NODE_STATES.visited.color);
  assert.equal(last.nodes[0].stateId, '');
  assert.equal(last.nodes[0].annotation, 'dist=2');
  assert.equal(last.edges[0].stateId, '');
  assert.equal(last.edges[0].color, '#F59E0B');
});

test('status patches select their palette and honor an explicit color or state', () => {
  const steps = buildTimelineSteps([
    { type: 'node', id: 0, status: 'active', color: '#FF0000' },
    { type: 'patch', nodeOverrides: { 0: { status: 'visited' } } },
    {
      type: 'patch',
      nodeOverrides: { 0: { status: 'queued', color: '#0af' } },
    },
    {
      type: 'patch',
      nodeOverrides: { 0: { stateId: 'seed-node', color: '#000000' } },
    },
  ]);
  assert.equal(steps[2].nodeOverrides[0].color, NODE_STATES.visited.color);
  assert.equal(steps[3].nodeOverrides[0].color, '#0af');
  assert.equal(steps[4].nodeOverrides[0].stateId, 'seed-node');
  assert.equal(
    appearance(graph, steps, visualStates).nodes[0].color,
    '#123456'
  );
});
