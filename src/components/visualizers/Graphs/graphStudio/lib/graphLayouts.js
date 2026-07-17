import { NODE_RADIUS, VIEWBOX_HEIGHT, VIEWBOX_WIDTH } from '../constants.js';
import { clampNodePosition } from './graphGeometry.js';

export const FORCE_STRENGTH_MIN = 0.2;
export const FORCE_STRENGTH_MAX = 2;
export const DEFAULT_FORCE_STRENGTH = 1;
export const FORCE_LAYOUT_ITERATIONS = 120;

const FORCE_EPSILON = 1e-6;
const FORCE_FINAL_TEMPERATURE = 0.2;
const FORCE_VIEWPORT_INSET = NODE_RADIUS + 8;

export const normalizeForceStrength = strength =>
  Math.max(
    FORCE_STRENGTH_MIN,
    Math.min(
      FORCE_STRENGTH_MAX,
      Number.isFinite(Number(strength))
        ? Number(strength)
        : DEFAULT_FORCE_STRENGTH
    )
  );

export const getForceLayoutOptions = strength => ({
  strength: normalizeForceStrength(strength),
  iterations: FORCE_LAYOUT_ITERATIONS,
});

const hashStableString = value => {
  let hash = 2166136261;
  for (const character of String(value)) {
    hash ^= character.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const getStablePairDirection = (left, right, leftIndex, rightIndex) => {
  const key = JSON.stringify([
    String(left.id),
    String(right.id),
    leftIndex,
    rightIndex,
  ]);
  const angle = (hashStableString(key) / 0x100000000) * Math.PI * 2;
  return { x: Math.cos(angle), y: Math.sin(angle) };
};

const getPairVector = (left, right, leftIndex, rightIndex) => {
  const dx = right.x - left.x;
  const dy = right.y - left.y;
  const distance = Math.hypot(dx, dy);
  if (Number.isFinite(distance) && distance > FORCE_EPSILON) {
    return { distance, ux: dx / distance, uy: dy / distance };
  }
  const direction = getStablePairDirection(left, right, leftIndex, rightIndex);
  return { distance: 1, ux: direction.x, uy: direction.y };
};

const normalizeForceLayoutToViewport = nodes => {
  const minX = Math.min(...nodes.map(node => node.x));
  const maxX = Math.max(...nodes.map(node => node.x));
  const minY = Math.min(...nodes.map(node => node.y));
  const maxY = Math.max(...nodes.map(node => node.y));
  const width = Math.max(0, maxX - minX);
  const height = Math.max(0, maxY - minY);
  const availableWidth = VIEWBOX_WIDTH - FORCE_VIEWPORT_INSET * 2;
  const availableHeight = VIEWBOX_HEIGHT - FORCE_VIEWPORT_INSET * 2;
  const scale = Math.min(
    1,
    width > FORCE_EPSILON ? availableWidth / width : 1,
    height > FORCE_EPSILON ? availableHeight / height : 1
  );
  const sourceCenterX = (minX + maxX) / 2;
  const sourceCenterY = (minY + maxY) / 2;
  const targetCenterX = VIEWBOX_WIDTH / 2;
  const targetCenterY = VIEWBOX_HEIGHT / 2;

  return nodes.map(node => {
    const normalized = {
      x: targetCenterX + (node.x - sourceCenterX) * scale,
      y: targetCenterY + (node.y - sourceCenterY) * scale,
    };
    return { ...node, ...clampNodePosition(normalized) };
  });
};

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

export const forceDirectedLayout = (
  graph,
  requestedOptions = {},
  legacyStrength
) => {
  const requestedIterations =
    typeof requestedOptions === 'number' ? Number(requestedOptions) : null;
  const requestedStrength =
    typeof requestedOptions === 'number'
      ? legacyStrength
      : requestedOptions?.strength;
  const options = {
    ...getForceLayoutOptions(requestedStrength),
    ...(Number.isFinite(requestedIterations)
      ? {
          iterations: Math.max(
            1,
            Math.min(2000, Math.round(requestedIterations))
          ),
        }
      : {}),
  };
  const nodes = (graph.nodes ?? []).map((node, index) => ({
    ...node,
    x: Number.isFinite(Number(node.x))
      ? Number(node.x)
      : VIEWBOX_WIDTH / 2 + index,
    y: Number.isFinite(Number(node.y))
      ? Number(node.y)
      : VIEWBOX_HEIGHT / 2 + index,
  }));
  if (nodes.length <= 1) return { ...graph, nodes };

  const nodeIndexById = new Map(
    nodes.map((node, index) => [String(node.id), index])
  );
  const edges = (graph.edges ?? [])
    .map(edge => ({
      fromIndex: nodeIndexById.get(String(edge.from)),
      toIndex: nodeIndexById.get(String(edge.to)),
    }))
    .filter(
      edge =>
        Number.isInteger(edge.fromIndex) &&
        Number.isInteger(edge.toIndex) &&
        edge.fromIndex !== edge.toIndex
    );
  const idealDistance =
    Math.sqrt((VIEWBOX_WIDTH * VIEWBOX_HEIGHT) / nodes.length) *
    (0.12 + options.strength * 0.1);
  const initialTemperature = Math.min(64, Math.max(18, idealDistance * 0.18));

  for (let step = 0; step < options.iterations; step += 1) {
    const forces = new Map(
      nodes.map(node => [String(node.id), { x: 0, y: 0 }])
    );
    for (let i = 0; i < nodes.length; i += 1) {
      for (let j = i + 1; j < nodes.length; j += 1) {
        const a = nodes[i];
        const b = nodes[j];
        const vector = getPairVector(a, b, i, j);
        const repulsion =
          (idealDistance * idealDistance) / Math.max(1, vector.distance);
        forces.get(String(a.id)).x -= vector.ux * repulsion;
        forces.get(String(a.id)).y -= vector.uy * repulsion;
        forces.get(String(b.id)).x += vector.ux * repulsion;
        forces.get(String(b.id)).y += vector.uy * repulsion;
      }
    }
    edges.forEach(({ fromIndex, toIndex }) => {
      const from = nodes[fromIndex];
      const to = nodes[toIndex];
      const vector = getPairVector(from, to, fromIndex, toIndex);
      const attraction =
        (vector.distance * vector.distance) / Math.max(1, idealDistance);
      forces.get(String(from.id)).x += vector.ux * attraction;
      forces.get(String(from.id)).y += vector.uy * attraction;
      forces.get(String(to.id)).x -= vector.ux * attraction;
      forces.get(String(to.id)).y -= vector.uy * attraction;
    });

    const progress =
      options.iterations <= 1 ? 1 : step / (options.iterations - 1);
    const temperature =
      initialTemperature * (1 - progress) + FORCE_FINAL_TEMPERATURE * progress;
    nodes.forEach(node => {
      const force = forces.get(String(node.id));
      const magnitude = Math.hypot(force.x, force.y);
      if (!Number.isFinite(magnitude) || magnitude <= FORCE_EPSILON) return;
      const displacement = Math.min(magnitude, temperature);
      node.x += (force.x / magnitude) * displacement;
      node.y += (force.y / magnitude) * displacement;
    });
  }

  return { ...graph, nodes: normalizeForceLayoutToViewport(nodes) };
};
