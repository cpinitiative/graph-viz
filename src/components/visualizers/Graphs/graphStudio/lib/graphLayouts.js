import { NODE_RADIUS, VIEWBOX_HEIGHT, VIEWBOX_WIDTH } from '../constants.js';
import { clampNodePosition } from './graphGeometry.js';

export const FORCE_STRENGTH_MIN = 0.2;
export const FORCE_STRENGTH_MAX = 2;
export const DEFAULT_FORCE_STRENGTH = 1;
export const FORCE_LAYOUT_ITERATIONS = 120;

const FORCE_EPSILON = 1e-6;
const FORCE_VIEWPORT_INSET = NODE_RADIUS + 64;
const FORCE_REPULSION_SCALE = 0.72;
const FORCE_SPRING_SCALE = 0.9;
const FORCE_GRAVITY_SCALE = 0.4;
const FORCE_INITIAL_STEP_SCALE = 0.09;
const FORCE_FINAL_STEP_SCALE = 0.012;
const FORCE_INITIAL_MAX_DISPLACEMENT = 22;
const FORCE_FINAL_MAX_DISPLACEMENT = 0.3;

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

const createForceSeedNodes = inputNodes => {
  const nodeCount = inputNodes.length;
  const radius = Math.min(420, Math.max(120, Math.sqrt(nodeCount) * 76));

  return inputNodes.map((node, index) => {
    const stableOffset =
      hashStableString(JSON.stringify([String(node.id), index])) / 0x100000000;
    const angle =
      (index / Math.max(1, nodeCount)) * Math.PI * 2 +
      (stableOffset - 0.5) * 0.42;
    const nodeRadius = radius * (0.84 + stableOffset * 0.24);

    return {
      ...node,
      x: VIEWBOX_WIDTH / 2 + Math.cos(angle) * nodeRadius,
      y: VIEWBOX_HEIGHT / 2 + Math.sin(angle) * nodeRadius * 0.72,
    };
  });
};

const getIdealForceDistance = (nodeCount, strength) => {
  const densityDistance = Math.sqrt(
    (VIEWBOX_WIDTH * VIEWBOX_HEIGHT) / Math.max(1, nodeCount)
  );
  const baseDistance = Math.max(90, Math.min(210, densityDistance * 0.22));
  const strengthProgress =
    (strength - FORCE_STRENGTH_MIN) / (FORCE_STRENGTH_MAX - FORCE_STRENGTH_MIN);
  return baseDistance * (0.65 + strengthProgress * 0.8);
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
  const inputNodes = graph.nodes ?? [];
  if (inputNodes.length <= 1) {
    return {
      ...graph,
      nodes: inputNodes.map((node, index) => ({
        ...node,
        x: Number.isFinite(Number(node.x))
          ? Number(node.x)
          : VIEWBOX_WIDTH / 2 + index,
        y: Number.isFinite(Number(node.y))
          ? Number(node.y)
          : VIEWBOX_HEIGHT / 2 + index,
      })),
    };
  }
  const nodes = createForceSeedNodes(inputNodes);

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
  const idealDistance = getIdealForceDistance(nodes.length, options.strength);
  const referenceDistance = getIdealForceDistance(
    nodes.length,
    DEFAULT_FORCE_STRENGTH
  );
  const gravityScale =
    FORCE_GRAVITY_SCALE * Math.pow(idealDistance / referenceDistance, 2);
  const centerX = VIEWBOX_WIDTH / 2;
  const centerY = VIEWBOX_HEIGHT / 2;

  for (let step = 0; step < options.iterations; step += 1) {
    const forces = nodes.map(() => ({ x: 0, y: 0 }));
    for (let i = 0; i < nodes.length; i += 1) {
      for (let j = i + 1; j < nodes.length; j += 1) {
        const a = nodes[i];
        const b = nodes[j];
        const vector = getPairVector(a, b, i, j);
        const repulsion =
          ((idealDistance * idealDistance) /
            Math.max(idealDistance * 0.15, vector.distance)) *
          FORCE_REPULSION_SCALE;
        forces[i].x -= vector.ux * repulsion;
        forces[i].y -= vector.uy * repulsion;
        forces[j].x += vector.ux * repulsion;
        forces[j].y += vector.uy * repulsion;
      }
    }
    edges.forEach(({ fromIndex, toIndex }) => {
      const from = nodes[fromIndex];
      const to = nodes[toIndex];
      const vector = getPairVector(from, to, fromIndex, toIndex);
      const spring = (vector.distance - idealDistance) * FORCE_SPRING_SCALE;
      forces[fromIndex].x += vector.ux * spring;
      forces[fromIndex].y += vector.uy * spring;
      forces[toIndex].x -= vector.ux * spring;
      forces[toIndex].y -= vector.uy * spring;
    });

    const progress =
      options.iterations <= 1 ? 1 : step / (options.iterations - 1);
    const stepScale =
      FORCE_INITIAL_STEP_SCALE * (1 - progress) +
      FORCE_FINAL_STEP_SCALE * progress;
    const maxDisplacement =
      FORCE_INITIAL_MAX_DISPLACEMENT * (1 - progress) +
      FORCE_FINAL_MAX_DISPLACEMENT * progress;

    nodes.forEach((node, index) => {
      const force = forces[index];
      force.x += (centerX - node.x) * gravityScale;
      force.y += (centerY - node.y) * gravityScale;

      const dx = force.x * stepScale;
      const dy = force.y * stepScale;
      const magnitude = Math.hypot(dx, dy);
      if (!Number.isFinite(magnitude) || magnitude <= FORCE_EPSILON) return;
      const displacementScale = Math.min(1, maxDisplacement / magnitude);
      node.x += dx * displacementScale;
      node.y += dy * displacementScale;
    });
  }

  return { ...graph, nodes: normalizeForceLayoutToViewport(nodes) };
};
