import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolveStepCaptionText } from '../../src/components/visualizers/Graphs/graphStudio/lib/captionOverlay.js';
import { getLegendOrigin } from '../../src/components/visualizers/Graphs/graphStudio/lib/exportOverlayGeometry.js';
import {
  exportProjectJson,
  parseProjectJson,
} from '../../src/components/visualizers/Graphs/graphStudio/lib/projectJson.js';
import { getCompactLegendLayout } from '../../src/components/visualizers/Graphs/graphStudio/lib/walkthroughLayout.js';

test('short display captions roundtrip independently from full descriptions', () => {
  const project = parseProjectJson(
    JSON.stringify(
      exportProjectJson({
        baseGraph: { nodes: [], edges: [] },
        steps: [
          {
            id: 'old',
            description: 'Existing caption',
            nodeOverrides: {},
            edgeOverrides: {},
          },
          {
            id: 'short',
            description: 'Long presenter explanation',
            captionText: 'Visit B',
            nodeOverrides: {},
            edgeOverrides: {},
          },
          {
            id: 'empty',
            description: 'Notes without a display caption',
            captionText: '',
            nodeOverrides: {},
            edgeOverrides: {},
          },
        ],
      })
    )
  );
  assert.deepEqual(project.timeline.steps.map(resolveStepCaptionText), [
    'Existing caption',
    'Visit B',
    '',
  ]);
  assert.equal(
    project.timeline.steps[1].description,
    'Long presenter explanation'
  );
  assert.equal(Object.hasOwn(project.timeline.steps[0], 'captionText'), false);
});

test('walkthrough style and centered legend survive a project roundtrip', () => {
  const project = parseProjectJson(
    JSON.stringify({
      format: 'graph-viz-project',
      version: 1,
      graph: { nodes: [], edges: [] },
      timeline: { steps: [] },
      settings: {
        captionOverlay: {
          enabled: true,
          style: 'walkthrough',
          position: { x: 0.5, y: 1 },
          fontSize: 16,
        },
        customLegend: {
          enabled: true,
          title: 'DFS',
          position: 'top-center',
          layout: 'compact',
          entries: [],
        },
      },
    })
  );
  assert.equal(project.settings.captionOverlay.style, 'walkthrough');
  assert.deepEqual(project.settings.captionOverlay.position, { x: 0.5, y: 1 });
  assert.equal(project.settings.customLegend.position, 'top-center');
  assert.deepEqual(
    getLegendOrigin({
      canvasSize: { width: 800, height: 500 },
      boxWidth: 420,
      boxHeight: 42,
      margin: 16,
      position: project.settings.customLegend.position,
    }),
    { x: 190, y: 16 }
  );
});

test('compact legend wraps narrow viewports without clipping or overlapping entries', () => {
  const title = 'Dijkstra · d = distance';
  const entries = [
    'Current',
    'Candidate',
    'Settled',
    'Best so far',
    'Tree edge',
  ].map(label => ({ label }));
  for (const maxWidth of [280, 360, 734, 820]) {
    const layout = getCompactLegendLayout(title, entries, maxWidth);
    assert.ok(layout.width <= maxWidth);
    layout.positions.forEach((position, i) => {
      const right = position.x + 32 + entries[i].label.length * 6.6;
      assert.ok(position.x >= 0 && right <= layout.width);
      const next = layout.positions[i + 1];
      if (next?.y === position.y) assert.ok(next.x > right);
      assert.ok(position.y + 10 <= layout.height);
    });
  }
});
