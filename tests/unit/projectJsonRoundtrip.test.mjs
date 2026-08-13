import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isEdgeEffectivelyVisible } from '../../src/components/visualizers/Graphs/graphStudio/lib/effectiveVisibility.js';
import {
  exportProjectJson,
  parseProjectJson,
} from '../../src/components/visualizers/Graphs/graphStudio/lib/projectJson.js';
import { resolveFrameGraph } from '../../src/components/visualizers/Graphs/graphStudio/lib/temporalGraphState.js';

const withoutSemanticStateRefs = graph => ({
  nodes: graph.nodes.map(({ stateId: _stateId, ...node }) => node),
  edges: graph.edges.map(({ stateId: _stateId, ...edge }) => edge),
});

test('real project serializer and parser preserve resolved temporal state', () => {
  const baseGraph = {
    nodes: [
      { id: 'A', label: 'Alpha', x: 100, y: 100, visible: true },
      { id: 'B', label: 'Beta', x: 300, y: 100, visible: true },
      { id: 'C', label: 'Gamma', x: 500, y: 100, visible: false },
    ],
    edges: [
      {
        id: 'e1',
        from: 'A',
        to: 'B',
        directed: true,
        label: 'weighted',
        weight: 7,
        visible: true,
      },
      {
        id: 'e2',
        from: 'B',
        to: 'C',
        directed: false,
        label: 'recovery',
        weight: 2,
        visible: true,
      },
    ],
  };
  const steps = [
    {
      id: 'frame-1',
      description: 'Hide Beta',
      durationMs: 120,
      captionVisible: true,
      nodeOverrides: {
        B: { visible: false, color: '#FF0000', label: 'illegal' },
      },
      edgeOverrides: {
        e1: { color: '#B56A2D', weight: 999 },
      },
    },
    {
      id: 'frame-2',
      description: 'Recover Gamma',
      durationMs: 9000,
      captionVisible: false,
      nodeOverrides: { C: { visible: true, status: 'active' } },
      edgeOverrides: { e2: { visible: false } },
    },
    {
      id: 'frame-3',
      description: 'Derived edge absence',
      durationMs: 725.5,
      nodeOverrides: { B: { visible: false } },
      edgeOverrides: {},
    },
  ];
  const settings = {
    edgeRouting: 'straight',
    snapEnabled: false,
    showGrid: true,
    captionOverlay: {
      enabled: true,
      position: { x: 0.2, y: 0.75 },
      style: 'dark',
      size: 'large',
      fontSize: 18,
    },
    customLegend: {
      enabled: true,
      title: 'Roundtrip Key',
      position: 'custom',
      customPosition: { x: 0.7, y: 0.15 },
      entries: [
        { group: 'Nodes', kind: 'node', label: 'Active', color: '#B56A2D' },
      ],
    },
    lockCanvas: true,
    viewState: { x: 12, y: -18, zoom: 1.2 },
    globalSettings: {
      forceStrength: 1,
      edgeCurvature: 46,
      nodeSize: 24,
      nodeLabelFontSize: 14,
      edgeWidth: 3,
      edgeLabelFontSize: 13,
    },
  };

  const exported = exportProjectJson({
    baseGraph,
    steps,
    currentFrame: 1,
    settings,
  });
  const imported = parseProjectJson(JSON.stringify(exported));

  assert.equal(imported.timeline.currentFrame, 1);
  assert.deepEqual(
    imported.timeline.steps.map(step => step.durationMs),
    [120, 8000, 725.5]
  );
  assert.deepEqual(imported.settings.captionOverlay.position, {
    x: 0.2,
    y: 0.75,
  });
  assert.deepEqual(imported.settings.customLegend.customPosition, {
    x: 0.7,
    y: 0.15,
  });
  assert.equal(imported.settings.showGrid, true);

  assert.deepEqual(exported.timeline.steps[0].nodeOverrides.B, {
    visible: false,
    color: '#FF0000',
  });
  assert.deepEqual(exported.timeline.steps[0].edgeOverrides.e1, {
    color: '#B56A2D',
  });
  assert.equal(
    Object.hasOwn(exported.timeline.steps[2].edgeOverrides, 'e1'),
    false
  );

  imported.timeline.steps.forEach((step, index) => {
    assert.deepEqual(
      withoutSemanticStateRefs(resolveFrameGraph(imported.graph, step)),
      withoutSemanticStateRefs(
        resolveFrameGraph(exported.graph, exported.timeline.steps[index])
      )
    );
  });

  const derivedFrame = resolveFrameGraph(
    imported.graph,
    imported.timeline.steps[2]
  );
  const nodeMap = new Map(
    derivedFrame.nodes.map(node => [String(node.id), node])
  );
  const incidentEdge = derivedFrame.edges.find(edge => edge.id === 'e1');
  assert.equal(isEdgeEffectivelyVisible(incidentEdge, nodeMap), false);
  assert.deepEqual(imported.timeline.steps[2].edgeOverrides, {});
});

test('project roundtrip preserves semantic visual states and smart legend mode', () => {
  const visualStates = [
    {
      id: 'node-frontier',
      kind: 'node',
      label: 'Frontier node',
      color: '#3B82F6',
      pinned: true,
    },
  ];
  const payload = exportProjectJson({
    baseGraph: {
      nodes: [{ id: 'A', label: 'A', x: 40, y: 40, stateId: 'node-frontier' }],
      edges: [],
    },
    steps: [
      {
        id: 'frame-1',
        description: 'Frontier',
        durationMs: 600,
        nodeOverrides: { A: { stateId: 'node-frontier' } },
        edgeOverrides: {},
      },
    ],
    currentFrame: 0,
    settings: {
      visualStates,
      customLegend: { enabled: true, mode: 'smart', title: 'Search state' },
    },
  });

  const imported = parseProjectJson(JSON.stringify(payload));
  assert.deepEqual(imported.settings.visualStates, visualStates);
  assert.equal(imported.settings.customLegend.mode, 'smart');
  assert.equal(imported.graph.nodes[0].stateId, 'node-frontier');
  assert.equal(
    imported.timeline.steps[0].nodeOverrides.A.stateId,
    'node-frontier'
  );
});
