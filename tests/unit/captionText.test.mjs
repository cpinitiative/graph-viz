import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolveStepCaptionText } from '../../src/components/visualizers/Graphs/graphStudio/lib/captionOverlay.js';
import {
  exportProjectJson,
  parseProjectJson,
} from '../../src/components/visualizers/Graphs/graphStudio/lib/projectJson.js';

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
