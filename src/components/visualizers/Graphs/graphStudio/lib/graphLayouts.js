import { VIEWBOX_HEIGHT, VIEWBOX_WIDTH } from '../constants';
import { clampNodePosition } from './graphGeometry';

export const circularLayout = graph => {
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
  const adjacency = new Map(nodes.map(node => [String(node.id), []]));
  edges.forEach(edge => {
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
    children.forEach(childId => {
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
        })
      );
    });
  });
  let unplacedCursor = 0;
  const unplaced = nodes.filter(node => !placed.has(String(node.id)));
  unplaced.forEach(node => {
    const row = Math.floor(unplacedCursor / 6);
    const col = unplacedCursor % 6;
    unplacedCursor += 1;
    placed.set(
      String(node.id),
      clampNodePosition({
        x: 220 + col * 150,
        y: 160 + (levels.length + row) * 140,
      })
    );
  });
  return {
    ...graph,
    nodes: nodes.map(node => ({
      ...node,
      ...(placed.get(String(node.id)) ?? { x: node.x, y: node.y }),
    })),
  };
};

export const forceDirectedLayout = (graph, iterations = 120, strength = 1) => {
  const nodes = (graph.nodes ?? []).map(node => ({ ...node }));
  const edges = graph.edges ?? [];
  if (nodes.length <= 1) return graph;
  const normalizedStrength = Math.max(
    0.2,
    Math.min(2, Number.isFinite(Number(strength)) ? Number(strength) : 1)
  );
  const k =
    Math.sqrt((VIEWBOX_WIDTH * VIEWBOX_HEIGHT) / nodes.length) *
    (0.32 + normalizedStrength * 0.16);
  const repulsionScale = 0.72 + normalizedStrength * 0.28;
  const attractionScale = 0.01 + normalizedStrength * 0.007;
  const velocityScale = 0.028 + normalizedStrength * 0.012;
  const damping = 0.78;
  const velocities = new Map(
    nodes.map(node => [String(node.id), { x: 0, y: 0 }])
  );
  for (let step = 0; step < iterations; step += 1) {
    const forces = new Map(
      nodes.map(node => [String(node.id), { x: 0, y: 0 }])
    );
    for (let i = 0; i < nodes.length; i += 1) {
      for (let j = i + 1; j < nodes.length; j += 1) {
        const a = nodes[i];
        const b = nodes[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const distance = Math.max(1, Math.sqrt(dx * dx + dy * dy));
        const repulsion = ((k * k) / distance) * repulsionScale;
        const ux = dx / distance;
        const uy = dy / distance;
        forces.get(String(a.id)).x -= ux * repulsion;
        forces.get(String(a.id)).y -= uy * repulsion;
        forces.get(String(b.id)).x += ux * repulsion;
        forces.get(String(b.id)).y += uy * repulsion;
      }
    }
    edges.forEach(edge => {
      const from = nodes.find(node => String(node.id) === String(edge.from));
      const to = nodes.find(node => String(node.id) === String(edge.to));
      if (!from || !to) return;
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const distance = Math.max(1, Math.sqrt(dx * dx + dy * dy));
      const attraction = (distance * distance) / Math.max(k, 1);
      const ux = dx / distance;
      const uy = dy / distance;
      forces.get(String(from.id)).x += ux * attraction * attractionScale;
      forces.get(String(from.id)).y += uy * attraction * attractionScale;
      forces.get(String(to.id)).x -= ux * attraction * attractionScale;
      forces.get(String(to.id)).y -= uy * attraction * attractionScale;
    });
    nodes.forEach(node => {
      const force = forces.get(String(node.id));
      const velocity = velocities.get(String(node.id));
      velocity.x = (velocity.x + force.x * velocityScale) * damping;
      velocity.y = (velocity.y + force.y * velocityScale) * damping;
      node.x += velocity.x;
      node.y += velocity.y;
      const bounded = clampNodePosition({ x: node.x, y: node.y });
      node.x = bounded.x;
      node.y = bounded.y;
    });
  }
  return { ...graph, nodes };
};
