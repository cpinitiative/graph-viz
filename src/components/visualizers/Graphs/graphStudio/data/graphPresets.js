import { GRAPH_STATE_COLORS as C } from '../lib/stateColors.js';

const nodeKey = (label, status, color) => ({
  kind: 'node',
  group: 'Nodes',
  label,
  status,
  color: color ?? C[`node${status[0].toUpperCase()}${status.slice(1)}`],
});
const edgeKey = (label, color, status = 'default') => ({
  kind: 'edge',
  group: 'Edges',
  label,
  color,
  status,
});
const legend = (title, entries) => ({
  title,
  entries,
  enabled: true,
  layout: 'compact',
  position: 'top-left',
});
const graph = (labels, points, edges, directed = false) => ({
  nodes: labels.map((label, id) => ({
    id,
    label,
    x: points[id][0],
    y: points[id][1],
    visible: true,
  })),
  edges: edges.map(([from, to, label = ''], i) => ({
    id: `e${i}`,
    from,
    to,
    label: String(label),
    directed,
    visible: true,
    color: C.edgeDefault,
  })),
});
// Every frame owns a complete visual snapshot: selecting frames out of order
// must never leave a stale candidate edge or a stale distance on screen.
const timeline = g => {
  const nodes = Object.fromEntries(
    g.nodes.map(n => [n.id, { status: 'default', color: '', annotation: '' }])
  );
  const edges = Object.fromEntries(
    g.edges.map(e => [e.id, { status: 'default', color: C.edgeDefault }])
  );
  const steps = [];
  const frame = description =>
    steps.push({
      id: `s${steps.length}`,
      description,
      durationMs: Math.min(3000, Math.max(1800, 600 + description.length * 45)),
      nodeOverrides: structuredClone(nodes),
      edgeOverrides: structuredClone(edges),
    });
  const node = (id, status, extra = {}) => {
    nodes[id] = { ...nodes[id], status, color: '', ...extra };
  };
  const edge = (id, color, status = 'default') => {
    edges[id] = { color, status };
  };
  return { nodes, edges, steps, frame, node, edge };
};
const presentation = (g, t, key) => ({
  graph: g,
  steps: t.steps,
  legend: key,
  settings: {
    nodeSize: 32,
    nodeLabelFontSize: 18,
    edgeWidth: 3,
    edgeLabelFontSize: 18,
    edgeCurvature: 0.3,
  },
  captionOverlay: {
    enabled: true,
    position: { x: 0, y: 1 },
    style: 'subtle',
    size: 'large',
    fontSize: 18,
  },
});
const tree = directed =>
  graph(
    ['A', 'B', 'C', 'D', 'E', 'F'],
    [
      [360, 80],
      [200, 240],
      [520, 240],
      [80, 400],
      [320, 400],
      [600, 400],
    ],
    [
      [0, 1],
      [0, 2],
      [1, 3],
      [1, 4],
      [2, 5],
    ],
    directed
  );

const bfs = () => {
  const g = tree(false),
    t = timeline(g),
    queue = [0],
    seen = new Set([0]);
  t.node(0, 'queued');
  t.frame('BFS · Queue: A');
  while (queue.length) {
    const id = queue.shift();
    t.node(id, 'active');
    t.frame(
      `Visit ${g.nodes[id].label} · Queue: ${queue.map(i => g.nodes[i].label).join(', ') || 'empty'}`
    );
    const discovered = [];
    for (const e of g.edges.filter(e => e.from === id)) {
      if (seen.has(e.to)) continue;
      seen.add(e.to);
      queue.push(e.to);
      discovered.push(g.nodes[e.to].label);
      t.node(e.to, 'queued');
      t.edge(e.id, C.nodeActive, 'active');
    }
    if (discovered.length)
      t.frame(`Queue ${discovered.join(', ')} · FIFO order`);
    t.node(id, 'visited');
    g.edges
      .filter(e => e.from === id)
      .forEach(e => t.edge(e.id, C.edgeCompleted, 'completed'));
  }
  t.frame('BFS order: A, B, C, D, E, F');
  return presentation(
    g,
    t,
    legend('BFS', [
      nodeKey('Current', 'active'),
      nodeKey('Queued', 'queued'),
      nodeKey('Done', 'visited'),
      edgeKey('Discover', C.nodeActive, 'active'),
      edgeKey('Tree edge', C.edgeCompleted, 'completed'),
    ])
  );
};
const dfs = () => {
  const g = tree(true),
    t = timeline(g),
    stack = [],
    order = [];
  const visit = id => {
    stack.push(id);
    order.push(g.nodes[id].label);
    t.node(id, 'active');
    t.frame(
      `Enter ${g.nodes[id].label} · Stack: ${stack.map(i => g.nodes[i].label).join(' → ')}`
    );
    for (const e of g.edges.filter(e => e.from === id)) {
      t.edge(e.id, C.nodeActive, 'active');
      visit(e.to);
      t.edge(e.id, C.edgeCompleted, 'completed');
    }
    stack.pop();
    t.node(id, 'visited');
    t.frame(
      stack.length
        ? `Return ${g.nodes[id].label} → ${g.nodes[stack.at(-1)].label}`
        : 'Return from A · Stack empty'
    );
  };
  visit(0);
  t.frame(`DFS order: ${order.join(', ')}`);
  return presentation(
    g,
    t,
    legend('DFS', [
      nodeKey('On stack', 'active'),
      nodeKey('Finished', 'visited'),
      edgeKey('Descend', C.nodeActive, 'active'),
      edgeKey('Returned', C.edgeCompleted, 'completed'),
    ])
  );
};
const dijkstra = extended => {
  const g = extended
    ? graph(
        ['S', 'A', 'B', 'C', 'D', 'T'],
        [
          [0, 180],
          [220, 0],
          [220, 360],
          [460, 0],
          [460, 360],
          [680, 180],
        ],
        [
          [0, 1, 2],
          [0, 2, 5],
          [1, 2, 1],
          [1, 3, 2],
          [2, 4, 2],
          [3, 4, 1],
          [3, 5, 7],
          [4, 5, 3],
        ],
        true
      )
    : graph(
        ['A', 'B', 'C', 'D'],
        [
          [0, 180],
          [240, 0],
          [240, 360],
          [480, 180],
        ],
        [
          [0, 1, 4],
          [0, 2, 1],
          [2, 1, 2],
          [1, 3, 1],
          [2, 3, 5],
        ],
        true
      );
  const t = timeline(g),
    distance = g.nodes.map(() => Infinity),
    parent = new Map(),
    done = new Set();
  distance[0] = 0;
  const labels = () =>
    g.nodes.forEach(n => {
      t.nodes[n.id].annotation =
        `${n.label}:${Number.isFinite(distance[n.id]) ? distance[n.id] : '∞'}`;
    });
  labels();
  t.node(0, 'queued');
  t.frame(`Dijkstra · ${g.nodes[0].label}=0; others=∞`);
  while (done.size < g.nodes.length) {
    const id = g.nodes
      .filter(n => !done.has(n.id))
      .sort((a, b) => distance[a.id] - distance[b.id])[0]?.id;
    if (id === undefined || !Number.isFinite(distance[id])) break;
    t.node(id, 'active');
    if (parent.has(id)) t.edge(parent.get(id), C.edgeCompleted, 'completed');
    t.frame(`Settle ${g.nodes[id].label} · Minimum distance ${distance[id]}`);
    for (const e of g.edges.filter(e => e.from === id && !done.has(e.to))) {
      const next = distance[id] + Number(e.label),
        old = distance[e.to];
      if (next < old) {
        if (parent.has(e.to)) t.edge(parent.get(e.to), C.edgeDefault);
        parent.set(e.to, e.id);
        distance[e.to] = next;
        t.node(e.to, 'queued');
        t.edge(e.id, C.nodeActive, 'active');
        labels();
        t.frame(
          `${g.nodes[id].label} → ${g.nodes[e.to].label}: ${distance[id]} + ${e.label} = ${next}${Number.isFinite(old) ? ` < ${old}` : ''}`
        );
      } else if (next === old) {
        t.frame(
          `${g.nodes[id].label} → ${g.nodes[e.to].label}: tie at ${old} · Keep first parent`
        );
      }
    }
    done.add(id);
    t.node(id, 'visited');
  }
  t.frame(
    extended ? 'Shortest paths from S · T = 8' : 'Shortest paths from A · D = 4'
  );
  return presentation(
    g,
    t,
    legend('Dijkstra · node:distance', [
      nodeKey('Current', 'active'),
      nodeKey('Candidate', 'queued'),
      nodeKey('Settled', 'visited'),
      edgeKey('Best so far', C.nodeActive, 'active'),
      edgeKey('Tree edge', C.edgeCompleted, 'completed'),
    ])
  );
};
const kruskal = () => {
  const g = graph(
    ['A', 'B', 'C', 'D', 'E', 'F'],
    [
      [0, 0],
      [100, 230],
      [280, 0],
      [380, 230],
      [560, 0],
      [560, 400],
    ],
    [
      [0, 1, 1],
      [1, 3, 2],
      [2, 4, 3],
      [0, 2, 4],
      [3, 4, 5],
      [4, 5, 6],
      [2, 3, 7],
      [1, 2, 8],
      [3, 5, 9],
    ]
  );
  const t = timeline(g),
    parent = g.nodes.map(n => n.id);
  const find = id => (parent[id] === id ? id : find(parent[id]));
  let count = 0,
    total = 0;
  t.frame('Kruskal · Try edges from lightest to heaviest');
  for (const e of [...g.edges].sort(
    (a, b) => Number(a.label) - Number(b.label)
  )) {
    t.edge(e.id, C.nodeActive, 'active');
    t.node(e.from, 'active');
    t.node(e.to, 'active');
    t.frame(
      `Try ${g.nodes[e.from].label}–${g.nodes[e.to].label} · Weight ${e.label}`
    );
    if (find(e.from) === find(e.to)) {
      t.edge(e.id, C.edgeRejected, 'rejected');
      t.frame(
        `Reject ${g.nodes[e.from].label}–${g.nodes[e.to].label} · Would form a cycle`
      );
    } else {
      parent[find(e.to)] = find(e.from);
      count++;
      total += Number(e.label);
      t.edge(e.id, C.edgeCompleted, 'completed');
      t.frame(
        `Accept ${g.nodes[e.from].label}–${g.nodes[e.to].label} · Total weight ${total}`
      );
    }
    t.node(e.from, 'default');
    t.node(e.to, 'default');
    if (count === g.nodes.length - 1) break;
  }
  t.frame(`MST complete · ${count} edges · Weight ${total}`);
  return presentation(
    g,
    t,
    legend('Kruskal MST', [
      nodeKey('Endpoints', 'active'),
      edgeKey('Try', C.nodeActive, 'active'),
      edgeKey('Accept', C.edgeCompleted, 'completed'),
      edgeKey('Reject', C.edgeRejected, 'rejected'),
      edgeKey('Unprocessed', C.edgeDefault),
    ])
  );
};
const topological = () => {
  const g = graph(
    ['A', 'B', 'C', 'D', 'E', 'F'],
    [
      [0, 0],
      [0, 260],
      [230, 130],
      [460, 0],
      [460, 260],
      [690, 130],
    ],
    [
      [0, 2],
      [1, 2],
      [2, 3],
      [2, 4],
      [3, 5],
      [4, 5],
    ],
    true
  );
  const t = timeline(g),
    indegree = g.nodes.map(n => g.edges.filter(e => e.to === n.id).length),
    queue = [],
    order = [];
  const labels = () =>
    g.nodes.forEach(n => {
      t.nodes[n.id].annotation = `${n.label}:${indegree[n.id]}`;
    });
  g.nodes
    .filter(n => indegree[n.id] === 0)
    .forEach(n => {
      queue.push(n.id);
      t.node(n.id, 'queued');
    });
  labels();
  t.frame('Kahn’s algorithm · A and B have indegree 0');
  while (queue.length) {
    const id = queue.shift();
    t.node(id, 'active');
    order.push(g.nodes[id].label);
    t.frame(`Output ${g.nodes[id].label} · Order: ${order.join(', ')}`);
    for (const e of g.edges.filter(e => e.from === id)) {
      t.edge(e.id, C.edgeCompleted, 'completed');
      indegree[e.to]--;
      if (indegree[e.to] === 0) {
        queue.push(e.to);
        t.node(e.to, 'queued');
      }
    }
    labels();
    t.node(id, 'visited');
    if (queue.length)
      t.frame(
        `Remove outgoing edges · Ready: ${queue.map(i => g.nodes[i].label).join(', ')}`
      );
  }
  t.frame(`Topological order: ${order.join(', ')}`);
  return presentation(
    g,
    t,
    legend('Topological sort · node:indegree', [
      nodeKey('Ready', 'queued'),
      nodeKey('Current', 'active'),
      nodeKey('Output', 'visited'),
      edgeKey('Removed', C.edgeCompleted, 'completed'),
    ])
  );
};
const componentColors = ['#BFDBFE', '#FED7AA', '#DDD6FE'];
const dsu = () => {
  // The cycle edge clears node 1; it must not look like two adjacent edges.
  const g = graph(
    ['0', '1', '2', '3', '4', '5'],
    [
      [0, 0],
      [220, -100],
      [440, 0],
      [0, 260],
      [220, 360],
      [440, 260],
    ],
    [
      [0, 1],
      [1, 2],
      [3, 4],
      [4, 5],
      [2, 5],
      [0, 2],
    ]
  );
  const t = timeline(g),
    parent = g.nodes.map(n => n.id);
  const find = id => (parent[id] === id ? id : find(parent[id]));
  const mark = () =>
    g.nodes.forEach(n => {
      const root = find(n.id),
        members = g.nodes.filter(m => find(m.id) === root).length;
      t.node(n.id, 'default', {
        annotation: `${n.id}:${root}`,
        color:
          members === 1
            ? C.nodeDefault
            : root === 0
              ? componentColors[0]
              : componentColors[1],
      });
    });
  mark();
  t.frame('DSU · Each node starts in its own set');
  for (const e of g.edges) {
    const a = find(e.from),
      b = find(e.to);
    if (a === b) {
      t.edge(e.id, C.edgeRejected, 'rejected');
      t.frame(`${e.from} and ${e.to}: same root ${a} · Reject cycle`);
    } else {
      parent[b] = a;
      mark();
      t.edge(e.id, C.edgeCompleted, 'completed');
      t.frame(`Union(${e.from}, ${e.to}) · Merge roots ${a} and ${b}`);
    }
  }
  t.frame('One set · All nodes have root 0');
  return presentation(
    g,
    t,
    legend('DSU · node:root', [
      nodeKey('Root 0', 'default', componentColors[0]),
      nodeKey('Root 3', 'default', componentColors[1]),
      edgeKey('Union', C.edgeCompleted, 'completed'),
      edgeKey('Cycle', C.edgeRejected, 'rejected'),
    ])
  );
};
const components = () => {
  const g = graph(
    ['0', '1', '2', '3', '4', '5', '6', '7'],
    [
      [0, 80],
      [160, 0],
      [160, 170],
      [390, 0],
      [560, 0],
      [390, 250],
      [560, 170],
      [710, 250],
    ],
    [
      [0, 1],
      [0, 2],
      [3, 4],
      [5, 6],
      [6, 7],
    ]
  );
  const t = timeline(g),
    seen = new Set();
  let component = 0;
  for (const start of g.nodes) {
    if (seen.has(start.id)) continue;
    component++;
    const queue = [start.id];
    seen.add(start.id);
    t.node(start.id, 'queued');
    t.frame(`Component ${component} · Start at ${start.label}`);
    const members = [];
    while (queue.length) {
      const id = queue.shift();
      members.push(id);
      t.node(id, 'default', {
        color: componentColors[component - 1],
        annotation: `${id}:${component}`,
      });
      for (const e of g.edges.filter(e => e.from === id || e.to === id)) {
        const next = e.from === id ? e.to : e.from;
        if (seen.has(next)) continue;
        seen.add(next);
        queue.push(next);
        t.node(next, 'queued');
        t.edge(e.id, C.edgeCompleted, 'completed');
      }
      t.frame(`Component ${component} · Found ${members.join(', ')}`);
    }
  }
  t.frame('3 components · {0,1,2}  {3,4}  {5,6,7}');
  return presentation(
    g,
    t,
    legend('Components · node:group', [
      ...componentColors.map((c, i) => nodeKey(`Group ${i + 1}`, 'default', c)),
      nodeKey('Frontier', 'queued'),
      edgeKey('Tree edge', C.edgeCompleted, 'completed'),
    ])
  );
};
const multigraph = () => {
  const g = graph(
    ['A', 'B', 'C'],
    [
      [0, 0],
      [360, 0],
      [180, 280],
    ],
    [
      [0, 1, 'e1'],
      [0, 1, 'e2'],
      [0, 1, 'e3'],
      [1, 1, 'loop'],
      [1, 2],
      [2, 0],
    ],
    true
  );
  const t = timeline(g);
  t.node(0, 'active');
  t.frame('Multigraph · Three distinct edges join A → B');
  ['e0', 'e1', 'e2'].forEach(id => t.edge(id, C.nodeActive, 'active'));
  t.frame('Parallel edges share endpoints, not identity');
  t.edge('e0', C.edgeDefault);
  t.edge('e2', C.edgeDefault);
  t.edge('e1', C.edgeCompleted, 'completed');
  t.node(0, 'visited');
  t.node(1, 'active');
  t.frame('Choose e2 · No weights imply no “best” edge');
  t.edge('e3', C.nodeActive, 'active');
  t.frame('Self-loop · B → B stays at the same node');
  t.edge('e3', C.edgeDefault);
  t.edge('e4', C.edgeCompleted, 'completed');
  t.node(1, 'visited');
  t.node(2, 'active');
  t.frame('Follow B → C');
  t.edge('e5', C.edgeCompleted, 'completed');
  t.node(2, 'visited');
  t.node(0, 'active');
  t.frame('Return C → A · A directed cycle');
  return presentation(
    g,
    t,
    legend('Parallel edges & loops', [
      nodeKey('Current', 'active'),
      nodeKey('Visited', 'visited'),
      edgeKey('Inspect', C.nodeActive, 'active'),
      edgeKey('Chosen', C.edgeCompleted, 'completed'),
    ])
  );
};

export const GRAPH_PRESETS = {
  bfs: bfs(),
  dfs: dfs(),
  dijkstra: dijkstra(false),
  'kruskal-mst': kruskal(),
  'dijkstra-shortest-paths': dijkstra(true),
  'topological-sort': topological(),
  'disjoint-set-union': dsu(),
  'connected-components': components(),
  multigraph: multigraph(),
};
