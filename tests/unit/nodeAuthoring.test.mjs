import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getEdgeRenderData } from '../../src/components/visualizers/Graphs/graphStudio/lib/edgeRenderData.js';
import { getNodeArrangementPatches } from '../../src/components/visualizers/Graphs/graphStudio/lib/nodeArrangement.js';
import {
  getNodeAccessibleName,
  getNodeBoundaryPoint,
  getNodeDisplayText,
  getNodeShapeBounds,
} from '../../src/components/visualizers/Graphs/graphStudio/lib/nodeGeometry.js';
import { normalizeNumberInput } from '../../src/components/visualizers/Graphs/graphStudio/lib/numberInput.js';
import {
  exportProjectJson,
  parseProjectJson,
} from '../../src/components/visualizers/Graphs/graphStudio/lib/projectJson.js';

const renderEdges = (nodes, edges) =>
  getEdgeRenderData({
    nodes,
    edges,
    nodeMap: new Map(nodes.map(n => [n.id, n])),
    edgeRouting: 'straight',
    edgeCurvature: 46,
    nodeRadius: 20,
    nodeLabelSize: 14,
  });
const payload = node =>
  exportProjectJson({
    baseGraph: {
      nodes: [{ id: 'A', label: 'A', x: 10, y: 20, ...node }],
      edges: [],
    },
    steps: [
      {
        id: 'f1',
        description: 'Presenter notes',
        nodeOverrides: {},
        edgeOverrides: {},
      },
    ],
    currentFrame: 0,
    settings: {},
  });

test('shape boundaries match rectangle, square and diamond outlines', () => {
  const origin = { x: 0, y: 0 };
  assert.deepEqual(
    getNodeBoundaryPoint(
      { ...origin, shape: 'square' },
      { x: 100, y: 100 },
      20
    ),
    { x: 20, y: 20 }
  );
  assert.deepEqual(
    getNodeBoundaryPoint(
      { ...origin, shape: 'rectangle' },
      { x: 100, y: 0 },
      20
    ),
    { x: 30, y: 0 }
  );
  assert.deepEqual(
    getNodeBoundaryPoint(
      { ...origin, shape: 'diamond' },
      { x: 100, y: 100 },
      20
    ),
    { x: 10, y: 10 }
  );
  const circle = getNodeBoundaryPoint(origin, { x: 100, y: 100 }, 20);
  assert.ok(Math.abs(Math.hypot(circle.x, circle.y) - 20) < 1e-9);
});

test('new shape ports follow straight and self-loop tangents without changing circle paths', () => {
  const circleNodes = [
    { id: 'A', x: 0, y: 0 },
    { id: 'B', x: 200, y: 0 },
  ];
  const edges = [{ id: 'e', from: 'A', to: 'B', directed: true, label: '' }];
  const legacy = renderEdges(circleNodes, edges)[0];
  assert.deepEqual(legacy.pathPoints, [
    { x: 18.799999999999997, y: 0 },
    { x: 180, y: 0 },
  ]);
  const shaped = renderEdges(
    [
      { ...circleNodes[0], shape: 'rectangle' },
      { ...circleNodes[1], shape: 'diamond' },
    ],
    edges
  )[0];
  assert.deepEqual(shaped.pathPoints, [
    { x: 30, y: 0 },
    { x: 180, y: 0 },
  ]);
  const self = renderEdges(
    [{ id: 'A', x: 0, y: 0, shape: 'diamond' }],
    [{ id: 'loop', from: 'A', to: 'A' }]
  )[0];
  for (const point of [self.pathPoints[0], self.pathPoints.at(-1)])
    assert.ok(Math.abs(Math.abs(point.x) + Math.abs(point.y) - 20) < 1e-9);
});

test('text nodes have useful label-dependent hit bounds and matching edge endpoints', () => {
  const node = {
    id: 'A',
    x: 0,
    y: 0,
    shape: 'text',
    label: 'Horizontal coordinate axis',
  };
  const bounds = getNodeShapeBounds(node, 20, 14);
  assert.ok(bounds.width > 100);
  assert.equal(bounds.height, 29);
  const target = { id: 'B', x: 500, y: 0 };
  const path = renderEdges([node, target], [{ id: 'e', from: 'A', to: 'B' }])[0]
    .pathPoints;
  assert.equal(path[0].x, bounds.width / 2);
});

test('edge labels follow the clipped text-node segment instead of its old circle port', () => {
  const nodes = [
    {
      id: 'A',
      x: 0,
      y: 100,
      shape: 'text',
      label: 'Horizontal coordinate axis',
    },
    { id: 'B', x: 200, y: 100 },
  ];
  const bounds = getNodeShapeBounds(nodes[0], 22, 18);
  const [rendered] = getEdgeRenderData({
    nodes,
    edges: [{ id: 'e', from: 'A', to: 'B', label: 'a', directed: true }],
    nodeMap: new Map(nodes.map(node => [node.id, node])),
    edgeRouting: 'straight',
    edgeCurvature: 46,
    nodeRadius: 22,
    nodeLabelSize: 18,
  });
  assert.ok(rendered.labelPosition.x > bounds.x + bounds.width + 9);
  assert.ok(rendered.labelPosition.x < rendered.pathPoints.at(-1).x);
  assert.equal(
    rendered.labelPosition.x,
    (rendered.pathPoints[0].x + rendered.pathPoints[1].x) / 2
  );
});

test('annotations preserve legacy display unless separation is selected', () => {
  const original = { id: 'A', label: 'Start', annotation: 'd=3' };
  assert.deepEqual(getNodeDisplayText(original), {
    identity: 'Start',
    label: 'd=3',
    annotation: '',
  });
  assert.deepEqual(
    getNodeDisplayText({ ...original, annotationPlacement: 'below' }),
    { identity: 'Start', label: 'Start', annotation: 'd=3' }
  );
  assert.equal(
    getNodeAccessibleName(original, 'Queued node'),
    'Node Start (A). Annotation: d=3. Queued node'
  );
  assert.equal(
    getNodeAccessibleName({ ...original, annotation: 'Start' }),
    'Node Start (A). Default'
  );
  assert.equal(
    getNodeAccessibleName({ id: 'r2c3', label: '.' }, 'Open cell'),
    'Node . (r2c3). Open cell'
  );
});

test('alignment uses mixed shape edges and does not mutate source nodes', () => {
  const nodes = [
    { id: 'A', x: 100, y: 30 },
    { id: 'B', x: 200, y: 70, shape: 'rectangle' },
    { id: 'C', x: 400, y: 90 },
  ];
  const before = structuredClone(nodes);
  assert.deepEqual(getNodeArrangementPatches(nodes, ['A', 'B'], 'left', 10), {
    A: { x: 100 },
    B: { x: 105 },
  });
  assert.deepEqual(getNodeArrangementPatches(nodes, ['A', 'B'], 'bottom', 10), {
    A: { y: 70 },
    B: { y: 70 },
  });
  assert.deepEqual(nodes, before);
});

test('distribution keeps extreme centers fixed and places interior nodes evenly', () => {
  const nodes = [
    { id: 'right', x: 300, y: 5 },
    { id: 'left', x: 0, y: 20 },
    { id: 'middle', x: 90, y: 40 },
    { id: 'other', x: 500, y: 80 },
  ];
  assert.deepEqual(
    getNodeArrangementPatches(
      nodes,
      ['right', 'left', 'middle'],
      'distribute-x',
      20
    ),
    { left: { x: 0 }, middle: { x: 150 }, right: { x: 300 } }
  );
  assert.deepEqual(
    getNodeArrangementPatches(nodes, ['left', 'right'], 'distribute-x', 20),
    {}
  );
  assert.deepEqual(
    getNodeArrangementPatches(nodes, ['left', 'right'], 'invalid', 20),
    {}
  );
});

test('numeric drafts reject blank/nonfinite input and preserve precise coordinates', () => {
  assert.equal(normalizeNumberInput('', { min: 0, max: 100 }), null);
  assert.equal(normalizeNumberInput('   ', { min: 0, max: 100 }), null);
  assert.equal(normalizeNumberInput('Infinity'), null);
  assert.equal(normalizeNumberInput('oops'), null);
  assert.equal(
    normalizeNumberInput('-125.375', { min: -1e7, max: 1e7 }),
    -125.375
  );
  assert.equal(normalizeNumberInput('1000', { min: 12, max: 44, step: 1 }), 44);
  assert.equal(
    normalizeNumberInput('1.27', { min: 0.2, max: 2, step: 0.1 }),
    1.3
  );
});

test('project roundtrip preserves shared shapes and separate temporal annotation text', () => {
  const original = payload({ shape: 'square', annotationPlacement: 'below' });
  original.timeline.steps[0].nodeOverrides.A = {
    annotation: 'd=4',
    shape: 'diamond',
  };
  const parsed = parseProjectJson(JSON.stringify(original));
  assert.equal(parsed.graph.nodes[0].shape, 'square');
  assert.equal(parsed.graph.nodes[0].annotationPlacement, 'below');
  assert.deepEqual(parsed.timeline.steps[0].nodeOverrides.A, {
    annotation: 'd=4',
  });
  assert.throws(
    () => parseProjectJson(JSON.stringify(payload({ shape: 'triangle' }))),
    /invalid shape/
  );
  assert.throws(
    () =>
      parseProjectJson(
        JSON.stringify(payload({ annotationPlacement: 'sideways' }))
      ),
    /invalid annotation placement/
  );
});

test('optional display captions preserve empty text and validate their own budget', () => {
  const original = payload();
  assert.equal(
    Object.hasOwn(
      parseProjectJson(JSON.stringify(original)).timeline.steps[0],
      'captionText'
    ),
    false
  );
  original.timeline.steps[0].captionText = '';
  assert.equal(
    parseProjectJson(JSON.stringify(original)).timeline.steps[0].captionText,
    ''
  );
  original.timeline.steps[0].captionText = 'Short visible caption';
  assert.equal(
    parseProjectJson(JSON.stringify(original)).timeline.steps[0].captionText,
    'Short visible caption'
  );
  original.timeline.steps[0].captionText = 'x'.repeat(10001);
  assert.throws(
    () => parseProjectJson(JSON.stringify(original)),
    /caption text exceeds/
  );
  original.timeline.steps[0].captionText = 42;
  assert.throws(
    () => parseProjectJson(JSON.stringify(original)),
    /caption text must be a string/
  );
  assert.throws(
    () =>
      exportProjectJson({
        baseGraph: original.graph,
        steps: original.timeline.steps,
      }),
    /caption text must be a string/
  );
});
