import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  reconcileSelectionWithGraph,
  resolveNodeSelection,
} from '../../src/components/visualizers/Graphs/graphStudio/lib/selectionState.js';

test('single-node selection replaces the previous selection', () => {
  assert.deepEqual(
    resolveNodeSelection({
      selectedObject: { type: 'edge', id: 'e0' },
      selectedNodeIds: ['0', '1'],
      nodeId: 2,
    }),
    {
      selectedObject: { type: 'node', id: 2 },
      selectedNodeIds: ['2'],
    }
  );
});

test('additive selection makes the added node primary', () => {
  assert.deepEqual(
    resolveNodeSelection({
      selectedObject: { type: 'node', id: 0 },
      selectedNodeIds: [0],
      nodeId: 1,
      additive: true,
    }),
    {
      selectedObject: { type: 'node', id: 1 },
      selectedNodeIds: ['0', '1'],
    }
  );
});

test('additive deselection promotes the remaining node', () => {
  assert.deepEqual(
    resolveNodeSelection({
      selectedObject: { type: 'node', id: 1 },
      selectedNodeIds: ['0', '1'],
      nodeId: 1,
      additive: true,
    }),
    {
      selectedObject: { type: 'node', id: '0' },
      selectedNodeIds: ['0'],
    }
  );
});

test('additive deselection preserves a primary node that remains selected', () => {
  assert.deepEqual(
    resolveNodeSelection({
      selectedObject: { type: 'node', id: 2 },
      selectedNodeIds: ['0', '1', '2'],
      nodeId: 0,
      additive: true,
    }),
    {
      selectedObject: { type: 'node', id: 2 },
      selectedNodeIds: ['1', '2'],
    }
  );
});

test('additive deselection clears the sole selected node', () => {
  assert.deepEqual(
    resolveNodeSelection({
      selectedObject: { type: 'node', id: 0 },
      selectedNodeIds: ['0'],
      nodeId: 0,
      additive: true,
    }),
    { selectedObject: null, selectedNodeIds: [] }
  );
});

test('additive selection compares numeric and string IDs canonically', () => {
  assert.deepEqual(
    resolveNodeSelection({
      selectedObject: { type: 'node', id: 1 },
      selectedNodeIds: [0, '0', 1],
      nodeId: '0',
      additive: true,
    }),
    {
      selectedObject: { type: 'node', id: 1 },
      selectedNodeIds: ['1'],
    }
  );
});

test('graph pruning promotes the sole surviving selected node', () => {
  assert.deepEqual(
    reconcileSelectionWithGraph({
      selectedObject: { type: 'node', id: 'A' },
      selectedNodeIds: ['A', 'B'],
      nodeIds: ['B', 'C'],
      edgeIds: [],
    }),
    {
      selectedObject: { type: 'node', id: 'B' },
      selectedNodeIds: ['B'],
    }
  );
});

test('graph pruning clears a missing primary while preserving multi-selection', () => {
  assert.deepEqual(
    reconcileSelectionWithGraph({
      selectedObject: { type: 'node', id: 'A' },
      selectedNodeIds: ['A', 'B', 'C'],
      nodeIds: ['B', 'C'],
      edgeIds: [],
    }),
    {
      selectedObject: null,
      selectedNodeIds: ['B', 'C'],
    }
  );
});

test('graph pruning clears a selected edge that no longer exists', () => {
  assert.deepEqual(
    reconcileSelectionWithGraph({
      selectedObject: { type: 'edge', id: 'e0' },
      selectedNodeIds: [],
      nodeIds: ['A'],
      edgeIds: ['e1'],
    }),
    { selectedObject: null, selectedNodeIds: [] }
  );
});
