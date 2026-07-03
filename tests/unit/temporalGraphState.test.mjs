import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  applyFrameOverride,
  applyPropertyToAllFrames,
  applyTemporalVisibilityFromFrame,
  applyVisibilityFromFrame,
  applyVisibilityToFrame,
  deleteObjectsFromProject,
  hasFrameOverride,
  removeFrameOverrideProperties,
  resolveFrameGraph,
} from '../../src/components/visualizers/Graphs/graphStudio/lib/temporalGraphState.js';

const baseGraph = {
  nodes: [
    { id: 'A', label: 'A', x: 100, y: 100, visible: true },
    { id: 'B', label: 'B', x: 240, y: 100, visible: true },
    { id: 'C', label: 'C', x: 380, y: 100, visible: true },
  ],
  edges: [
    {
      id: 'e1',
      from: 'A',
      to: 'C',
      directed: false,
      label: '',
      color: '#64748b',
      visible: true,
    },
  ],
};

test('resolves node and edge visibility overrides for a frame', () => {
  const frameGraph = resolveFrameGraph(baseGraph, {
    nodeOverrides: { C: { visible: false } },
    edgeOverrides: { e1: { visible: false } },
  });

  assert.equal(frameGraph.nodes.find(node => node.id === 'C').visible, false);
  assert.equal(frameGraph.edges.find(edge => edge.id === 'e1').visible, false);
});

test('new nodes are hidden before the insertion frame and visible onward', () => {
  const steps = [
    { id: 'frame-1', nodeOverrides: {}, edgeOverrides: {} },
    { id: 'frame-2', nodeOverrides: {}, edgeOverrides: {} },
    { id: 'frame-3', nodeOverrides: {}, edgeOverrides: {} },
  ];
  const nextSteps = applyTemporalVisibilityFromFrame(steps, 'node', 'C', 1);

  assert.equal(nextSteps[0].nodeOverrides.C.visible, false);
  assert.equal(nextSteps[1].nodeOverrides.C, undefined);
  assert.equal(nextSteps[2].nodeOverrides.C, undefined);
});

test('new edges are hidden before the insertion frame and visible onward', () => {
  const steps = [
    { id: 'frame-1', nodeOverrides: {}, edgeOverrides: {} },
    { id: 'frame-2', nodeOverrides: {}, edgeOverrides: {} },
    { id: 'frame-3', nodeOverrides: {}, edgeOverrides: {} },
  ];
  const nextSteps = applyTemporalVisibilityFromFrame(steps, 'edge', 'e2', 2);

  assert.equal(nextSteps[0].edgeOverrides.e2.visible, false);
  assert.equal(nextSteps[1].edgeOverrides.e2.visible, false);
  assert.equal(nextSteps[2].edgeOverrides.e2, undefined);
});

test('hide this frame only changes the current frame', () => {
  const steps = [
    { id: 'frame-1', nodeOverrides: {}, edgeOverrides: {} },
    { id: 'frame-2', nodeOverrides: {}, edgeOverrides: {} },
    { id: 'frame-3', nodeOverrides: {}, edgeOverrides: {} },
  ];
  const nextSteps = applyVisibilityToFrame({
    baseGraph,
    steps,
    objectType: 'node',
    objectId: 'B',
    frameIndex: 1,
    visible: false,
  });

  assert.equal(nextSteps[0].nodeOverrides.B, undefined);
  assert.equal(nextSteps[1].nodeOverrides.B.visible, false);
  assert.equal(nextSteps[2].nodeOverrides.B, undefined);
});

test('hide from this frame onward changes current and later frames only', () => {
  const steps = [
    { id: 'frame-1', nodeOverrides: {}, edgeOverrides: {} },
    { id: 'frame-2', nodeOverrides: {}, edgeOverrides: {} },
    { id: 'frame-3', nodeOverrides: {}, edgeOverrides: {} },
  ];
  const nextSteps = applyVisibilityFromFrame({
    baseGraph,
    steps,
    objectType: 'node',
    objectId: 'B',
    frameIndex: 1,
    visible: false,
  });

  assert.equal(nextSteps[0].nodeOverrides.B, undefined);
  assert.equal(nextSteps[1].nodeOverrides.B.visible, false);
  assert.equal(nextSteps[2].nodeOverrides.B.visible, false);
});

test('show this frame restores visibility on the current frame only', () => {
  const steps = [
    {
      id: 'frame-1',
      nodeOverrides: { B: { visible: false } },
      edgeOverrides: {},
    },
    {
      id: 'frame-2',
      nodeOverrides: { B: { visible: false } },
      edgeOverrides: {},
    },
    {
      id: 'frame-3',
      nodeOverrides: { B: { visible: false } },
      edgeOverrides: {},
    },
  ];
  const nextSteps = applyVisibilityToFrame({
    baseGraph,
    steps,
    objectType: 'node',
    objectId: 'B',
    frameIndex: 1,
    visible: true,
  });

  assert.equal(
    resolveFrameGraph(baseGraph, nextSteps[0]).nodes.find(
      node => node.id === 'B'
    ).visible,
    false
  );
  assert.equal(
    resolveFrameGraph(baseGraph, nextSteps[1]).nodes.find(
      node => node.id === 'B'
    ).visible,
    true
  );
  assert.equal(
    resolveFrameGraph(baseGraph, nextSteps[2]).nodes.find(
      node => node.id === 'B'
    ).visible,
    false
  );
  assert.equal(hasFrameOverride(nextSteps[1], 'node', 'B', 'visible'), false);
});

test('show from this frame onward restores visibility on current and later frames', () => {
  const steps = [
    {
      id: 'frame-1',
      nodeOverrides: { B: { visible: false } },
      edgeOverrides: {},
    },
    {
      id: 'frame-2',
      nodeOverrides: { B: { visible: false } },
      edgeOverrides: {},
    },
    {
      id: 'frame-3',
      nodeOverrides: { B: { visible: false } },
      edgeOverrides: {},
    },
  ];
  const nextSteps = applyVisibilityFromFrame({
    baseGraph,
    steps,
    objectType: 'node',
    objectId: 'B',
    frameIndex: 1,
    visible: true,
  });

  assert.equal(
    resolveFrameGraph(baseGraph, nextSteps[0]).nodes.find(
      node => node.id === 'B'
    ).visible,
    false
  );
  assert.equal(
    resolveFrameGraph(baseGraph, nextSteps[1]).nodes.find(
      node => node.id === 'B'
    ).visible,
    true
  );
  assert.equal(
    resolveFrameGraph(baseGraph, nextSteps[2]).nodes.find(
      node => node.id === 'B'
    ).visible,
    true
  );
  assert.equal(hasFrameOverride(nextSteps[1], 'node', 'B', 'visible'), false);
  assert.equal(hasFrameOverride(nextSteps[2], 'node', 'B', 'visible'), false);
});

test('frame-local node color does not mutate other frames or global labels', () => {
  const steps = [
    applyFrameOverride(
      { id: 'frame-1', nodeOverrides: {}, edgeOverrides: {} },
      'node',
      'A',
      { color: '#F59E0B' }
    ),
    applyFrameOverride(
      { id: 'frame-2', nodeOverrides: {}, edgeOverrides: {} },
      'node',
      'A',
      { color: '#22C55E' }
    ),
  ];
  const renamedBaseGraph = {
    ...baseGraph,
    nodes: baseGraph.nodes.map(node =>
      node.id === 'A' ? { ...node, label: 'Start' } : node
    ),
  };

  assert.equal(
    resolveFrameGraph(renamedBaseGraph, steps[0]).nodes.find(
      node => node.id === 'A'
    ).color,
    '#F59E0B'
  );
  assert.equal(
    resolveFrameGraph(renamedBaseGraph, steps[1]).nodes.find(
      node => node.id === 'A'
    ).color,
    '#22C55E'
  );
  assert.equal(
    resolveFrameGraph(renamedBaseGraph, steps[0]).nodes.find(
      node => node.id === 'A'
    ).label,
    'Start'
  );
  assert.equal(
    resolveFrameGraph(renamedBaseGraph, steps[1]).nodes.find(
      node => node.id === 'A'
    ).label,
    'Start'
  );
});

test('reset removes only the selected property from the current frame', () => {
  const step = {
    id: 'frame-2',
    nodeOverrides: { C: { visible: false, color: '#F59E0B' } },
    edgeOverrides: {},
  };
  const resetStep = removeFrameOverrideProperties(step, 'node', 'C', 'visible');

  assert.equal(hasFrameOverride(resetStep, 'node', 'C', 'visible'), false);
  assert.equal(resetStep.nodeOverrides.C.color, '#F59E0B');
  assert.equal(step.nodeOverrides.C.visible, false);
});

test('apply to all frames promotes the value and clears conflicting overrides', () => {
  const steps = [
    { id: 'frame-1', nodeOverrides: { A: { color: '#F59E0B' } } },
    { id: 'frame-2', nodeOverrides: { A: { color: '#22C55E' } } },
  ];
  const next = applyPropertyToAllFrames({
    baseGraph,
    steps,
    objectType: 'node',
    objectId: 'A',
    patch: { color: '#0F2747' },
  });

  assert.equal(
    next.baseGraph.nodes.find(node => node.id === 'A').color,
    '#0F2747'
  );
  assert.equal(hasFrameOverride(next.steps[0], 'node', 'A', 'color'), false);
  assert.equal(hasFrameOverride(next.steps[1], 'node', 'A', 'color'), false);
  assert.equal(
    resolveFrameGraph(next.baseGraph, next.steps[0]).nodes.find(
      node => node.id === 'A'
    ).color,
    '#0F2747'
  );
});

test('delete from project removes object globally and clears related overrides', () => {
  const graph = {
    nodes: baseGraph.nodes,
    edges: [
      { id: 'eAB', from: 'A', to: 'B', visible: true },
      { id: 'eBC', from: 'B', to: 'C', visible: true },
      { id: 'eAC', from: 'A', to: 'C', visible: true },
    ],
  };
  const steps = [
    {
      id: 'frame-1',
      nodeOverrides: { B: { visible: false }, C: { color: '#22C55E' } },
      edgeOverrides: {
        eAB: { visible: false },
        eBC: { color: '#F59E0B' },
        eAC: { color: '#0F2747' },
      },
    },
  ];
  const next = deleteObjectsFromProject({
    baseGraph: graph,
    steps,
    objectType: 'node',
    objectIds: 'B',
  });

  assert.deepEqual(
    next.baseGraph.nodes.map(node => node.id),
    ['A', 'C']
  );
  assert.deepEqual(
    next.baseGraph.edges.map(edge => edge.id),
    ['eAC']
  );
  assert.equal(next.steps[0].nodeOverrides.B, undefined);
  assert.equal(next.steps[0].nodeOverrides.C.color, '#22C55E');
  assert.equal(next.steps[0].edgeOverrides.eAB, undefined);
  assert.equal(next.steps[0].edgeOverrides.eBC, undefined);
  assert.equal(next.steps[0].edgeOverrides.eAC.color, '#0F2747');
});

test('JSON roundtrip preserves temporal visibility overrides without editor-only fields', () => {
  const steps = applyTemporalVisibilityFromFrame(
    [
      { id: 'frame-1', nodeOverrides: {}, edgeOverrides: {} },
      { id: 'frame-2', nodeOverrides: {}, edgeOverrides: {} },
      { id: 'frame-3', nodeOverrides: {}, edgeOverrides: {} },
    ],
    'node',
    'C',
    1
  );
  const payload = {
    format: 'graph-viz-project',
    version: 1,
    graph: baseGraph,
    timeline: {
      steps,
      currentFrame: 1,
    },
    settings: {},
  };
  const parsed = JSON.parse(JSON.stringify(payload));

  assert.equal(parsed.timeline.steps[0].nodeOverrides.C.visible, false);
  assert.equal(parsed.timeline.steps[1].nodeOverrides.C, undefined);
  assert.equal(parsed.timeline.currentFrame, 1);
  assert.equal(JSON.stringify(parsed).includes('editorOnly'), false);
});
