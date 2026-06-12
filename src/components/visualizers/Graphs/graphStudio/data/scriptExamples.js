export const SCRIPT_EXAMPLES = [
  {
    id: 'bfs',
    name: 'BFS',
    description: 'Queue-based breadth-first traversal from the first node.',
    code: `// Breadth-first search using the current graph.
const nodes = api.graph.nodes || [];
const edges = api.graph.edges || [];

if (!nodes.length) {
  api.push({ type: 'patch', description: 'Graph is empty; no BFS traversal.' });
} else {
  const ids = nodes.map(node => String(node.id));
  const labels = new Map(nodes.map(node => [String(node.id), node.label || String(node.id)]));
  const adjacency = new Map(ids.map(id => [id, []]));

  for (const edge of edges) {
    const from = String(edge.from);
    const to = String(edge.to);
    if (!adjacency.has(from) || !adjacency.has(to)) continue;
    adjacency.get(from).push({ to, edgeId: edge.id });
    if (edge.directed !== true) {
      adjacency.get(to).push({ to: from, edgeId: edge.id });
    }
  }

  const start = ids[0];
  const seen = new Set([start]);
  const queue = [start];

  api.push({
    type: 'node',
    id: start,
    status: 'queued',
    description: \`Start BFS at \${labels.get(start)}\`,
  });

  while (queue.length) {
    const current = queue.shift();
    api.push({
      type: 'node',
      id: current,
      status: 'active',
      description: \`Dequeue \${labels.get(current)}\`,
    });

    for (const next of adjacency.get(current)) {
      api.edge(next.edgeId, '#3B82F6');
      if (seen.has(next.to)) continue;
      seen.add(next.to);
      queue.push(next.to);
      api.push({
        type: 'node',
        id: next.to,
        status: 'queued',
        description: \`Queue \${labels.get(next.to)} from \${labels.get(current)}\`,
      });
    }

    api.push({
      type: 'node',
      id: current,
      status: 'visited',
      description: \`Visit \${labels.get(current)}\`,
    });
  }
}
`,
  },
  {
    id: 'dfs',
    name: 'DFS',
    description: 'Depth-first traversal across all connected components.',
    code: `// Depth-first search using the current graph.
const nodes = api.graph.nodes || [];
const edges = api.graph.edges || [];

if (!nodes.length) {
  api.push({ type: 'patch', description: 'Graph is empty; no DFS traversal.' });
} else {
  const ids = nodes.map(node => String(node.id));
  const labels = new Map(nodes.map(node => [String(node.id), node.label || String(node.id)]));
  const adjacency = new Map(ids.map(id => [id, []]));

  for (const edge of edges) {
    const from = String(edge.from);
    const to = String(edge.to);
    if (!adjacency.has(from) || !adjacency.has(to)) continue;
    adjacency.get(from).push({ to, edgeId: edge.id });
    if (edge.directed !== true) {
      adjacency.get(to).push({ to: from, edgeId: edge.id });
    }
  }

  const seen = new Set();

  function visit(id) {
    seen.add(id);
    api.push({
      type: 'node',
      id,
      status: 'active',
      description: \`Enter \${labels.get(id)}\`,
    });

    for (const next of adjacency.get(id)) {
      api.edge(next.edgeId, '#3B82F6');
      if (!seen.has(next.to)) visit(next.to);
    }

    api.push({
      type: 'node',
      id,
      status: 'visited',
      description: \`Finish \${labels.get(id)}\`,
    });
  }

  for (const id of ids) {
    if (!seen.has(id)) visit(id);
  }
}
`,
  },
  {
    id: 'topological-sort',
    name: 'Topological Sort',
    description: 'Kahn-style zero-indegree processing for directed structure.',
    code: `// Topological sort. Undirected edges are interpreted as drawn from -> to.
const nodes = api.graph.nodes || [];
const edges = api.graph.edges || [];

if (!nodes.length) {
  api.push({ type: 'patch', description: 'Graph is empty; no topological order.' });
} else {
  const ids = nodes.map(node => String(node.id));
  const labels = new Map(nodes.map(node => [String(node.id), node.label || String(node.id)]));
  const outgoing = new Map(ids.map(id => [id, []]));
  const indegree = new Map(ids.map(id => [id, 0]));

  for (const edge of edges) {
    const from = String(edge.from);
    const to = String(edge.to);
    if (!outgoing.has(from) || !indegree.has(to)) continue;
    outgoing.get(from).push({ to, edgeId: edge.id });
    indegree.set(to, indegree.get(to) + 1);
  }

  const queue = ids.filter(id => indegree.get(id) === 0);
  for (const id of queue) {
    api.push({
      type: 'node',
      id,
      status: 'queued',
      description: \`\${labels.get(id)} has indegree 0\`,
    });
  }

  const order = [];
  while (queue.length) {
    const current = queue.shift();
    order.push(current);
    api.push({
      type: 'node',
      id: current,
      status: 'active',
      description: \`Output \${labels.get(current)}\`,
    });

    for (const next of outgoing.get(current)) {
      api.edge(next.edgeId, '#3B82F6');
      indegree.set(next.to, indegree.get(next.to) - 1);
      if (indegree.get(next.to) === 0) {
        queue.push(next.to);
        api.queued(next.to);
      }
      api.edge(next.edgeId, '#22C55E');
    }

    api.visited(current);
  }

  if (order.length < ids.length) {
    api.push({
      type: 'patch',
      description: 'Cycle or missing direction detected; topological order is partial.',
    });
  }
}
`,
  },
  {
    id: 'dijkstra',
    name: 'Dijkstra Relaxation',
    description: 'Greedy shortest-path relaxation using numeric edge labels.',
    code: `// Dijkstra relaxation. Edge labels are used as weights when numeric.
const nodes = api.graph.nodes || [];
const edges = api.graph.edges || [];

if (!nodes.length) {
  api.push({ type: 'patch', description: 'Graph is empty; no distances to relax.' });
} else {
  const ids = nodes.map(node => String(node.id));
  const labels = new Map(nodes.map(node => [String(node.id), node.label || String(node.id)]));
  const adjacency = new Map(ids.map(id => [id, []]));

  const weightOf = edge => {
    const parsed = Number.parseFloat(edge.weight ?? edge.label);
    return Number.isFinite(parsed) ? parsed : 1;
  };

  for (const edge of edges) {
    const from = String(edge.from);
    const to = String(edge.to);
    if (!adjacency.has(from) || !adjacency.has(to)) continue;
    const item = { to, edgeId: edge.id, weight: weightOf(edge) };
    adjacency.get(from).push(item);
    if (edge.directed !== true) {
      adjacency.get(to).push({ to: from, edgeId: edge.id, weight: item.weight });
    }
  }

  const source = ids[0];
  const dist = new Map(ids.map(id => [id, Infinity]));
  const parentEdge = new Map();
  const done = new Set();
  dist.set(source, 0);
  api.push({
    type: 'node',
    id: source,
    status: 'queued',
    description: \`Initialize source \${labels.get(source)} at distance 0\`,
  });

  while (done.size < ids.length) {
    let current = null;
    for (const id of ids) {
      if (done.has(id)) continue;
      if (current === null || dist.get(id) < dist.get(current)) current = id;
    }
    if (current === null || dist.get(current) === Infinity) break;

    api.push({
      type: 'node',
      id: current,
      status: 'active',
      description: \`Settle \${labels.get(current)} at distance \${dist.get(current)}\`,
    });

    for (const next of adjacency.get(current)) {
      if (done.has(next.to)) continue;
      api.edge(next.edgeId, '#3B82F6');
      const candidate = dist.get(current) + next.weight;
      if (candidate < dist.get(next.to)) {
        dist.set(next.to, candidate);
        parentEdge.set(next.to, next.edgeId);
        api.push({
          type: 'node',
          id: next.to,
          status: 'queued',
          description: \`Relax \${labels.get(next.to)} to distance \${candidate}\`,
        });
      }
    }

    done.add(current);
    api.visited(current);
  }

  for (const edgeId of parentEdge.values()) {
    api.edge(edgeId, '#22C55E');
  }
}
`,
  },
  {
    id: 'kruskal',
    name: 'Kruskal Edge Processing',
    description: 'Sort weighted edges and accept those joining components.',
    code: `// Kruskal-style edge processing with a small DSU.
const nodes = api.graph.nodes || [];
const edges = api.graph.edges || [];

if (!nodes.length || !edges.length) {
  api.push({ type: 'patch', description: 'Graph needs nodes and edges for Kruskal processing.' });
} else {
  const ids = nodes.map(node => String(node.id));
  const labels = new Map(nodes.map(node => [String(node.id), node.label || String(node.id)]));
  const parent = new Map(ids.map(id => [id, id]));

  const find = id => {
    let root = id;
    while (parent.get(root) !== root) root = parent.get(root);
    while (parent.get(id) !== id) {
      const next = parent.get(id);
      parent.set(id, root);
      id = next;
    }
    return root;
  };

  const union = (a, b) => {
    const rootA = find(a);
    const rootB = find(b);
    if (rootA === rootB) return false;
    parent.set(rootB, rootA);
    return true;
  };

  const weightOf = edge => {
    const parsed = Number.parseFloat(edge.weight ?? edge.label);
    return Number.isFinite(parsed) ? parsed : 1;
  };

  const sortedEdges = edges
    .filter(edge => parent.has(String(edge.from)) && parent.has(String(edge.to)))
    .slice()
    .sort((a, b) => weightOf(a) - weightOf(b));

  for (const edge of sortedEdges) {
    const from = String(edge.from);
    const to = String(edge.to);
    api.active(from);
    api.active(to);
    api.edge(edge.id, '#F59E0B');

    if (union(from, to)) {
      api.edge(edge.id, '#22C55E');
      api.push({
        type: 'node',
        id: from,
        status: 'visited',
        description: \`Accept \${labels.get(from)}-\${labels.get(to)}\`,
      });
      api.visited(to);
    } else {
      api.push({
        type: 'edge',
        id: edge.id,
        color: '#DC2626',
        description: \`Reject \${labels.get(from)}-\${labels.get(to)} as a cycle\`,
      });
    }
  }
}
`,
  },
  {
    id: 'edge-coloring',
    name: 'Edge Coloring Demo',
    description: 'Walk every edge and apply a repeating highlight palette.',
    code: `// Edge coloring demo for inspecting edge ids and endpoint status.
const nodes = api.graph.nodes || [];
const edges = api.graph.edges || [];
const labels = new Map(nodes.map(node => [String(node.id), node.label || String(node.id)]));
const palette = ['#3B82F6', '#F59E0B', '#22C55E', '#DC2626'];

if (!edges.length) {
  api.push({ type: 'patch', description: 'Graph has no edges to color.' });
} else {
  edges.forEach((edge, index) => {
    const from = String(edge.from);
    const to = String(edge.to);
    const color = palette[index % palette.length];

    if (labels.has(from)) api.active(from);
    if (labels.has(to)) api.queued(to);
    api.push({
      type: 'edge',
      id: edge.id,
      color,
      description: \`Color edge \${edge.id}: \${labels.get(from) || from} to \${labels.get(to) || to}\`,
    });
    if (labels.has(from)) api.visited(from);
    if (labels.has(to)) api.visited(to);
  });
}
`,
  },
];
