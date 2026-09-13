import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GRAPH_PRESETS } from '../../src/components/visualizers/Graphs/graphStudio/data/graphPresets.js';
import {
  measureLabelRect,
  pointToSegmentDistance,
  rectOverlapArea,
} from '../../src/components/visualizers/Graphs/graphStudio/graphCanvasUtils.js';
import { getEdgeRenderData } from '../../src/components/visualizers/Graphs/graphStudio/lib/edgeRenderData.js';
import {
  estimateNodeTextWidth,
  getNodeAnnotationFontSize,
} from '../../src/components/visualizers/Graphs/graphStudio/lib/nodeGeometry.js';
import { parseProjectJson } from '../../src/components/visualizers/Graphs/graphStudio/lib/projectJson.js';

const numericAnnotation = node => Number(node.annotation.split('=')[1]);

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
    assert.deepEqual(
      parsed.timeline.steps.map(step => step.captionText),
      preset.steps.map(step => step.captionText)
    );
    assert.ok(
      parsed.graph.nodes.every(node => node.annotationPlacement === 'below')
    );
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
      assert.ok(step.description.length <= 300, step.description);
      const [action, detail, extra] = step.captionText.split(' · ');
      assert.ok(action.length > 0 && action.length <= 40, step.captionText);
      assert.ok(detail?.length > 0 && detail.length <= 65, step.captionText);
      assert.equal(extra, undefined, step.captionText);
      assert.notEqual(step.description, step.captionText);
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
        assert.ok(node.annotation.length <= 8, node.annotation);
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
      p.graph.nodes.map(n => numericAnnotation(last.nodeOverrides[n.id])),
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

const adjacency = graph => {
  const result = new Map(graph.nodes.map(node => [node.id, []]));
  for (const edge of graph.edges) {
    result.get(edge.from).push(edge.to);
    if (!edge.directed) result.get(edge.to).push(edge.from);
  }
  return result;
};

test('BFS and DFS walk the same undirected tree in queue and recursion order', () => {
  const bfs = GRAPH_PRESETS.bfs;
  const dfs = GRAPH_PRESETS.dfs;
  assert.deepEqual(bfs.graph, dfs.graph);
  assert.ok(bfs.graph.edges.every(edge => edge.directed === false));
  const neighbors = adjacency(bfs.graph);
  const queue = [0];
  const seen = new Set(queue);
  const breadthOrder = [];
  while (queue.length) {
    const node = queue.shift();
    breadthOrder.push(bfs.graph.nodes[node].label);
    for (const next of neighbors.get(node)) {
      if (seen.has(next)) continue;
      seen.add(next);
      queue.push(next);
    }
  }
  const depthOrder = [];
  seen.clear();
  const visit = node => {
    seen.add(node);
    depthOrder.push(dfs.graph.nodes[node].label);
    for (const next of neighbors.get(node)) if (!seen.has(next)) visit(next);
  };
  visit(0);
  assert.deepEqual(
    bfs.steps.flatMap(
      step => step.captionText.match(/^Visit (\w+)/)?.[1] ?? []
    ),
    breadthOrder
  );
  assert.deepEqual(
    dfs.steps.flatMap(
      step => step.captionText.match(/^Enter (\w+)/)?.[1] ?? []
    ),
    depthOrder
  );
  assert.notDeepEqual(breadthOrder, depthOrder);
  for (const preset of [bfs, dfs]) {
    assert.ok(
      Object.values(preset.steps.at(-1).nodeOverrides).every(
        node => node.status === 'visited'
      )
    );
    assert.ok(
      Object.values(preset.steps.at(-1).edgeOverrides).every(
        edge => edge.status === 'completed'
      )
    );
  }
});

test('distance annotations never increase and settled estimates match independent shortest paths', () => {
  for (const name of ['dijkstra', 'dijkstra-shortest-paths']) {
    const preset = GRAPH_PRESETS[name];
    const distances = preset.graph.nodes.map(() => Infinity);
    distances[0] = 0;
    // Bellman–Ford is independent of the preset's extract-min walkthrough.
    for (let pass = 1; pass < distances.length; pass++) {
      for (const edge of preset.graph.edges) {
        assert.ok(Number(edge.label) >= 0);
        distances[edge.to] = Math.min(
          distances[edge.to],
          distances[edge.from] + Number(edge.label)
        );
      }
    }
    const previous = preset.graph.nodes.map(() => Infinity);
    for (const step of preset.steps) {
      for (const node of preset.graph.nodes) {
        const visual = step.nodeOverrides[node.id];
        const current =
          visual.annotation === 'd=∞' ? Infinity : numericAnnotation(visual);
        assert.ok(current <= previous[node.id]);
        previous[node.id] = current;
        if (visual.status === 'visited' || visual.status === 'active') {
          assert.equal(
            current,
            distances[node.id],
            `${name}: settled ${node.label}`
          );
        }
      }
    }
  }
});

test('Kahn annotations count remaining incoming edges and its output respects every arrow', () => {
  const preset = GRAPH_PRESETS['topological-sort'];
  for (const step of preset.steps) {
    for (const node of preset.graph.nodes) {
      const visual = step.nodeOverrides[node.id];
      const remaining = preset.graph.edges.filter(
        edge =>
          edge.to === node.id &&
          step.edgeOverrides[edge.id].status !== 'completed'
      ).length;
      assert.equal(numericAnnotation(visual), remaining);
      if (visual.status === 'queued' || visual.status === 'active')
        assert.equal(remaining, 0);
    }
  }
  const order = preset.steps.flatMap(
    step => step.captionText.match(/^Output (\w+)/)?.[1] ?? []
  );
  assert.equal(new Set(order).size, preset.graph.nodes.length);
  for (const edge of preset.graph.edges) {
    assert.ok(
      order.indexOf(preset.graph.nodes[edge.from].label) <
        order.indexOf(preset.graph.nodes[edge.to].label)
    );
  }
});

const connectedRoots = (nodes, edges) => {
  const roots = nodes.map(node => node.id);
  const find = id => (roots[id] === id ? id : find(roots[id]));
  for (const edge of edges) roots[find(edge.to)] = find(edge.from);
  return nodes.map(node => find(node.id));
};

test('DSU and component annotations represent actual connectivity', () => {
  const dsu = GRAPH_PRESETS['disjoint-set-union'];
  for (const step of dsu.steps) {
    const accepted = dsu.graph.edges.filter(
      edge => step.edgeOverrides[edge.id].status === 'completed'
    );
    const roots = connectedRoots(dsu.graph.nodes, accepted);
    const annotations = dsu.graph.nodes.map(node =>
      numericAnnotation(step.nodeOverrides[node.id])
    );
    assert.deepEqual(annotations, roots);
    for (const edge of dsu.graph.edges.filter(
      edge => step.edgeOverrides[edge.id].status === 'rejected'
    ))
      assert.equal(roots[edge.from], roots[edge.to]);
  }
  const components = GRAPH_PRESETS['connected-components'];
  const roots = connectedRoots(components.graph.nodes, components.graph.edges);
  const groups = components.graph.nodes.map(node =>
    numericAnnotation(components.steps.at(-1).nodeOverrides[node.id])
  );
  assert.equal(new Set(groups).size, 3);
  for (let i = 0; i < roots.length; i++)
    for (let j = 0; j < roots.length; j++)
      assert.equal(groups[i] === groups[j], roots[i] === roots[j]);
});

const cross = (a, b, c) =>
  (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);

test('preset layers are compact and straight connections avoid other nodes and crossings', () => {
  for (const [name, preset] of Object.entries(GRAPH_PRESETS)) {
    const { nodes, edges } = preset.graph;
    const radius = preset.settings.nodeSize;
    assert.ok(
      Math.max(...nodes.map(node => node.y)) -
        Math.min(...nodes.map(node => node.y)) <=
        220,
      name
    );
    assert.ok(
      Math.max(...nodes.map(node => node.x)) -
        Math.min(...nodes.map(node => node.x)) <=
        720,
      name
    );
    for (let i = 0; i < nodes.length; i++)
      for (let j = i + 1; j < nodes.length; j++)
        assert.ok(
          Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y) >=
            radius * 2 + 24,
          `${name}: crowded nodes`
        );
    for (const edge of edges) {
      if (edge.from === edge.to) continue;
      const a = nodes[edge.from],
        b = nodes[edge.to];
      for (const node of nodes) {
        if (node.id === edge.from || node.id === edge.to) continue;
        assert.ok(
          pointToSegmentDistance(node.x, node.y, a.x, a.y, b.x, b.y) >
            radius + 16,
          `${name}: ${edge.id} crosses ${node.label}`
        );
      }
      for (const other of edges) {
        if (
          other.from === other.to ||
          [edge.from, edge.to].some(id => id === other.from || id === other.to)
        )
          continue;
        const c = nodes[other.from],
          d = nodes[other.to];
        assert.ok(
          !(
            cross(a, b, c) * cross(a, b, d) < 0 &&
            cross(c, d, a) * cross(c, d, b) < 0
          ),
          `${name}: crossing ${edge.id}/${other.id}`
        );
      }
    }
    assert.equal(preset.captionOverlay.style, 'walkthrough');
    assert.deepEqual(preset.captionOverlay.position, { x: 0.5, y: 1 });
  }
  const tree = GRAPH_PRESETS.bfs.graph.nodes;
  assert.equal(tree[0].x, (tree[1].x + tree[2].x) / 2);
  assert.equal(tree[1].x, (tree[3].x + tree[4].x) / 2);
  assert.equal(tree[2].x, tree[5].x);
  assert.equal(tree[1].y - tree[0].y, tree[3].y - tree[1].y);
  for (const name of [
    'dijkstra',
    'dijkstra-shortest-paths',
    'topological-sort',
  ]) {
    const { nodes, edges } = GRAPH_PRESETS[name].graph;
    assert.ok(
      edges.every(edge => nodes[edge.to].x > nodes[edge.from].x),
      `${name}: arrows should read left to right`
    );
  }
});

test('larger teaching edge labels clear node outlines and one another on every frame', () => {
  for (const [name, preset] of Object.entries(GRAPH_PRESETS)) {
    assert.equal(preset.settings.nodeLabelFontSize, 24);
    assert.equal(preset.settings.edgeLabelFontSize, 20);
    for (const step of preset.steps) {
      const nodes = preset.graph.nodes.map(node => ({
        ...node,
        ...step.nodeOverrides[node.id],
      }));
      const edges = preset.graph.edges.map(edge => ({
        ...edge,
        ...step.edgeOverrides[edge.id],
      }));
      const rendered = getEdgeRenderData({
        nodes,
        edges,
        nodeMap: new Map(nodes.map(node => [String(node.id), node])),
        edgeRouting: 'straight',
        edgeCurvature: preset.settings.edgeCurvature,
        nodeRadius: preset.settings.nodeSize,
        nodeLabelSize: preset.settings.nodeLabelFontSize,
        edgeLabelSize: preset.settings.edgeLabelFontSize,
      });
      const labels = rendered
        .filter(edge => edge.labelPosition)
        .map(edge => ({
          id: edge.edge.id,
          bounds: measureLabelRect(
            edge.labelPosition,
            edge.edge.label,
            preset.settings.edgeLabelFontSize
          ),
        }));
      for (const label of labels) {
        for (const node of nodes) {
          const dx = Math.max(
            label.bounds.left - node.x,
            0,
            node.x - label.bounds.right
          );
          const dy = Math.max(
            label.bounds.top - node.y,
            0,
            node.y - label.bounds.bottom
          );
          assert.ok(
            Math.hypot(dx, dy) >= preset.settings.nodeSize + 2,
            `${name}/${step.id}: ${label.id} label overlaps node ${node.label}`
          );
        }
      }
      for (let i = 0; i < labels.length; i++)
        for (let j = i + 1; j < labels.length; j++)
          assert.equal(
            rectOverlapArea(labels[i].bounds, labels[j].bounds),
            0,
            `${name}/${step.id}: overlapping labels ${labels[i].id}/${labels[j].id}`
          );
    }
  }
});

test('both Dijkstra presets leave room for every distance annotation, including infinity', () => {
  for (const name of ['dijkstra', 'dijkstra-shortest-paths']) {
    const preset = GRAPH_PRESETS[name];
    const fontSize = getNodeAnnotationFontSize(
      preset.settings.nodeLabelFontSize
    );
    for (const step of preset.steps) {
      const nodes = preset.graph.nodes.map(node => ({
        ...node,
        ...step.nodeOverrides[node.id],
      }));
      const rendered = getEdgeRenderData({
        nodes,
        edges: preset.graph.edges,
        nodeMap: new Map(nodes.map(node => [String(node.id), node])),
        edgeRouting: 'straight',
        edgeCurvature: preset.settings.edgeCurvature,
        nodeRadius: preset.settings.nodeSize,
        nodeLabelSize: preset.settings.nodeLabelFontSize,
        edgeLabelSize: preset.settings.edgeLabelFontSize,
      });
      for (const node of nodes) {
        const halfWidth = estimateNodeTextWidth(node.annotation, fontSize) / 2;
        const baseline = node.y + preset.settings.nodeSize + fontSize + 7;
        // Include the annotation halo and half the edge stroke in the clearance.
        const padding = (3 + preset.settings.edgeWidth) / 2;
        const left = node.x - halfWidth - padding;
        const right = node.x + halfWidth + padding;
        const top = baseline - fontSize - padding;
        const bottom = baseline + fontSize / 4 + padding;
        for (const edge of rendered) {
          assert.equal(edge.pathType, 'line');
          const [start, end] = edge.pathPoints;
          const samples = Math.ceil(
            Math.hypot(end.x - start.x, end.y - start.y)
          );
          for (let sample = 0; sample <= samples; sample++) {
            const x = start.x + ((end.x - start.x) * sample) / samples;
            const y = start.y + ((end.y - start.y) * sample) / samples;
            assert.ok(
              x < left || x > right || y < top || y > bottom,
              `${name}/${step.id}: ${edge.edge.id} touches ${node.label}'s ${node.annotation}`
            );
          }
        }
      }
    }
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
    Object.values(p.steps.at(-1).nodeOverrides).every(
      n => n.annotation === 'root=0'
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
      legend.position === 'top-center',
      `${presetName} legend needs a stable centered position`
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
