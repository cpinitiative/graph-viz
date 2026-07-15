import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  exportProjectJson,
  validateProjectPayload,
} from '../../src/components/visualizers/Graphs/graphStudio/lib/projectJson.js';
import { buildTimelineSteps } from '../../src/components/visualizers/Graphs/graphStudio/lib/scriptTrace.js';
import { resolveFrameGraph } from '../../src/components/visualizers/Graphs/graphStudio/lib/temporalGraphState.js';

const createProjectPayload = () => ({
  format: 'graph-viz-project',
  version: 1,
  graph: {
    nodes: [
      {
        id: 'A',
        label: 'Alpha',
        x: 100,
        y: 120,
        size: 28,
        visible: true,
      },
      { id: 'B', label: 'Beta', x: 300, y: 120, visible: true },
    ],
    edges: [
      {
        id: 'e1',
        from: 'A',
        to: 'B',
        label: 'Base edge',
        weight: 7,
        directed: true,
        routing: 'straight',
        curve: 24,
        width: 3,
        visible: true,
      },
    ],
  },
  timeline: {
    currentFrame: 0,
    steps: [
      {
        id: 'step-0',
        description: 'Imported frame',
        durationMs: 600,
        nodeOverrides: {},
        edgeOverrides: {},
      },
    ],
  },
  settings: {},
});

test('project import drops unsupported node override keys without mutating input', () => {
  const payload = createProjectPayload();
  payload.timeline.steps[0].nodeOverrides.A = {
    status: 'active',
    color: '#FF0000',
    visible: false,
    id: 'wrong-id',
    label: 'Illegal frame label',
    x: 999,
    y: 888,
    size: 99,
  };
  const original = structuredClone(payload);

  const imported = validateProjectPayload(payload);

  assert.deepEqual(imported.timeline.steps[0].nodeOverrides, {
    A: { status: 'active', color: '#FF0000', visible: false },
  });
  assert.deepEqual(payload, original);
});

test('project import drops unsupported edge override keys and keeps edge status', () => {
  const payload = createProjectPayload();
  payload.timeline.steps[0].edgeOverrides.e1 = {
    status: 'visited',
    color: '#00FF00',
    visible: false,
    id: 'wrong-id',
    from: 'B',
    to: 'A',
    label: 'Illegal frame label',
    weight: 100,
    directed: false,
    routing: 'bezier',
    curve: 80,
    width: 10,
  };

  const imported = validateProjectPayload(payload);

  assert.deepEqual(imported.timeline.steps[0].edgeOverrides, {
    e1: { status: 'visited', color: '#00FF00', visible: false },
  });
});

test('frame resolution ignores unsupported node override keys', () => {
  const baseGraph = createProjectPayload().graph;
  const resolved = resolveFrameGraph(baseGraph, {
    nodeOverrides: {
      A: {
        label: 'Wrong',
        x: 500,
        y: 600,
        size: 100,
        status: 'active',
        color: '#F59E0B',
        visible: false,
      },
    },
  });
  const node = resolved.nodes.find(item => item.id === 'A');

  assert.equal(node.label, 'Alpha');
  assert.equal(node.x, 100);
  assert.equal(node.y, 120);
  assert.equal(node.size, 28);
  assert.equal(node.status, 'active');
  assert.equal(node.color, '#F59E0B');
  assert.equal(node.visible, false);
});

test('frame resolution ignores unsupported edge override keys', () => {
  const baseGraph = createProjectPayload().graph;
  const resolved = resolveFrameGraph(baseGraph, {
    edgeOverrides: {
      e1: {
        from: 'B',
        to: 'A',
        label: 'Wrong',
        weight: 99,
        directed: false,
        routing: 'bezier',
        curve: 80,
        width: 10,
        status: 'visited',
        color: '#F59E0B',
        visible: false,
      },
    },
  });
  const edge = resolved.edges.find(item => item.id === 'e1');

  assert.equal(edge.from, 'A');
  assert.equal(edge.to, 'B');
  assert.equal(edge.label, 'Base edge');
  assert.equal(edge.weight, 7);
  assert.equal(edge.directed, true);
  assert.equal(edge.routing, 'straight');
  assert.equal(edge.curve, 24);
  assert.equal(edge.width, 3);
  assert.equal(edge.status, 'visited');
  assert.equal(edge.color, '#F59E0B');
  assert.equal(edge.visible, false);
});

test('script patch frames cannot bypass the temporal override schema', () => {
  const steps = buildTimelineSteps([
    {
      type: 'patch',
      description: 'Malformed patch',
      nodeOverrides: {
        A: {
          color: '#FF0000',
          visible: false,
          label: 'Illegal',
          x: 999,
        },
      },
      edgeOverrides: {
        e1: {
          status: 'active',
          color: '#00FF00',
          weight: 99,
          directed: false,
        },
      },
    },
  ]);

  assert.deepEqual(steps[1].nodeOverrides, {
    A: { color: '#FF0000', visible: false },
  });
  assert.deepEqual(steps[1].edgeOverrides, {
    e1: { status: 'active', color: '#00FF00' },
  });
});

test('project export strips unsupported override keys without mutating state', () => {
  const payload = createProjectPayload();
  const steps = payload.timeline.steps;
  steps[0].nodeOverrides.A = {
    color: '#FF0000',
    label: 'Illegal',
    x: 999,
  };
  steps[0].edgeOverrides.e1 = {
    visible: false,
    weight: 99,
    directed: false,
  };
  const original = structuredClone(steps);

  const exported = exportProjectJson({
    baseGraph: payload.graph,
    steps,
    currentFrame: 0,
    settings: {},
  });

  assert.deepEqual(exported.timeline.steps[0].nodeOverrides, {
    A: { color: '#FF0000' },
  });
  assert.deepEqual(exported.timeline.steps[0].edgeOverrides, {
    e1: { visible: false },
  });
  assert.deepEqual(steps, original);
});
