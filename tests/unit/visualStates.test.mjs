import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyVisualStatesByColor,
  createSemanticPresetModel,
  createVisualState,
  createVisualStatesFromLegend,
  deriveSmartLegendEntries,
  getReadableTextColor,
  migrateLegacyVisualStates,
  normalizeVisualStates,
  removeVisualStateReferences,
  resolveGraphVisualStates,
} from '../../src/components/visualizers/Graphs/graphStudio/lib/visualStates.js';

test('chooses readable node label colors for semantic fills', () => {
  assert.equal(getReadableTextColor('#000000'), '#FFFFFF');
  assert.equal(getReadableTextColor('#FFFFFF'), '#0F172A');
  assert.equal(getReadableTextColor('#3B82F6'), '#0F172A');
});

test('normalizes project visual states with stable unique ids', () => {
  assert.deepEqual(
    normalizeVisualStates(
      [
        { id: ' Current ', kind: 'node', label: 'Current', color: '#3b82f6' },
        { id: 'current', kind: 'edge', label: 'Current edge', color: 'bad' },
        { id: 'empty', kind: 'node', label: '' },
      ],
      { useDefaults: false }
    ),
    [
      {
        id: 'current',
        kind: 'node',
        label: 'Current',
        color: '#3B82F6',
        pinned: false,
      },
      {
        id: 'current-2',
        kind: 'edge',
        label: 'Current edge',
        color: '#64748B',
        pinned: false,
      },
    ]
  );
});

test('creates unique author-defined state ids', () => {
  const existing = [
    { id: 'node-current', kind: 'node', label: 'Current', color: '#000000' },
  ];
  assert.equal(
    createVisualState(
      { kind: 'node', label: 'Current', color: '#3b82f6' },
      existing
    ).id,
    'node-current-2'
  );
});

test('resolves semantic state colors without mutating stored objects', () => {
  const graph = {
    nodes: [{ id: 1, stateId: 'current', color: '#FFFFFF' }],
    edges: [{ id: 'e1', stateId: 'done', color: '#000000' }],
  };
  const resolved = resolveGraphVisualStates(graph, [
    { id: 'current', kind: 'node', label: 'Current', color: '#3B82F6' },
    { id: 'done', kind: 'edge', label: 'Done', color: '#22C55E' },
  ]);
  assert.equal(resolved.nodes[0].color, '#3B82F6');
  assert.equal(resolved.edges[0].color, '#22C55E');
  assert.equal(graph.nodes[0].color, '#FFFFFF');
});

test('smart legend is project-wide, ordered, and includes pinned unused states', () => {
  const visualStates = [
    { id: 'queued', kind: 'node', label: 'Queued', color: '#EAB308' },
    { id: 'visited', kind: 'node', label: 'Visited', color: '#22C55E' },
    {
      id: 'rejected',
      kind: 'edge',
      label: 'Rejected',
      color: '#DC2626',
      pinned: true,
    },
  ];
  const entries = deriveSmartLegendEntries({
    visualStates,
    baseGraph: { nodes: [{ id: 1, stateId: 'queued' }], edges: [] },
    steps: [
      {
        nodeOverrides: { 1: { stateId: 'visited' } },
        edgeOverrides: {},
      },
    ],
  });
  assert.deepEqual(
    entries.map(entry => [entry.stateId, entry.used]),
    [
      ['queued', true],
      ['visited', true],
      ['rejected', false],
    ]
  );
});

test('turns teaching legend entries into semantic preset states', () => {
  const visualStates = createVisualStatesFromLegend(
    {
      entries: [
        { kind: 'node', label: 'Current minimum', color: '#3b82f6' },
        { kind: 'edge', label: 'Relaxed edge', color: '#22c55e' },
      ],
    },
    { namespace: 'dijkstra' }
  );
  const migrated = applyVisualStatesByColor({
    visualStates,
    graph: {
      nodes: [{ id: 1, color: '#3B82F6' }],
      edges: [{ id: 'e1', color: '#64748B' }],
    },
    steps: [
      {
        nodeOverrides: {},
        edgeOverrides: { e1: { color: '#22c55e' } },
      },
    ],
  });
  assert.equal(migrated.graph.nodes[0].stateId, visualStates[0].id);
  assert.equal(migrated.graph.edges[0].stateId, undefined);
  assert.equal(migrated.steps[0].edgeOverrides.e1.stateId, visualStates[1].id);
});

test('creates a smart semantic model for worked presets', () => {
  const model = createSemanticPresetModel('bfs', {
    graph: { nodes: [{ id: 1, color: '#3b82f6' }], edges: [] },
    steps: [{ nodeOverrides: {}, edgeOverrides: {} }],
    legend: {
      title: 'Breadth-first search',
      entries: [{ kind: 'node', label: 'Front of queue', color: '#3b82f6' }],
    },
  });
  assert.equal(model.legend.mode, 'smart');
  assert.equal(model.graph.nodes[0].stateId, model.visualStates[0].id);
});

test('migrates legacy node status while preserving its visible color', () => {
  const migrated = migrateLegacyVisualStates({
    graph: {
      nodes: [{ id: 1, status: 'active', color: '#123456' }],
      edges: [],
    },
    steps: [
      {
        nodeOverrides: { 1: { status: 'visited' } },
        edgeOverrides: {},
      },
    ],
  });
  const baseState = migrated.visualStates.find(
    state => state.id === migrated.graph.nodes[0].stateId
  );
  const frameState = migrated.visualStates.find(
    state => state.id === migrated.steps[0].nodeOverrides[1].stateId
  );
  assert.equal(baseState.color, '#123456');
  assert.equal(frameState.color, '#E2E2E2');
});

test('removing a state clears project and frame references', () => {
  const cleaned = removeVisualStateReferences({
    stateId: 'active',
    graph: {
      nodes: [{ id: 1, stateId: 'active' }],
      edges: [{ id: 'e1', stateId: 'done' }],
    },
    steps: [
      {
        nodeOverrides: { 1: { stateId: 'active', visible: true } },
        edgeOverrides: {},
      },
    ],
  });
  assert.equal(cleaned.graph.nodes[0].stateId, undefined);
  assert.equal(cleaned.graph.edges[0].stateId, 'done');
  assert.deepEqual(cleaned.steps[0].nodeOverrides[1], { visible: true });
});
