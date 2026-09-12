import { DEFAULT_GRAPH } from './constants.js';
import { normalizeFrameDuration } from './lib/frameDuration.js';
import { clamp, clampNodePosition } from './lib/graphGeometry.js';
export { exportEdgeListText, parseEdgeListText } from './lib/edgeList.js';

export { clamp, clampNodePosition, snapToGrid } from './lib/graphGeometry.js';
export {
  circularLayout,
  forceDirectedLayout,
  treeLayout,
} from './lib/graphLayouts.js';
export { runScriptTrace } from './lib/scriptTrace.js';

export const normalizeNodeId = (rawId, fallback) => {
  if (Number.isFinite(Number(rawId))) return Number(rawId);
  const text = String(rawId ?? fallback);
  return text.trim() === '' ? String(fallback) : text;
};
export const normalizeBaseGraph = (payload = DEFAULT_GRAPH) => {
  const nodesInput = Array.isArray(payload?.nodes) ? payload.nodes : [];
  const edgesInput = Array.isArray(payload?.edges) ? payload.edges : [];
  const seenIds = new Set();
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
    .filter(node => {
      const id = String(node.id);
      if (seenIds.has(id)) return false;
      seenIds.add(id);
      return true;
    });
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
const normalizeStep = (step, index) => {
  const captionVisible =
    typeof step?.captionVisible === 'boolean'
      ? step.captionVisible
      : step?.showCaption;
  return {
    id: String(step?.id ?? `step-${index}`),
    description: String(step?.description ?? `Step ${index + 1}`),
    ...(typeof step?.captionText === 'string'
      ? { captionText: step.captionText }
      : {}),
    durationMs: normalizeFrameDuration(step?.durationMs),
    ...(typeof captionVisible === 'boolean' ? { captionVisible } : {}),
    nodeOverrides:
      step?.nodeOverrides && typeof step.nodeOverrides === 'object'
        ? JSON.parse(JSON.stringify(step.nodeOverrides))
        : {},
    edgeOverrides:
      step?.edgeOverrides && typeof step.edgeOverrides === 'object'
        ? JSON.parse(JSON.stringify(step.edgeOverrides))
        : {},
  };
};
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
