import assert from 'node:assert/strict';
import test from 'node:test';
import {
  LOCAL_DRAFT_STORAGE_KEY,
  clearLocalDraft,
  parseLocalDraftText,
  readLocalDraft,
  writeLocalDraft,
} from '../../src/components/visualizers/Graphs/graphStudio/lib/localDraft.js';
import { exportProjectJson } from '../../src/components/visualizers/Graphs/graphStudio/lib/projectJson.js';

const createProject = () =>
  exportProjectJson({
    baseGraph: {
      nodes: [{ id: 'start', label: 'Start', x: 120, y: 180 }],
      edges: [],
    },
    steps: [
      {
        id: 'step-0',
        description: 'Begin at Start',
        durationMs: 700,
        nodeOverrides: { start: { status: 'active' } },
        edgeOverrides: {},
      },
    ],
    currentFrame: 0,
    settings: {},
  });

const createStorage = () => {
  const values = new Map();
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key),
  };
};

test('local draft roundtrip validates and restores project state', () => {
  const storage = createStorage();
  const savedAt = new Date('2026-08-01T12:34:56.000Z');
  const envelope = writeLocalDraft({
    storage,
    project: createProject(),
    savedAt,
  });

  assert.equal(envelope.savedAt, savedAt.toISOString());
  const result = readLocalDraft(storage);
  assert.equal(result.error, null);
  assert.equal(result.draft.savedAt, savedAt.toISOString());
  assert.equal(result.draft.project.graph.nodes[0].label, 'Start');
  assert.equal(
    result.draft.project.timeline.steps[0].description,
    'Begin at Start'
  );
});

test('invalid local draft is rejected without mutating storage during read', () => {
  const storage = createStorage();
  storage.setItem(LOCAL_DRAFT_STORAGE_KEY, '{ definitely not json');

  const result = readLocalDraft(storage);
  assert.equal(result.draft, null);
  assert.match(result.error.message, /invalid JSON/);
  assert.equal(
    storage.getItem(LOCAL_DRAFT_STORAGE_KEY),
    '{ definitely not json'
  );
});

test('local draft rejects incompatible versions', () => {
  const project = createProject();
  const invalidEnvelope = JSON.stringify({
    format: 'graph-viz-local-draft',
    version: 99,
    savedAt: '2026-08-01T12:34:56.000Z',
    project,
  });

  assert.throws(
    () => parseLocalDraftText(invalidEnvelope),
    /Unsupported local draft version/
  );
});

test('storage failures surface without mutating the project payload', () => {
  const project = createProject();
  const storage = {
    setItem: () => {
      throw new Error('Quota exceeded');
    },
  };

  assert.throws(() => writeLocalDraft({ storage, project }), /Quota exceeded/);
  assert.equal(project.graph.nodes[0].label, 'Start');
});

test('local draft can be cleared explicitly', () => {
  const storage = createStorage();
  storage.setItem(LOCAL_DRAFT_STORAGE_KEY, 'draft');
  clearLocalDraft(storage);
  assert.equal(storage.getItem(LOCAL_DRAFT_STORAGE_KEY), null);
});

test('local draft clear failures are surfaced to the recovery UI', () => {
  const storage = {
    removeItem: () => {
      throw new Error('Storage is blocked');
    },
  };

  assert.throws(() => clearLocalDraft(storage), /Storage is blocked/);
});
