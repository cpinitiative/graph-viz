import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  DEFAULT_FRAME_DURATION_MS,
  MAX_FRAME_DURATION_MS,
  MIN_FRAME_DURATION_MS,
  normalizeFrameDuration,
} from '../../src/components/visualizers/Graphs/graphStudio/lib/frameDuration.js';
import {
  exportProjectJson,
  validateProjectPayload,
} from '../../src/components/visualizers/Graphs/graphStudio/lib/projectJson.js';
import { buildTimelineSteps } from '../../src/components/visualizers/Graphs/graphStudio/lib/scriptTrace.js';

const createProject = durations => ({
  format: 'graph-viz-project',
  version: 1,
  graph: {
    nodes: [{ id: 'A', label: 'A', x: 100, y: 100, visible: true }],
    edges: [],
  },
  timeline: {
    currentFrame: 0,
    steps: durations.map((durationMs, index) => ({
      id: `step-${index}`,
      description: `Frame ${index + 1}`,
      durationMs,
      nodeOverrides: {},
      edgeOverrides: {},
    })),
  },
  settings: {},
});

test('non-numeric frame durations use one default', () => {
  const nonNumericValues = [
    undefined,
    null,
    '',
    'abc',
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
  ];

  nonNumericValues.forEach(value => {
    assert.equal(normalizeFrameDuration(value), DEFAULT_FRAME_DURATION_MS);
  });
});

test('finite frame durations are clamped to supported bounds', () => {
  assert.equal(normalizeFrameDuration(-100), MIN_FRAME_DURATION_MS);
  assert.equal(normalizeFrameDuration(0), MIN_FRAME_DURATION_MS);
  assert.equal(normalizeFrameDuration(1), MIN_FRAME_DURATION_MS);
  assert.equal(normalizeFrameDuration(79), MIN_FRAME_DURATION_MS);
  assert.equal(normalizeFrameDuration('1200'), 1200);
  assert.equal(normalizeFrameDuration(725.5), 725.5);
  assert.equal(normalizeFrameDuration(9000), MAX_FRAME_DURATION_MS);
});

test('project import and export apply the same duration normalization', () => {
  const durations = [0, -100, null, 'abc', 1, '1200', 9000, 725.5];
  const project = createProject(durations);

  const imported = validateProjectPayload(project);
  const exported = exportProjectJson({
    baseGraph: project.graph,
    steps: project.timeline.steps,
    currentFrame: 0,
    settings: {},
  });
  const expected = [80, 80, 600, 600, 80, 1200, 8000, 725.5];

  assert.deepEqual(
    imported.timeline.steps.map(step => step.durationMs),
    expected
  );
  assert.deepEqual(
    exported.timeline.steps.map(step => step.durationMs),
    expected
  );
});

test('script-generated frames use the shared duration normalization', () => {
  const steps = buildTimelineSteps([
    { type: 'patch', durationMs: null },
    { type: 'patch', durationMs: '' },
    { type: 'patch', durationMs: 0 },
    { type: 'patch' },
  ]);

  assert.deepEqual(
    steps.map(step => step.durationMs),
    [600, 600, 600, 80, 650]
  );
});
