import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GRAPH_PRESETS } from '../../src/components/visualizers/Graphs/graphStudio/data/graphPresets.js';
import { parseProjectJson } from '../../src/components/visualizers/Graphs/graphStudio/lib/projectJson.js';

for (const [name, preset] of Object.entries(GRAPH_PRESETS)) {
  test(`${name}: complete, bounded teaching frames and matching legend cues`, () => {
    const parsed = parseProjectJson(
      JSON.stringify({
        format: 'graph-viz-project',
        version: 1,
        graph: preset.graph,
        timeline: { steps: preset.steps },
      })
    );
    assert.equal(parsed.timeline.steps.length, preset.steps.length);
    for (const [nodeId, expected] of Object.entries(
      preset.steps.at(-1).nodeOverrides
    )) {
      const actual = parsed.timeline.steps.at(-1).nodeOverrides[nodeId];
      for (const [key, value] of Object.entries(expected)) {
        assert.deepEqual(actual[key], value);
      }
    }
    assert.ok(preset.legend.entries.length <= 5);
    for (const step of preset.steps) {
      assert.ok(step.description.length <= 64, step.description);
      assert.ok(step.durationMs >= 1800 && step.durationMs <= 3000);
      assert.equal(
        Object.keys(step.nodeOverrides).length,
        preset.graph.nodes.length
      );
      assert.equal(
        Object.keys(step.edgeOverrides).length,
        preset.graph.edges.length
      );
      for (const node of Object.values(step.nodeOverrides)) {
        assert.ok(node.annotation.length <= 4, node.annotation);
        if (node.status === 'default') continue;
        assert.ok(
          preset.legend.entries.some(
            e => e.kind === 'node' && e.status === node.status
          ),
          `${name}: missing ${node.status} key`
        );
      }
    }
  });
}

test('Dijkstra presets compute correct distances and a shortest-path tree', () => {
  for (const [key, expected] of [
    ['dijkstra', [0, 3, 1, 4]],
    ['dijkstra-shortest-paths', [0, 2, 3, 4, 5, 8]],
  ]) {
    const p = GRAPH_PRESETS[key],
      last = p.steps.at(-1);
    assert.deepEqual(
      p.graph.nodes.map(n =>
        Number(last.nodeOverrides[n.id].annotation.split(':')[1])
      ),
      expected
    );
    const tree = p.graph.edges.filter(
      e => last.edgeOverrides[e.id].status === 'completed'
    );
    assert.equal(tree.length, p.graph.nodes.length - 1);
    for (const e of tree)
      assert.equal(expected[e.from] + Number(e.label), expected[e.to]);
  }
});
test('Kruskal accepts an acyclic spanning tree of weight 16 and stops at n-1', () => {
  const p = GRAPH_PRESETS['kruskal-mst'],
    last = p.steps.at(-1),
    parent = p.graph.nodes.map(n => n.id);
  const find = i => (parent[i] === i ? i : find(parent[i]));
  const accepted = p.graph.edges.filter(
    e => last.edgeOverrides[e.id].status === 'completed'
  );
  assert.equal(accepted.length, 5);
  assert.equal(
    accepted.reduce((sum, e) => sum + Number(e.label), 0),
    16
  );
  for (const e of accepted) {
    assert.notEqual(find(e.from), find(e.to));
    parent[find(e.to)] = find(e.from);
  }
  assert.equal(last.edgeOverrides.e4.status, 'rejected');
  assert.equal(last.edgeOverrides.e6.status, 'default');
});
test('DSU cycle edge clears the intermediate node and labels end with the same root', () => {
  const p = GRAPH_PRESETS['disjoint-set-union'];
  assert.ok(
    Math.abs(p.graph.nodes[1].y - p.graph.nodes[0].y) > p.settings.nodeSize * 2
  );
  assert.ok(
    Object.values(p.steps.at(-1).nodeOverrides).every(n =>
      n.annotation.endsWith(':0')
    )
  );
  assert.equal(p.steps.at(-1).edgeOverrides.e5.status, 'rejected');
});

const assertUniqueIds = (items, label) => {
  const ids = items.map(item => String(item.id));
  assert.equal(
    new Set(ids).size,
    ids.length,
    `${label} must not contain duplicate ids`
  );
};

test('worked presets contain valid graph and timeline references', () => {
  for (const [presetName, preset] of Object.entries(GRAPH_PRESETS)) {
    const nodes = preset.graph?.nodes ?? [];
    const edges = preset.graph?.edges ?? [];
    const steps = preset.steps ?? [];
    const nodeIds = new Set(nodes.map(node => String(node.id)));
    const edgeIds = new Set(edges.map(edge => String(edge.id)));

    assert.ok(nodes.length > 0, `${presetName} needs at least one node`);
    assert.ok(
      steps.length >= 4,
      `${presetName} needs a useful worked timeline`
    );
    assertUniqueIds(nodes, `${presetName} nodes`);
    assertUniqueIds(edges, `${presetName} edges`);
    assertUniqueIds(steps, `${presetName} steps`);

    for (const edge of edges) {
      assert.ok(
        nodeIds.has(String(edge.from)),
        `${presetName} edge ${edge.id} has a missing source`
      );
      assert.ok(
        nodeIds.has(String(edge.to)),
        `${presetName} edge ${edge.id} has a missing target`
      );
    }

    for (const step of steps) {
      for (const nodeId of Object.keys(step.nodeOverrides ?? {})) {
        assert.ok(
          nodeIds.has(String(nodeId)),
          `${presetName} step ${step.id} overrides missing node ${nodeId}`
        );
      }
      for (const edgeId of Object.keys(step.edgeOverrides ?? {})) {
        assert.ok(
          edgeIds.has(String(edgeId)),
          `${presetName} step ${step.id} overrides missing edge ${edgeId}`
        );
      }
    }
  }
});

test('worked presets use explanatory captions and teaching legends', () => {
  for (const [presetName, preset] of Object.entries(GRAPH_PRESETS)) {
    for (const step of preset.steps) {
      const description = String(step.description ?? '').trim();
      assert.ok(
        description.length >= 12,
        `${presetName} step ${step.id} needs a more explanatory caption`
      );
      assert.doesNotMatch(
        description,
        /^step\s+\d+$/i,
        `${presetName} step ${step.id} uses a placeholder caption`
      );
    }

    const legend = preset.legend;
    assert.ok(legend, `${presetName} needs a teaching legend`);
    assert.ok(
      String(legend.title ?? '').trim().length >= 3,
      `${presetName} needs a descriptive legend title`
    );
    assert.doesNotMatch(
      legend.title,
      /\blegend\b/i,
      `${presetName} legend title should name the concept, not the component`
    );
    assert.ok(
      ['top-left', 'top-right', 'bottom-left', 'bottom-right'].includes(
        legend.position
      ),
      `${presetName} legend needs a stable corner position`
    );
    assert.ok(
      legend.entries.some(entry => entry.kind === 'node'),
      `${presetName} legend needs a node explanation`
    );
    assert.ok(
      legend.entries.some(entry => entry.kind === 'edge'),
      `${presetName} legend needs an edge explanation`
    );
    assert.equal(
      new Set(legend.entries.map(entry => entry.label)).size,
      legend.entries.length,
      `${presetName} legend labels must be unique`
    );
    for (const entry of legend.entries) {
      assert.ok(
        String(entry.label ?? '').trim().length >= 3,
        `${presetName} has an unclear legend label`
      );
      assert.match(
        entry.color,
        /^#[0-9a-f]{6}$/i,
        `${presetName} legend colors must be six-digit hex values`
      );
    }
  }
});
