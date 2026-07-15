import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  isTextEditingUndoTarget,
  snapshotTimelineState,
} from '../../src/components/visualizers/Graphs/graphStudio/lib/undoUtils.js';

test('undo snapshots exclude frame navigation state', () => {
  const baseGraph = {
    nodes: [{ id: 'A', label: 'A', x: 100, y: 100 }],
    edges: [],
  };
  const steps = [
    { id: 'step-0', nodeOverrides: {}, edgeOverrides: {} },
    { id: 'step-1', nodeOverrides: {}, edgeOverrides: {} },
  ];

  const firstFrame = snapshotTimelineState({
    baseGraph,
    steps,
    settings: { edgeRouting: 'straight', showGrid: true },
    currentFrame: 0,
  });
  const secondFrame = snapshotTimelineState({
    baseGraph,
    steps,
    settings: { edgeRouting: 'straight', showGrid: true },
    currentFrame: 1,
  });

  assert.deepEqual(firstFrame, secondFrame);
  assert.equal(Object.hasOwn(firstFrame, 'currentFrame'), false);
  assert.deepEqual(firstFrame.settings, {
    edgeRouting: 'straight',
    showGrid: true,
  });
});

test('playback frame ticks do not change the undo snapshot', () => {
  const projectState = {
    baseGraph: {
      nodes: [{ id: 'A', label: 'A', x: 100, y: 100 }],
      edges: [],
    },
    steps: Array.from({ length: 4 }, (_, index) => ({
      id: `step-${index}`,
      nodeOverrides: {},
      edgeOverrides: {},
    })),
    settings: { edgeRouting: 'straight' },
  };

  const beforePlaybackTick = snapshotTimelineState({
    ...projectState,
    currentFrame: 1,
  });
  const afterPlaybackTick = snapshotTimelineState({
    ...projectState,
    currentFrame: 2,
  });

  assert.deepEqual(afterPlaybackTick, beforePlaybackTick);
});

test('application undo remains available from non-text settings controls', () => {
  assert.equal(
    isTextEditingUndoTarget({ tagName: 'INPUT', type: 'checkbox' }),
    false
  );
  assert.equal(isTextEditingUndoTarget({ tagName: 'SELECT' }), false);
  assert.equal(isTextEditingUndoTarget({ tagName: 'BUTTON' }), false);
});

test('text editing targets retain their native undo behavior', () => {
  assert.equal(
    isTextEditingUndoTarget({ tagName: 'INPUT', type: 'text' }),
    true
  );
  assert.equal(
    isTextEditingUndoTarget({ tagName: 'INPUT', type: 'number' }),
    true
  );
  assert.equal(isTextEditingUndoTarget({ tagName: 'TEXTAREA' }), true);
  assert.equal(isTextEditingUndoTarget({ isContentEditable: true }), true);
});
