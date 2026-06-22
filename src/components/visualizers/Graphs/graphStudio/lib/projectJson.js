import { EDGE_ROUTING } from '../constants';
import { DEFAULT_CUSTOM_LEGEND, normalizeCustomLegend } from './customLegend';

const PROJECT_FORMAT = 'graph-viz-project';
const PROJECT_VERSION = 1;
const DEFAULT_STEP = {
  id: 'step-0',
  description: 'Imported project',
  durationMs: 600,
  nodeOverrides: {},
  edgeOverrides: {},
};
const DEFAULT_SETTINGS = {
  edgeRouting: EDGE_ROUTING.straight,
  snapEnabled: true,
  showGrid: false,
  customLegend: DEFAULT_CUSTOM_LEGEND,
  lockCanvas: false,
  viewState: null,
  globalSettings: {
    forceStrength: 1,
    edgeCurvature: 46,
    nodeSize: 22,
    edgeWidth: 2.2,
  },
};

const cloneJson = value => JSON.parse(JSON.stringify(value ?? null));

const isRecord = value =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const isUsableId = value => {
  if (value === null || value === undefined) return false;
  return String(value).trim() !== '';
};

const requireArray = (value, label) => {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array`);
  return value;
};

const sanitizeNode = (node, index) => {
  if (!isRecord(node)) throw new Error(`Node ${index + 1} must be an object`);
  if (!isUsableId(node.id)) throw new Error(`Node ${index + 1} has no id`);
  if (!Number.isFinite(Number(node.x)) || !Number.isFinite(Number(node.y))) {
    throw new Error(`Node "${node.id}" must have numeric x and y`);
  }
  return {
    ...cloneJson(node),
    x: Number(node.x),
    y: Number(node.y),
    label: String(node.label ?? node.id),
    visible: node.visible !== false,
  };
};

const sanitizeEdge = (edge, index, nodeIds) => {
  if (!isRecord(edge)) throw new Error(`Edge ${index + 1} must be an object`);
  if (!isUsableId(edge.id)) throw new Error(`Edge ${index + 1} has no id`);
  if (!isUsableId(edge.from) || !isUsableId(edge.to)) {
    throw new Error(`Edge "${edge.id}" must have from and to ids`);
  }
  if (!nodeIds.has(String(edge.from)) || !nodeIds.has(String(edge.to))) {
    throw new Error(`Edge "${edge.id}" references a missing node`);
  }
  return {
    ...cloneJson(edge),
    id: String(edge.id),
    directed: Boolean(edge.directed),
    label: String(edge.label ?? ''),
    visible: edge.visible !== false,
  };
};

const sanitizeOverrideMap = (value, validIds, label) => {
  if (value === undefined || value === null) return {};
  if (!isRecord(value)) throw new Error(`${label} must be an object`);
  return Object.fromEntries(
    Object.entries(value).map(([id, patch]) => {
      if (!validIds.has(String(id))) {
        throw new Error(`${label} references missing id "${id}"`);
      }
      if (!isRecord(patch)) {
        throw new Error(`${label} entry "${id}" must be an object`);
      }
      return [String(id), cloneJson(patch)];
    })
  );
};

const sanitizeStep = (step, index, nodeIds, edgeIds) => {
  if (!isRecord(step))
    throw new Error(`Timeline step ${index + 1} must be an object`);
  return {
    ...cloneJson(step),
    id: String(step.id ?? `step-${index}`),
    description: String(step.description ?? `Step ${index + 1}`),
    durationMs: Number.isFinite(Number(step.durationMs))
      ? Number(step.durationMs)
      : 600,
    nodeOverrides: sanitizeOverrideMap(
      step.nodeOverrides,
      nodeIds,
      `Timeline step ${index + 1} nodeOverrides`
    ),
    edgeOverrides: sanitizeOverrideMap(
      step.edgeOverrides,
      edgeIds,
      `Timeline step ${index + 1} edgeOverrides`
    ),
  };
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const numberOrDefault = (value, fallback, min, max) => {
  if (!Number.isFinite(Number(value))) return fallback;
  const normalized = Number(value);
  return Number.isFinite(min) && Number.isFinite(max)
    ? clamp(normalized, min, max)
    : normalized;
};

const booleanOrDefault = (value, fallback) =>
  typeof value === 'boolean' ? value : fallback;

const sanitizeViewState = value => {
  if (!isRecord(value)) return DEFAULT_SETTINGS.viewState;
  const zoom = Number(value.zoom);
  const x = Number(value.x);
  const y = Number(value.y);
  if (![zoom, x, y].every(Number.isFinite)) return DEFAULT_SETTINGS.viewState;
  return { zoom: clamp(zoom, 0.05, 2.6), x, y };
};

const sanitizeSettings = settings => {
  const input = isRecord(settings) ? settings : {};
  const globalInput = isRecord(input.globalSettings)
    ? input.globalSettings
    : {};
  const hasCustomLegend = isRecord(input.customLegend);
  const customLegend = hasCustomLegend
    ? normalizeCustomLegend(input.customLegend)
    : normalizeCustomLegend({
        ...DEFAULT_CUSTOM_LEGEND,
        enabled: input.showLegend === true,
      });
  return {
    edgeRouting:
      input.edgeRouting === EDGE_ROUTING.bezier
        ? EDGE_ROUTING.bezier
        : EDGE_ROUTING.straight,
    snapEnabled: booleanOrDefault(
      input.snapEnabled,
      DEFAULT_SETTINGS.snapEnabled
    ),
    showGrid: booleanOrDefault(input.showGrid, DEFAULT_SETTINGS.showGrid),
    customLegend,
    lockCanvas: booleanOrDefault(input.lockCanvas, DEFAULT_SETTINGS.lockCanvas),
    viewState: sanitizeViewState(input.viewState),
    globalSettings: {
      forceStrength: numberOrDefault(
        globalInput.forceStrength,
        DEFAULT_SETTINGS.globalSettings.forceStrength,
        0.2,
        2
      ),
      edgeCurvature: numberOrDefault(
        globalInput.edgeCurvature,
        DEFAULT_SETTINGS.globalSettings.edgeCurvature,
        0,
        120
      ),
      nodeSize: numberOrDefault(
        globalInput.nodeSize,
        DEFAULT_SETTINGS.globalSettings.nodeSize,
        12,
        44
      ),
      edgeWidth: numberOrDefault(
        globalInput.edgeWidth,
        DEFAULT_SETTINGS.globalSettings.edgeWidth,
        1,
        8
      ),
    },
  };
};

export const exportProjectJson = ({
  baseGraph,
  steps,
  currentFrame,
  settings,
}) => ({
  format: PROJECT_FORMAT,
  version: PROJECT_VERSION,
  exportedAt: new Date().toISOString(),
  graph: {
    nodes: cloneJson(baseGraph?.nodes ?? []),
    edges: cloneJson(baseGraph?.edges ?? []),
  },
  timeline: {
    steps: cloneJson(steps ?? []),
    currentFrame: Number.isInteger(currentFrame) ? currentFrame : 0,
  },
  settings: cloneJson(settings ?? {}),
});

export const validateProjectPayload = payload => {
  if (!isRecord(payload))
    throw new Error('Project file must contain an object');
  if (payload.format !== PROJECT_FORMAT) {
    throw new Error('Unsupported project format');
  }
  if (payload.version !== PROJECT_VERSION) {
    throw new Error(`Unsupported project version "${payload.version}"`);
  }
  if (!isRecord(payload.graph)) throw new Error('Project graph is missing');
  if (!isRecord(payload.timeline))
    throw new Error('Project timeline is missing');

  const nodes = requireArray(payload.graph.nodes, 'Graph nodes').map(
    sanitizeNode
  );
  const nodeIds = new Set();
  nodes.forEach(node => {
    const id = String(node.id);
    if (nodeIds.has(id)) throw new Error(`Duplicate node id "${node.id}"`);
    nodeIds.add(id);
  });

  const edges = requireArray(payload.graph.edges, 'Graph edges').map(
    (edge, index) => sanitizeEdge(edge, index, nodeIds)
  );
  const edgeIds = new Set();
  edges.forEach(edge => {
    if (edgeIds.has(edge.id)) throw new Error(`Duplicate edge id "${edge.id}"`);
    edgeIds.add(edge.id);
  });

  const rawSteps = requireArray(payload.timeline.steps, 'Timeline steps');
  const steps = rawSteps.length
    ? rawSteps.map((step, index) => sanitizeStep(step, index, nodeIds, edgeIds))
    : [cloneJson(DEFAULT_STEP)];
  const rawFrame = Number(payload.timeline.currentFrame);
  const currentFrame =
    Number.isInteger(rawFrame) && rawFrame >= 0 && rawFrame < steps.length
      ? rawFrame
      : 0;

  return {
    graph: { nodes, edges },
    timeline: { steps, currentFrame },
    settings: sanitizeSettings(payload.settings),
  };
};

export const parseProjectJson = text => {
  let payload;
  try {
    payload = JSON.parse(String(text ?? ''));
  } catch {
    throw new Error('Invalid JSON');
  }
  return validateProjectPayload(payload);
};

export const downloadProjectJson = payload => {
  const date = new Date().toISOString().slice(0, 10);
  const blob = new Blob([`${JSON.stringify(payload, null, 2)}\n`], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `graph-viz-project-${date}.graphviz.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
};
