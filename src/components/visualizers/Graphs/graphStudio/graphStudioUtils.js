import {
  DEFAULT_GRAPH,
  NODE_RADIUS,
  VIEWBOX_HEIGHT,
  VIEWBOX_WIDTH,
} from './constants';
import { clamp, clampNodePosition } from './lib/graphGeometry';

export { clamp, clampNodePosition, snapToGrid } from './lib/graphGeometry';
export {
  circularLayout,
  forceDirectedLayout,
  treeLayout,
} from './lib/graphLayouts';
export { runScriptTrace } from './lib/scriptTrace';

export const normalizeNodeId = (rawId, fallback) => {
  if (Number.isFinite(Number(rawId))) return Number(rawId);
  const text = String(rawId ?? fallback);
  return text.trim() === '' ? String(fallback) : text;
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
        all.findIndex(item => String(item.id) === String(node.id)) === idx
    );
  const nodeIds = new Set(nodes.map(node => String(node.id)));
  const edges = edgesInput
    .map((edge, index) => {
      const from = normalizeNodeId(edge.from ?? edge.u ?? edge.source, index);
      const to = normalizeNodeId(edge.to ?? edge.v ?? edge.target, index + 1);
      if (!nodeIds.has(String(from)) || !nodeIds.has(String(to))) return null;
      return {
        id: String(edge.id ?? `e${index}`),
        from,
        to,
        directed: Boolean(edge.directed),
        label: String(edge.label ?? edge.weight ?? ''),
        color: typeof edge.color === 'string' ? edge.color : '#64748b',
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
  ...(typeof step?.captionVisible === 'boolean'
    ? { captionVisible: step.captionVisible }
    : {}),
  nodeOverrides:
    step?.nodeOverrides && typeof step.nodeOverrides === 'object'
      ? JSON.parse(JSON.stringify(step.nodeOverrides))
      : {},
  edgeOverrides:
    step?.edgeOverrides && typeof step.edgeOverrides === 'object'
      ? JSON.parse(JSON.stringify(step.edgeOverrides))
      : {},
});
export const normalizeTimelinePayload = payload => {
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
export const getNodeMap = nodes => {
  const map = new Map();
  nodes.forEach(node => map.set(String(node.id), node));
  return map;
};
export const computeStepDiff = (previousGraph, nextGraph) => {
  if (!previousGraph || !nextGraph)
    return { changedNodes: new Set(), changedEdges: new Set() };
  const changedNodes = new Set();
  const changedEdges = new Set();
  const prevNodeMap = new Map(
    previousGraph.nodes.map(node => [String(node.id), node])
  );
  nextGraph.nodes.forEach(node => {
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
      String(prev.status ?? '') !== String(node.status ?? '') ||
      String(prev.color ?? '') !== String(node.color ?? '')
    ) {
      changedNodes.add(String(node.id));
    }
  });
  const prevEdgeMap = new Map(
    previousGraph.edges.map(edge => [String(edge.id), edge])
  );
  nextGraph.edges.forEach(edge => {
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
      String(prev.color ?? '') !== String(edge.color ?? '')
    ) {
      changedEdges.add(String(edge.id));
    }
  });
  return { changedNodes, changedEdges };
};
export const parseEdgeListText = text => {
  const source = String(text ?? '').trim();
  if (!source) {
    throw new Error('Paste an edge list with header "n m" before importing.');
  }
  const lines = source
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);
  if (!lines.length) {
    throw new Error('Paste an edge list with header "n m" before importing.');
  }

  const parseIntegerToken = (token, label) => {
    if (!/^-?(0|[1-9]\d*)$/.test(token)) {
      throw new Error(`${label} must be an integer.`);
    }
    const value = Number(token);
    if (!Number.isSafeInteger(value)) {
      throw new Error(`${label} is too large.`);
    }
    return value;
  };
  const parseNodeId = (token, label, n) => {
    const value = parseIntegerToken(token, label);
    if (value < 0 || value >= n) {
      throw new Error(`${label} ${value} is out of range 0..${n - 1}.`);
    }
    return value;
  };
  const parseWeight = (token, lineNumber) => {
    if (!/^-?(?:\d+|\d+\.\d+|\.\d+)$/.test(token)) {
      throw new Error(`Line ${lineNumber} weight must be numeric.`);
    }
    const value = Number(token);
    if (!Number.isFinite(value)) {
      throw new Error(`Line ${lineNumber} weight must be numeric.`);
    }
    return token;
  };

  const header = lines[0].split(/\s+/);
  if (header.length !== 2) {
    throw new Error('Header must be exactly two integers: n m.');
  }
  const n = parseIntegerToken(header[0], 'Header n');
  const m = parseIntegerToken(header[1], 'Header m');
  if (n < 1) {
    throw new Error('Header n must be at least 1.');
  }
  if (m < 0) {
    throw new Error('Header m must be at least 0.');
  }

  const edgeLines = lines.slice(1);
  if (edgeLines.length !== m) {
    throw new Error(
      `Header declares ${m} edge rows but found ${edgeLines.length}.`
    );
  }

  const parsedEdges = [];
  for (let index = 1; index < lines.length; index += 1) {
    const lineNumber = index + 1;
    const parts = lines[index].split(/\s+/);
    if (parts.length < 2 || parts.length > 3) {
      throw new Error(`Line ${lineNumber} must be "u v" or "u v weight".`);
    }
    const u = parseNodeId(parts[0], `Line ${lineNumber} node id`, n);
    const v = parseNodeId(parts[1], `Line ${lineNumber} node id`, n);
    const rawW = parts[2] ? parseWeight(parts[2], lineNumber) : '';
    parsedEdges.push({ from: u, to: v, label: rawW ?? '' });
  }

  const orderedIds = Array.from({ length: n }, (_, id) => id);
  const radius = Math.max(180, Math.min(VIEWBOX_WIDTH, VIEWBOX_HEIGHT) / 2.8);
  const nodes = orderedIds.map((id, index) => {
    const angle = (index / Math.max(orderedIds.length, 1)) * Math.PI * 2;
    const centerX = VIEWBOX_WIDTH / 2;
    const centerY = VIEWBOX_HEIGHT / 2;
    const x =
      orderedIds.length === 1 ? centerX : centerX + Math.cos(angle) * radius;
    const y =
      orderedIds.length === 1 ? centerY : centerY + Math.sin(angle) * radius;
    return {
      id,
      label: String(id),
      x: clamp(x, NODE_RADIUS + 8, VIEWBOX_WIDTH - NODE_RADIUS - 8),
      y: clamp(y, NODE_RADIUS + 8, VIEWBOX_HEIGHT - NODE_RADIUS - 8),
      visible: true,
    };
  });
  const edges = parsedEdges.map((edge, index) => ({
    id: `e${index}`,
    from: edge.from,
    to: edge.to,
    label: edge.label,
    directed: false,
    color: '#64748b',
    duration: 450,
    visible: true,
  }));
  return {
    graph: normalizeBaseGraph({ nodes, edges }),
    meta: `${nodes.length} nodes / ${edges.length} edges`,
  };
};
export const exportEdgeListText = graph => {
  const nodes = graph?.nodes ?? [];
  const edges = graph?.edges ?? [];
  const header = `${nodes.length} ${edges.length}`;
  const body = edges
    .map(edge => `${edge.from} ${edge.to}${edge.label ? ` ${edge.label}` : ''}`)
    .join('\n');
  return `${header}\n${body}`;
};
export const getSelectionBounds = nodes => {
  if (!nodes.length) return null;
  const xs = nodes.map(node => node.x);
  const ys = nodes.map(node => node.y);
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
