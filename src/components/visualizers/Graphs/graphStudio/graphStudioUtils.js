import {
  GRID_SIZE,
  NODE_RADIUS,
  VIEWBOX_HEIGHT,
  VIEWBOX_WIDTH,
  DEFAULT_GRAPH,
} from "./constants";
export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export const clampNodePosition = ({ x, y }) => ({
  x: clamp(x, NODE_RADIUS + 8, VIEWBOX_WIDTH - NODE_RADIUS - 8),
  y: clamp(y, NODE_RADIUS + 8, VIEWBOX_HEIGHT - NODE_RADIUS - 8),
});
export const snapToGrid = (value, gridSize = GRID_SIZE) =>
  Math.round(value / gridSize) * gridSize;
export const normalizeNodeId = (rawId, fallback) => {
  if (Number.isFinite(Number(rawId))) return Number(rawId);
  const text = String(rawId ?? fallback);
  return text.trim() === "" ? String(fallback) : text;
};
export const normalizeBaseGraph = (payload = DEFAULT_GRAPH) => {
  const nodesInput = Array.isArray(payload?.nodes) ? payload.nodes : [];
  const edgesInput = Array.isArray(payload?.edges) ? payload.edges : [];
  const nodes = nodesInput
    .map((node, index) => {
      const id = normalizeNodeId(node.id, index);
      const position = clampNodePosition({
        x: Number(node.x ?? 120 + index * 90),
        y: Number(node.y ?? 120 + index * 70),
      });
      return {
        id,
        label: String(node.label ?? id),
        x: position.x,
        y: position.y,
        visible: node.visible !== false,
      };
    })
    .filter(
      (node, idx, all) =>
        all.findIndex((item) => String(item.id) === String(node.id)) === idx,
    );
  const nodeIds = new Set(nodes.map((node) => String(node.id)));
  const edges = edgesInput
    .map((edge, index) => {
      const from = normalizeNodeId(edge.from ?? edge.u ?? edge.source, index);
      const to = normalizeNodeId(edge.to ?? edge.v ?? edge.target, index + 1);
      if (
        !nodeIds.has(String(from)) ||
        !nodeIds.has(String(to)) ||
        String(from) === String(to)
      )
        return null;
      return {
        id: String(edge.id ?? `e${index}`),
        from,
        to,
        directed: Boolean(edge.directed),
        label: String(edge.label ?? edge.weight ?? ""),
        color: typeof edge.color === "string" ? edge.color : "#64748b",
        visible: edge.visible !== false,
        duration: clamp(Number(edge.duration ?? 450), 80, 3000),
        animationVersion: Number(edge.animationVersion ?? 0),
      };
    })
    .filter(Boolean);
  return { nodes, edges };
};
const normalizeStep = (step, index) => ({
  id: String(step?.id ?? `step-${index}`),
  description: String(step?.description ?? `Step ${index + 1}`),
  durationMs: clamp(Number(step?.durationMs ?? 600), 80, 8000),
  nodeOverrides:
    step?.nodeOverrides && typeof step.nodeOverrides === "object"
      ? JSON.parse(JSON.stringify(step.nodeOverrides))
      : {},
  edgeOverrides:
    step?.edgeOverrides && typeof step.edgeOverrides === "object"
      ? JSON.parse(JSON.stringify(step.edgeOverrides))
      : {},
});
export const normalizeTimelinePayload = (payload) => {
  if (payload?.baseGraph && Array.isArray(payload?.steps)) {
    return {
      baseGraph: normalizeBaseGraph(payload.baseGraph),
      steps: payload.steps.length
        ? payload.steps.map(normalizeStep)
        : [normalizeStep({}, 0)],
    };
  }
  return {
    baseGraph: normalizeBaseGraph(payload ?? DEFAULT_GRAPH),
    steps: [normalizeStep({}, 0)],
  };
};
export const getNodeMap = (nodes) => {
  const map = new Map();
  nodes.forEach((node) => map.set(String(node.id), node));
  return map;
};
export const computeStepDiff = (previousGraph, nextGraph) => {
  if (!previousGraph || !nextGraph)
    return { changedNodes: new Set(), changedEdges: new Set() };
  const changedNodes = new Set();
  const changedEdges = new Set();
  const prevNodeMap = new Map(
    previousGraph.nodes.map((node) => [String(node.id), node]),
  );
  nextGraph.nodes.forEach((node) => {
    const prev = prevNodeMap.get(String(node.id));
    if (!prev) {
      changedNodes.add(String(node.id));
      return;
    }
    const moved =
      Math.abs(prev.x - node.x) > 0.01 || Math.abs(prev.y - node.y) > 0.01;
    if (
      moved ||
      prev.label !== node.label ||
      prev.visible !== node.visible ||
      String(prev.status ?? "") !== String(node.status ?? "") ||
      String(prev.color ?? "") !== String(node.color ?? "")
    ) {
      changedNodes.add(String(node.id));
    }
  });
  const prevEdgeMap = new Map(
    previousGraph.edges.map((edge) => [String(edge.id), edge]),
  );
  nextGraph.edges.forEach((edge) => {
    const prev = prevEdgeMap.get(String(edge.id));
    if (!prev) {
      changedEdges.add(String(edge.id));
      return;
    }
    if (
      prev.from !== edge.from ||
      prev.to !== edge.to ||
      prev.label !== edge.label ||
      prev.visible !== edge.visible ||
      prev.directed !== edge.directed ||
      String(prev.color ?? "") !== String(edge.color ?? "")
    ) {
      changedEdges.add(String(edge.id));
    }
  });
  return { changedNodes, changedEdges };
};
export const parseEdgeListText = (text) => {
  const source = String(text ?? "").trim();
  if (!source)
    return { graph: normalizeBaseGraph(DEFAULT_GRAPH), meta: "empty" };
  const lines = source
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length)
    return { graph: normalizeBaseGraph(DEFAULT_GRAPH), meta: "empty" };
  const first = lines[0].split(/\s+/).map(Number);
  let n = 0;
  let m = 0;
  let startIndex = 0;
  if (
    first.length >= 2 &&
    Number.isFinite(first[0]) &&
    Number.isFinite(first[1])
  ) {
    n = first[0];
    m = first[1];
    startIndex = 1;
  }
  const parsedEdges = [];
  for (let index = startIndex; index < lines.length; index += 1) {
    if (m && parsedEdges.length >= m) break;
    const parts = lines[index].split(/\s+/);
    if (parts.length < 2) continue;
    const rawU = parts[0];
    const rawV = parts[1];
    const rawW = parts[2];
    const u = Number.isFinite(Number(rawU)) ? Number(rawU) : rawU;
    const v = Number.isFinite(Number(rawV)) ? Number(rawV) : rawV;
    parsedEdges.push({ from: u, to: v, label: rawW ?? "" });
  }
  const nodeSet = new Set();
  parsedEdges.forEach((edge) => {
    nodeSet.add(String(edge.from));
    nodeSet.add(String(edge.to));
  });
  if (n > 0) {
    for (let value = 0; value < n; value += 1) nodeSet.add(String(value));
  }
  const orderedIds = Array.from(nodeSet).map((id) =>
    Number.isFinite(Number(id)) ? Number(id) : id,
  );
  const radius = Math.max(180, Math.min(VIEWBOX_WIDTH, VIEWBOX_HEIGHT) / 2.8);
  const nodes = orderedIds.map((id, index) => {
    const angle = (index / Math.max(orderedIds.length, 1)) * Math.PI * 2;
    const centerX = VIEWBOX_WIDTH / 2;
    const centerY = VIEWBOX_HEIGHT / 2;
    return {
      id,
      label: String(id),
      x: clamp(
        centerX + Math.cos(angle) * radius,
        NODE_RADIUS + 8,
        VIEWBOX_WIDTH - NODE_RADIUS - 8,
      ),
      y: clamp(
        centerY + Math.sin(angle) * radius,
        NODE_RADIUS + 8,
        VIEWBOX_HEIGHT - NODE_RADIUS - 8,
      ),
      visible: true,
    };
  });
  const edges = parsedEdges.map((edge, index) => ({
    id: `e${index}`,
    from: edge.from,
    to: edge.to,
    label: edge.label,
    directed: false,
    color: "#64748b",
    duration: 450,
    visible: true,
  }));
  return {
    graph: normalizeBaseGraph({ nodes, edges }),
    meta: `${nodes.length} nodes / ${edges.length} edges`,
  };
};
export const exportEdgeListText = (graph) => {
  const nodes = graph?.nodes ?? [];
  const edges = graph?.edges ?? [];
  const header = `${nodes.length} ${edges.length}`;
  const body = edges
    .map(
      (edge) => `${edge.from} ${edge.to}${edge.label ? ` ${edge.label}` : ""}`,
    )
    .join("\n");
  return `${header}\n${body}`;
};
export const circularLayout = (graph) => {
  const nodes = graph.nodes ?? [];
  const radius = Math.max(220, Math.min(VIEWBOX_WIDTH, VIEWBOX_HEIGHT) / 2.9);
  const centerX = VIEWBOX_WIDTH / 2;
  const centerY = VIEWBOX_HEIGHT / 2;
  return {
    ...graph,
    nodes: nodes.map((node, index) => {
      const angle = (index / Math.max(nodes.length, 1)) * Math.PI * 2;
      return {
        ...node,
        ...clampNodePosition({
          x: centerX + Math.cos(angle) * radius,
          y: centerY + Math.sin(angle) * radius,
        }),
      };
    }),
  };
};
export const treeLayout = (graph, rootId) => {
  const nodes = graph.nodes ?? [];
  const edges = graph.edges ?? [];
  if (!nodes.length) return graph;
  const root = rootId ?? nodes[0].id;
  const adjacency = new Map(nodes.map((node) => [String(node.id), []]));
  edges.forEach((edge) => {
    adjacency.get(String(edge.from))?.push(String(edge.to));
    adjacency.get(String(edge.to))?.push(String(edge.from));
  });
  const levels = [];
  const visited = new Set();
  const queue = [{ id: String(root), depth: 0 }];
  visited.add(String(root));
  while (queue.length) {
    const { id, depth } = queue.shift();
    if (!levels[depth]) levels[depth] = [];
    levels[depth].push(id);
    const children = adjacency.get(id) ?? [];
    children.forEach((childId) => {
      if (!visited.has(childId)) {
        visited.add(childId);
        queue.push({ id: childId, depth: depth + 1 });
      }
    });
  }
  const placed = new Map();
  const horizontalPadding = 110;
  const verticalPadding = 180;
  levels.forEach((levelIds, depth) => {
    const totalWidth = Math.max(1, levelIds.length - 1) * horizontalPadding;
    const startX = VIEWBOX_WIDTH / 2 - totalWidth / 2;
    levelIds.forEach((id, index) => {
      placed.set(
        id,
        clampNodePosition({
          x: startX + index * horizontalPadding,
          y: 160 + depth * verticalPadding,
        }),
      );
    });
  });
  let unplacedCursor = 0;
  const unplaced = nodes.filter((node) => !placed.has(String(node.id)));
  unplaced.forEach((node) => {
    const row = Math.floor(unplacedCursor / 6);
    const col = unplacedCursor % 6;
    unplacedCursor += 1;
    placed.set(
      String(node.id),
      clampNodePosition({
        x: 220 + col * 150,
        y: 160 + (levels.length + row) * 140,
      }),
    );
  });
  return {
    ...graph,
    nodes: nodes.map((node) => ({
      ...node,
      ...(placed.get(String(node.id)) ?? { x: node.x, y: node.y }),
    })),
  };
};
export const forceDirectedLayout = (graph, iterations = 120) => {
  const nodes = (graph.nodes ?? []).map((node) => ({ ...node }));
  const edges = graph.edges ?? [];
  if (nodes.length <= 1) return graph;
  const k = Math.sqrt((VIEWBOX_WIDTH * VIEWBOX_HEIGHT) / nodes.length) * 0.45;
  const damping = 0.78;
  const velocities = new Map(
    nodes.map((node) => [String(node.id), { x: 0, y: 0 }]),
  );
  for (let step = 0; step < iterations; step += 1) {
    const forces = new Map(
      nodes.map((node) => [String(node.id), { x: 0, y: 0 }]),
    );
    for (let i = 0; i < nodes.length; i += 1) {
      for (let j = i + 1; j < nodes.length; j += 1) {
        const a = nodes[i];
        const b = nodes[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const distance = Math.max(1, Math.sqrt(dx * dx + dy * dy));
        const repulsion = (k * k) / distance;
        const ux = dx / distance;
        const uy = dy / distance;
        forces.get(String(a.id)).x -= ux * repulsion;
        forces.get(String(a.id)).y -= uy * repulsion;
        forces.get(String(b.id)).x += ux * repulsion;
        forces.get(String(b.id)).y += uy * repulsion;
      }
    }
    edges.forEach((edge) => {
      const from = nodes.find((node) => String(node.id) === String(edge.from));
      const to = nodes.find((node) => String(node.id) === String(edge.to));
      if (!from || !to) return;
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const distance = Math.max(1, Math.sqrt(dx * dx + dy * dy));
      const attraction = (distance * distance) / Math.max(k, 1);
      const ux = dx / distance;
      const uy = dy / distance;
      forces.get(String(from.id)).x += ux * attraction * 0.015;
      forces.get(String(from.id)).y += uy * attraction * 0.015;
      forces.get(String(to.id)).x -= ux * attraction * 0.015;
      forces.get(String(to.id)).y -= uy * attraction * 0.015;
    });
    nodes.forEach((node) => {
      const force = forces.get(String(node.id));
      const velocity = velocities.get(String(node.id));
      velocity.x = (velocity.x + force.x * 0.04) * damping;
      velocity.y = (velocity.y + force.y * 0.04) * damping;
      node.x += velocity.x;
      node.y += velocity.y;
      const bounded = clampNodePosition({ x: node.x, y: node.y });
      node.x = bounded.x;
      node.y = bounded.y;
    });
  }
  return { ...graph, nodes };
};
export const runScriptTrace = ({ code, graph }) => {
  const trace = [];
  const api = {
    graph,
    push: (entry) => trace.push(entry),
    active: (id) => trace.push({ type: "node", id, status: "active" }),
    visited: (id) => trace.push({ type: "node", id, status: "visited" }),
    queued: (id) => trace.push({ type: "node", id, status: "queued" }),
    edge: (id, color = "#f59e0b") => trace.push({ type: "edge", id, color }),
  };
  const fn = new Function("api", `'use strict';\n${code}\n`);
  fn(api);
  const steps = [
    {
      id: "step-0",
      description: "Initial",
      durationMs: 600,
      nodeOverrides: {},
      edgeOverrides: {},
    },
  ];
  trace.forEach((entry, index) => {
    const previous = steps[steps.length - 1];
    const next = {
      id: `step-${index + 1}`,
      description: String(entry.description ?? `${entry.type} ${entry.id}`),
      durationMs: clamp(Number(entry.durationMs ?? 650), 80, 8000),
      nodeOverrides: JSON.parse(JSON.stringify(previous.nodeOverrides ?? {})),
      edgeOverrides: JSON.parse(JSON.stringify(previous.edgeOverrides ?? {})),
    };
    if (entry.type === "node") {
      next.nodeOverrides[String(entry.id)] = {
        ...(next.nodeOverrides[String(entry.id)] ?? {}),
        status: entry.status ?? "active",
        color: entry.color,
      };
    }
    if (entry.type === "edge") {
      next.edgeOverrides[String(entry.id)] = {
        ...(next.edgeOverrides[String(entry.id)] ?? {}),
        color: entry.color ?? "#f59e0b",
      };
    }
    if (entry.type === "patch") {
      next.nodeOverrides = {
        ...next.nodeOverrides,
        ...(entry.nodeOverrides ?? {}),
      };
      next.edgeOverrides = {
        ...next.edgeOverrides,
        ...(entry.edgeOverrides ?? {}),
      };
    }
    steps.push(next);
  });
  return steps;
};
export const getSelectionBounds = (nodes) => {
  if (!nodes.length) return null;
  const xs = nodes.map((node) => node.x);
  const ys = nodes.map((node) => node.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
};
export const edgeBetweenSelected = (edge, selectedNodeIds) => {
  const fromSelected = selectedNodeIds.has(String(edge.from));
  const toSelected = selectedNodeIds.has(String(edge.to));
  return fromSelected && toSelected;
};
