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
  position: 'top-center',
});
const graph = (labels, points, edges, directed = false) => ({
  nodes: labels.map((label, id) => ({
    id,
    label,
    x: points[id][0],
    y: points[id][1],
    annotationPlacement: 'below',
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
  const frame = (captionText, description) =>
    steps.push({
      id: `s${steps.length}`,
      captionText,
      description,
      durationMs: Math.min(3000, Math.max(1800, 600 + captionText.length * 45)),
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
    nodeLabelFontSize: 24,
    edgeWidth: 3,
    edgeLabelFontSize: 20,
    edgeCurvature: 0.3,
  },
  captionOverlay: {
    enabled: true,
    position: { x: 0.5, y: 1 },
    style: 'walkthrough',
    size: 'large',
    fontSize: 16,
  },
});
const incidentEdges = (g, id) =>
  g.edges
    .filter(e => e.from === id || (!e.directed && e.to === id))
    .map(edge => ({ edge, next: edge.from === id ? edge.to : edge.from }));

// Equal depth spacing, centered siblings, and a straight link to C's only child.
// Both traversals use the same undirected tree so the queue/stack is the change.
const tree = () =>
  graph(
    ['A', 'B', 'C', 'D', 'E', 'F'],
    [
      [480, 100],
      [300, 210],
      [660, 210],
      [180, 320],
      [420, 320],
      [660, 320],
    ],
    [
      [0, 1],
      [0, 2],
      [1, 3],
      [1, 4],
      [2, 5],
    ]
  );

const bfs = () => {
  const g = tree(),
    t = timeline(g),
    queue = [0],
    seen = new Set([0]),
    distance = [0];
  t.node(0, 'queued');
  t.frame(
    'Start at A · Queue: A',
    'Put A in the queue at distance 0. BFS processes the front of this FIFO queue, so every node at one distance is visited before the next level.'
  );
  while (queue.length) {
    const id = queue.shift();
    t.node(id, 'active');
    t.frame(
      `Visit ${g.nodes[id].label} · Queue: ${queue.map(i => g.nodes[i].label).join(' → ') || 'empty'}`,
      `Remove ${g.nodes[id].label} from the front of the queue. Its distance from A is ${distance[id]}; now inspect its neighbors and enqueue only those not discovered before.`
    );
    const discovered = [];
    const treeEdges = [];
    for (const { edge, next } of incidentEdges(g, id)) {
      if (seen.has(next)) continue;
      seen.add(next);
      queue.push(next);
      distance[next] = distance[id] + 1;
      discovered.push(g.nodes[next].label);
      treeEdges.push(edge);
      t.node(next, 'queued');
      t.edge(edge.id, C.nodeActive, 'active');
    }
    if (discovered.length)
      t.frame(
        `Queue ${discovered.join(', ')} · Distance from A: ${distance[id] + 1}`,
        `Discover ${discovered.join(' and ')} from ${g.nodes[id].label} and mark them before enqueueing, so each enters the queue once. Queue, front first: ${queue.map(i => g.nodes[i].label).join(', ')}.`
      );
    t.node(id, 'visited');
    treeEdges.forEach(e => t.edge(e.id, C.edgeCompleted, 'completed'));
  }
  t.frame(
    'BFS complete · Order: A, B, C, D, E, F',
    'The queue is empty. BFS visited A first, then B and C at distance 1, then D, E, and F at distance 2. Green edges form the breadth-first search tree.'
  );
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
  const g = tree(),
    t = timeline(g),
    stack = [],
    order = [],
    seen = new Set();
  const visit = (id, parentEdge) => {
    seen.add(id);
    stack.push(id);
    order.push(g.nodes[id].label);
    t.node(id, 'active');
    t.frame(
      `Enter ${g.nodes[id].label} · Stack: ${stack.map(i => g.nodes[i].label).join(' → ')}`,
      `Push ${g.nodes[id].label} onto the recursion stack and record its first visit. Explore the next unvisited neighbor before returning; the active nodes show the entire current call path.`
    );
    for (const { edge, next } of incidentEdges(g, id)) {
      if (seen.has(next)) continue;
      t.edge(edge.id, C.nodeActive, 'active');
      visit(next, edge);
    }
    stack.pop();
    t.node(id, 'visited');
    if (parentEdge) t.edge(parentEdge.id, C.edgeCompleted, 'completed');
    t.frame(
      stack.length
        ? `Return ${g.nodes[id].label} → ${g.nodes[stack.at(-1)].label} · Stack: ${stack.map(i => g.nodes[i].label).join(' → ')}`
        : 'Finish A · Stack: empty',
      `${g.nodes[id].label} has no unvisited neighbors left. Mark it finished and pop its call; ${stack.length ? `resume ${g.nodes[stack.at(-1)].label} to check its remaining neighbors.` : 'every reachable node has now finished.'}`
    );
  };
  visit(0);
  t.frame(
    `DFS complete · Order: ${order.join(', ')}`,
    `First-visit order is ${order.join(', ')}. Unlike BFS, DFS completely explores B's subtree before returning to A and starting C's subtree. The edges are undirected; the recursion stack determines movement.`
  );
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
          [100, 240],
          [300, 130],
          // The lower row is offset enough that outgoing diagonals clear d=….
          [440, 350],
          [540, 130],
          [680, 350],
          [810, 240],
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
          [160, 240],
          [460, 130],
          [320, 350],
          [670, 240],
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
        `d=${Number.isFinite(distance[n.id]) ? distance[n.id] : '∞'}`;
    });
  labels();
  t.node(0, 'queued');
  t.frame(
    `Start at ${g.nodes[0].label} · Distance: 0; all others: ∞`,
    `Set d(${g.nodes[0].label}) to 0 and all other tentative distances to infinity. The label below each node is its current distance estimate; arrows show the allowed travel direction and edge labels are nonnegative weights.`
  );
  while (done.size < g.nodes.length) {
    const id = g.nodes
      .filter(n => !done.has(n.id))
      .sort((a, b) => distance[a.id] - distance[b.id])[0]?.id;
    if (id === undefined || !Number.isFinite(distance[id])) break;
    t.node(id, 'active');
    if (parent.has(id)) t.edge(parent.get(id), C.edgeCompleted, 'completed');
    t.frame(
      `Settle ${g.nodes[id].label} · Minimum distance: ${distance[id]}`,
      `${g.nodes[id].label} has the smallest tentative distance among unsettled nodes. With nonnegative weights, this distance is final. Inspect its outgoing edges to improve the remaining estimates.`
    );
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
          `Relax ${g.nodes[id].label} → ${g.nodes[e.to].label} · Distance: ${Number.isFinite(old) ? old : '∞'} → ${next}`,
          `Going through ${g.nodes[id].label} costs ${distance[id]} + ${e.label} = ${next}, less than ${Number.isFinite(old) ? `the previous estimate ${old}` : 'infinity'}. Update ${g.nodes[e.to].label}'s tentative distance and remember this edge as its best parent so far.`
        );
      } else {
        t.frame(
          `Keep ${g.nodes[e.to].label}'s distance · ${next === old ? `Tie at ${old}` : `${next} is no better than ${old}`}`,
          `The route through ${g.nodes[id].label} costs ${distance[id]} + ${e.label} = ${next}. ${next === old ? 'An equal-length route does not improve the answer; keep the first parent for a stable shortest-path tree.' : `Keep the smaller distance ${old} and its existing parent edge.`}`
        );
      }
    }
    done.add(id);
    t.node(id, 'visited');
  }
  t.frame(
    extended
      ? 'Shortest paths complete · S → T costs 8'
      : 'Shortest paths complete · A → D costs 4',
    `All reachable nodes are settled. Green edges form one shortest-path tree from ${g.nodes[0].label}. Final distances: ${g.nodes.map(n => `${n.label}=${distance[n.id]}`).join(', ')}.`
  );
  return presentation(
    g,
    t,
    legend('Dijkstra · d = distance', [
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
      [140, 130],
      [260, 330],
      [380, 130],
      [500, 330],
      [620, 130],
      [740, 330],
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
  t.frame(
    'Start Kruskal · Consider weights in increasing order',
    'Begin with six separate components and no chosen edges. Process undirected edges from smallest to largest weight; accept an edge only when it joins two different components.'
  );
  for (const e of [...g.edges].sort(
    (a, b) => Number(a.label) - Number(b.label)
  )) {
    t.edge(e.id, C.nodeActive, 'active');
    t.node(e.from, 'active');
    t.node(e.to, 'active');
    t.frame(
      `Try ${g.nodes[e.from].label}–${g.nodes[e.to].label} · Weight: ${e.label}`,
      `This is the lightest unprocessed edge. Compare the components containing ${g.nodes[e.from].label} and ${g.nodes[e.to].label}; the highlighted endpoints identify the proposed connection.`
    );
    if (find(e.from) === find(e.to)) {
      t.edge(e.id, C.edgeRejected, 'rejected');
      t.frame(
        `Reject ${g.nodes[e.from].label}–${g.nodes[e.to].label} · Same component: a cycle`,
        `The accepted edges already connect ${g.nodes[e.from].label} and ${g.nodes[e.to].label}. Adding this edge would form a cycle, so leave the tree and total weight unchanged at ${total}.`
      );
    } else {
      parent[find(e.to)] = find(e.from);
      count++;
      total += Number(e.label);
      t.edge(e.id, C.edgeCompleted, 'completed');
      t.frame(
        `Accept ${g.nodes[e.from].label}–${g.nodes[e.to].label} · ${count} of 5 edges; total weight: ${total}`,
        `The endpoints belong to different components, so this edge joins them without a cycle. The forest now has ${g.nodes.length - count} components and ${count} accepted edges with total weight ${total}.`
      );
    }
    t.node(e.from, 'default');
    t.node(e.to, 'default');
    if (count === g.nodes.length - 1) break;
  }
  t.frame(
    `MST complete · ${count} edges; total weight: ${total}`,
    `The ${count} accepted edges connect all six nodes without a cycle. Stop after n−1 edges; the remaining heavier edges need not be considered. This minimum spanning tree has total weight ${total}.`
  );
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
      [140, 130],
      [140, 330],
      [360, 230],
      [580, 130],
      [580, 330],
      [800, 230],
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
      t.nodes[n.id].annotation = `in=${indegree[n.id]}`;
    });
  g.nodes
    .filter(n => indegree[n.id] === 0)
    .forEach(n => {
      queue.push(n.id);
      t.node(n.id, 'queued');
    });
  labels();
  t.frame(
    'Start Kahn’s algorithm · Ready: A, B',
    'Count each node’s incoming edges; the value below it is its remaining indegree. A and B have indegree 0, so both can enter the ready queue. Every arrow points from a prerequisite toward a dependent node.'
  );
  while (queue.length) {
    const id = queue.shift();
    t.node(id, 'active');
    order.push(g.nodes[id].label);
    t.frame(
      `Output ${g.nodes[id].label} · Order: ${order.join(', ')}`,
      `${g.nodes[id].label} has no remaining prerequisites. Remove it from the ready queue and append it to the order, then remove its outgoing edges from the remaining graph.`
    );
    const updates = [];
    for (const e of g.edges.filter(e => e.from === id)) {
      t.edge(e.id, C.edgeCompleted, 'completed');
      const previous = indegree[e.to];
      indegree[e.to]--;
      updates.push(`${g.nodes[e.to].label}: ${previous} → ${indegree[e.to]}`);
      if (indegree[e.to] === 0) {
        queue.push(e.to);
        t.node(e.to, 'queued');
      }
    }
    labels();
    t.node(id, 'visited');
    if (queue.length)
      t.frame(
        `Remove ${g.nodes[id].label}'s outgoing edges · Ready: ${queue.map(i => g.nodes[i].label).join(', ')}`,
        `${updates.length ? `Remaining indegrees change: ${updates.join('; ')}.` : `${g.nodes[id].label} has no outgoing edges.`} A node enters the ready queue exactly when its remaining indegree becomes 0.`
      );
  }
  t.frame(
    'Topological order complete · A, B, C, D, E, F',
    `Every node was output, so the graph is acyclic. In the order ${order.join(', ')}, each directed edge goes from an earlier node to a later one. Other valid orders are possible when multiple nodes are ready.`
  );
  return presentation(
    g,
    t,
    legend('Kahn · in = indegree', [
      nodeKey('Ready', 'queued'),
      nodeKey('Current', 'active'),
      nodeKey('Output', 'visited'),
      edgeKey('Removed', C.edgeCompleted, 'completed'),
    ])
  );
};
const componentColors = ['#BFDBFE', '#FED7AA', '#DDD6FE'];
const dsu = () => {
  // Two compact rows show the sets before their connecting request is processed.
  // Node 1 sits above the closing 0–2 edge, so that cycle is a clear triangle.
  const g = graph(
    ['0', '1', '2', '3', '4', '5'],
    [
      [120, 160],
      [320, 80],
      [520, 160],
      [240, 300],
      [440, 300],
      [640, 300],
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
        annotation: `root=${root}`,
        color:
          members === 1
            ? C.nodeDefault
            : root === 0
              ? componentColors[0]
              : componentColors[1],
      });
    });
  mark();
  t.frame(
    'Six separate sets · Below each node: root',
    'Each node begins as its own representative. Gray edges are upcoming union requests in the input graph, not DSU parent pointers. The annotation shows find(node), and matching colors show sets already merged.'
  );
  for (const e of g.edges) {
    const a = find(e.from),
      b = find(e.to);
    if (a === b) {
      t.edge(e.id, C.edgeRejected, 'rejected');
      t.frame(
        `Skip ${e.from}–${e.to} · Both already have root ${a}`,
        `find(${e.from}) = find(${e.to}) = ${a}, so this union changes nothing. Adding this input edge to the accepted connections would close a cycle; the red edge shows that redundant request.`
      );
    } else {
      parent[b] = a;
      mark();
      t.edge(e.id, C.edgeCompleted, 'completed');
      t.frame(
        `Union ${e.from}, ${e.to} · Merge roots ${a} and ${b}`,
        `find(${e.from}) is ${a} and find(${e.to}) is ${b}. Attach representative ${b} to ${a}; every member of the merged set now reports root ${a}. The green edge records the successful union request.`
      );
    }
  }
  t.frame(
    'One set remains · All six nodes have root 0',
    'Five successful unions connected all six nodes. The last request joined nodes already in the same set, so it did not change any representative. This example illustrates union and find without rank balancing or path compression.'
  );
  return presentation(
    g,
    t,
    legend('Disjoint sets', [
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
      [160, 230],
      [280, 140],
      [280, 320],
      [430, 230],
      [550, 230],
      [700, 140],
      [820, 230],
      [700, 320],
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
    t.frame(
      `Start component ${component} · Seed: ${start.label}`,
      `${start.label} has not been reached by any previous search. Start a fresh BFS here; every node reached by this search belongs to component ${component}. The separated clusters make the absence of connecting edges visible.`
    );
    const members = [];
    while (queue.length) {
      const id = queue.shift();
      members.push(id);
      t.node(id, 'default', {
        color: componentColors[component - 1],
        annotation: `group=${component}`,
      });
      for (const e of g.edges.filter(e => e.from === id || e.to === id)) {
        const next = e.from === id ? e.to : e.from;
        if (seen.has(next)) continue;
        seen.add(next);
        queue.push(next);
        t.node(next, 'queued');
        t.edge(e.id, C.edgeCompleted, 'completed');
      }
      t.frame(
        `Explore ${id} · Group ${component}: ${members.join(', ')}; queue: ${queue.join(', ') || 'empty'}`,
        `Assign node ${id} to component ${component} and inspect all its undirected neighbors. Newly discovered neighbors enter this search's queue. ${queue.length ? 'Continue until this component’s queue is empty.' : 'The queue is empty; scan for the next unvisited node.'}`
      );
    }
  }
  t.frame(
    'Three components · {0,1,2}  {3,4}  {5,6,7}',
    'Every node has a component number. Nodes within a group are connected by paths, and there is no path between different groups. Three BFS launches were needed, one for each connected component.'
  );
  return presentation(
    g,
    t,
    legend('Connected components', [
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
      [200, 170],
      [680, 170],
      [440, 350],
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
  t.frame(
    'Start at A · Three distinct edges lead to B',
    'The edge labels e1, e2, and e3 identify three separate directed edges with the same endpoints A and B. These labels are names, not weights; the curved lanes keep their identities visible.'
  );
  ['e0', 'e1', 'e2'].forEach(id => t.edge(id, C.nodeActive, 'active'));
  t.frame(
    'Inspect parallel edges · e1, e2, e3 all connect A → B',
    'Each highlighted lane is an independent edge. Choosing, deleting, or changing one edge does not change the others, even though their source and target are identical.'
  );
  t.edge('e0', C.edgeDefault);
  t.edge('e2', C.edgeDefault);
  t.edge('e1', C.edgeCompleted, 'completed');
  t.node(0, 'visited');
  t.node(1, 'active');
  t.frame(
    'Follow e2 · Move from A to B',
    'Choose the middle edge e2 as one possible move. All three edges reach B, and no weight has been assigned to compare their costs. This is a walk demonstration, not an optimization algorithm.'
  );
  t.edge('e3', C.nodeActive, 'active');
  t.frame(
    'Inspect B’s self-loop · Source and target are both B',
    'The loop is a real directed edge from B back to B. Traversing it adds one edge to a walk while leaving the current vertex unchanged.'
  );
  t.edge('e3', C.edgeDefault);
  t.edge('e4', C.edgeCompleted, 'completed');
  t.node(1, 'visited');
  t.node(2, 'active');
  t.frame(
    'Follow B → C · Current node: C',
    'Continue along the arrow from B to C. The chosen A-to-B lane stays green as part of the walk; the self-loop is no longer highlighted.'
  );
  t.edge('e5', C.edgeCompleted, 'completed');
  t.node(2, 'visited');
  t.node(0, 'active');
  t.frame(
    'Return C → A · The walk closes a directed cycle',
    'The chosen edges A → B, B → C, and C → A return to the starting node. They form a directed cycle; the unused parallel edges and B’s self-loop remain separate graph objects.'
  );
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
