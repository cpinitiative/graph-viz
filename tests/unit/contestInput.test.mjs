import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseAsciiGridText } from '../../src/components/visualizers/Graphs/graphStudio/lib/asciiGrid.js';
import {
  exportEdgeListText,
  parseEdgeListText,
} from '../../src/components/visualizers/Graphs/graphStudio/lib/edgeList.js';
import {
  exportProjectJson,
  parseProjectJson,
} from '../../src/components/visualizers/Graphs/graphStudio/lib/projectJson.js';

const labyrinth = '5 8\n########\n#.A#...#\n#.##.#B#\n#......#\n########';
const monsters = '5 8\n########\n#M..A..#\n#.#.M#.#\n#M#..#..\n#.######';
const palindrome =
  '8 8\n1 2 a\n2 3 b\n1 3 c\n3 4 b\n4 5 a\n5 6 c\n6 7 b\n7 8 a';
const roundtrip = ({ graph, settings }) =>
  parseProjectJson(
    JSON.stringify(
      exportProjectJson({
        baseGraph: graph,
        steps: [
          {
            id: 'initial',
            description: 'Imported',
            nodeOverrides: {},
            edgeOverrides: {},
          },
        ],
        currentFrame: 0,
        settings,
      })
    )
  );
const distances = (graph, sources, isSafe = () => true) => {
  const adjacency = new Map(graph.nodes.map(node => [node.id, []]));
  graph.edges.forEach(edge => {
    adjacency.get(edge.from).push(edge.to);
    adjacency.get(edge.to).push(edge.from);
  });
  const result = new Map(sources.map(source => [source, 0]));
  const queue = [...sources];
  for (let i = 0; i < queue.length; i += 1) {
    const current = queue[i];
    for (const next of adjacency.get(current)) {
      const time = result.get(current) + 1;
      if (result.has(next) || !isSafe(next, time)) continue;
      result.set(next, time);
      queue.push(next);
    }
  }
  return result;
};

test('CSES Labyrinth imports its exact grid topology, markers, and positions', () => {
  const parsed = parseAsciiGridText(labyrinth);
  const graph = roundtrip(parsed).graph;
  assert.equal(graph.nodes.length, 40);
  assert.equal(graph.edges.length, 14);
  const expectedRows = labyrinth.split('\n').slice(1);
  for (let row = 0; row < 5; row += 1) {
    for (let column = 0; column < 8; column += 1) {
      const node = graph.nodes.find(
        candidate => candidate.id === `r${row + 1}c${column + 1}`
      );
      assert.equal(node.label, expectedRows[row][column]);
      assert.equal(node.shape, 'square');
      assert.equal(node.annotationPlacement, 'below');
      assert.equal(node.x, 96 + column * 72);
      assert.equal(node.y, 96 + row * 72);
      if (node.label === '#')
        assert.ok(
          graph.edges.every(
            edge => edge.from !== node.id && edge.to !== node.id
          )
        );
    }
  }
  assert.equal(distances(graph, ['r2c3']).get('r3c7'), 9);
  assert.equal(parsed.settings.snapEnabled, false);
  assert.equal(parsed.settings.showGrid, false);
});

test('CSES Monsters retains all sources and the five-step safe escape', () => {
  const { graph } = roundtrip(parseAsciiGridText(monsters));
  const sources = graph.nodes
    .filter(node => node.label === 'M')
    .map(node => node.id);
  assert.deepEqual(sources, ['r2c2', 'r3c5', 'r4c2']);
  assert.equal(graph.edges.length, 17);
  const monsterTimes = distances(graph, sources);
  const playerTimes = distances(
    graph,
    ['r2c5'],
    (cell, time) => time < (monsterTimes.get(cell) ?? Infinity)
  );
  assert.equal(playerTimes.get('r4c8'), 5);
  assert.equal(monsterTimes.get('r4c8'), 6);
  assert.equal(playerTimes.has('r2c3'), false);
});

test('ASCII grids accept no header, CRLF, edge cells, and empty border lines', () => {
  const direct = parseAsciiGridText('#A.\n#M#');
  const header = parseAsciiGridText('\n\r\n2 3\r\n#A.\r\n#M#\r\n');
  assert.deepEqual(direct, header);
  const single = parseAsciiGridText('1 1\nA');
  assert.equal(single.graph.nodes[0].label, 'A');
  assert.deepEqual(single.graph.edges, []);
  assert.equal(parseAsciiGridText('...').graph.edges.length, 2);
  assert.equal(parseAsciiGridText('.\n.\n.').graph.edges.length, 2);
});

test('ASCII grid errors explain malformed rows and enforce graph budgets', () => {
  for (const [input, message] of [
    ['', /Paste a grid/],
    ['0 4', /positive integers/],
    ['9007199254740992 1', /positive integers/],
    ['1000 1000\n.', /Grid cell count.*1,000/],
    ['2 3\n...', /declares 2 grid rows but found 1/],
    ['2 3\n...\n..', /row 2 has 2 cells; expected 3/],
    ['...\n..', /row 2 has 2 cells; expected 3/],
    ['. .', /row 1, column 2.*spaces/],
    ['.X.', /row 1, column 2/],
    ['AA', /at most one start/],
    ['BB', /at most one destination/],
    ['.'.repeat(1001), /Grid cell count.*1,000/],
  ])
    assert.throws(() => parseAsciiGridText(input), message);
  assert.equal(parseAsciiGridText('.'.repeat(1000)).graph.nodes.length, 1000);
});

test('the exact one-based AtCoder sample preserves character labels in Project JSON', () => {
  const parsed = parseEdgeListText(palindrome, {
    indexBase: 1,
    edgeValues: 'label',
  });
  const { graph } = roundtrip(parsed);
  assert.deepEqual(
    graph.nodes.map(node => node.id),
    [1, 2, 3, 4, 5, 6, 7, 8]
  );
  assert.deepEqual(
    graph.nodes.map(node => node.label),
    ['1', '2', '3', '4', '5', '6', '7', '8']
  );
  assert.equal(graph.edges.map(edge => edge.label).join(''), 'abcbacba');
  assert.deepEqual(
    graph.edges.map(edge => [edge.from, edge.to]),
    [
      [1, 2],
      [2, 3],
      [1, 3],
      [3, 4],
      [4, 5],
      [5, 6],
      [6, 7],
      [7, 8],
    ]
  );
  assert.ok(graph.edges.every(edge => edge.directed === false));
});

test('text import supports loops, parallel edges, and multi-word labels', () => {
  const { graph } = parseEdgeListText(
    '2 4\n1 1 a\n1 2 first path\n1 2 second path\n2 2',
    { indexBase: 1, edgeValues: 'label' }
  );
  assert.equal(graph.edges.length, 4);
  assert.deepEqual(
    graph.edges.map(edge => edge.label),
    ['a', 'first path', 'second path', '']
  );
  assert.equal(graph.edges[0].from, graph.edges[0].to);
  assert.equal(graph.edges[3].from, graph.edges[3].to);
});

test('zero-based numeric parsing and Edge List export retain their original contract', () => {
  const input = '3 3\n0 1 -2.5\n1 2 .75\n2 2';
  assert.equal(exportEdgeListText(parseEdgeListText(input).graph), input);
  assert.throws(
    () => parseEdgeListText('2 1\n0 1 a'),
    /weight must be numeric/
  );
  assert.throws(() => parseEdgeListText('2 1\n1 2 3'), /out of range 0\.\.1/);
  const labeled = parseEdgeListText('2 1\n1 2 text', {
    indexBase: 1,
    edgeValues: 'label',
  });
  assert.equal(exportEdgeListText(labeled.graph), '2 1\n0 1');
});

test('edge import rejects ambiguous options, bad one-based IDs, and oversized labels before allocation', () => {
  assert.throws(
    () =>
      parseEdgeListText('2 1\n0 1 a', { indexBase: 1, edgeValues: 'label' }),
    /out of range 1\.\.2/
  );
  assert.throws(
    () =>
      parseEdgeListText('2 1\n1 3 a', { indexBase: 1, edgeValues: 'label' }),
    /out of range 1\.\.2/
  );
  assert.throws(() => parseEdgeListText('1001 0'), /Node count.*1,000/);
  assert.throws(() => parseEdgeListText('2 5001'), /Edge count.*5,000/);
  assert.throws(
    () => parseEdgeListText('2 0', { indexBase: '1' }),
    /vertex IDs/
  );
  assert.throws(
    () => parseEdgeListText('2 0', { edgeValues: 'auto' }),
    /weights or text/
  );
  assert.throws(
    () =>
      parseEdgeListText(`2 1\n0 1 ${'x'.repeat(201)}`, { edgeValues: 'label' }),
    /label length.*200/
  );
});
