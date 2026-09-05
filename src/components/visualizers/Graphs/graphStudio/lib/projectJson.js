import { EDGE_ROUTING } from '../constants.js';
import {
  DEFAULT_CAPTION_OVERLAY,
  normalizeCaptionOverlay,
} from './captionOverlay.js';
import {
  DEFAULT_CUSTOM_LEGEND,
  normalizeCustomLegend,
} from './customLegend.js';
import {
  DEFAULT_EDGE_WIDTH,
  DEFAULT_NODE_SIZE,
  EDGE_LABEL_FONT_SIZE_RANGE,
  getDefaultEdgeLabelFontSize,
  getDefaultNodeLabelFontSize,
  NODE_LABEL_FONT_SIZE_RANGE,
} from './fontSizing.js';
import {
  DEFAULT_FRAME_DURATION_MS,
  normalizeFrameDuration,
} from './frameDuration.js';
import {
  PROJECT_LIMITS,
  requireLimit,
  requireTextBudget,
} from './projectLimits.js';
import {
  sanitizeTemporalOverrideMap,
  sanitizeTemporalOverridePatch,
} from './temporalOverrideSchema.js';
import { validateVisualProperties } from './visualProperties.js';

const PROJECT_FORMAT = 'graph-viz-project';
const PROJECT_VERSION = 1;
const DEFAULT_STEP = {
  id: 'step-0',
  description: 'Imported project',
  durationMs: DEFAULT_FRAME_DURATION_MS,
  nodeOverrides: {},
  edgeOverrides: {},
};
const DEFAULT_SETTINGS = {
  edgeRouting: EDGE_ROUTING.straight,
  snapEnabled: true,
  showGrid: true,
  captionOverlay: DEFAULT_CAPTION_OVERLAY,
  customLegend: DEFAULT_CUSTOM_LEGEND,
  lockCanvas: false,
  viewState: null,
  globalSettings: {
    forceStrength: 1,
    edgeCurvature: 46,
    nodeSize: DEFAULT_NODE_SIZE,
    nodeLabelFontSize: getDefaultNodeLabelFontSize(DEFAULT_NODE_SIZE),
    edgeWidth: DEFAULT_EDGE_WIDTH,
    edgeLabelFontSize: getDefaultEdgeLabelFontSize(DEFAULT_EDGE_WIDTH),
  },
};

const cloneJson = value => JSON.parse(JSON.stringify(value ?? null));

const isRecord = value =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const isUsableId = value => {
  if (typeof value !== 'string' && typeof value !== 'number') return false;
  if (typeof value === 'number' && !Number.isSafeInteger(value)) return false;
  return (
    String(value).trim() !== '' &&
    String(value).length <= 100 &&
    !['__proto__', 'constructor', 'prototype'].includes(String(value))
  );
};

const requireArray = (value, label) => {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array`);
  return value;
};

const sanitizeNode = (node, index) => {
  if (!isRecord(node)) throw new Error(`Node ${index + 1} must be an object`);
  if (!isUsableId(node.id)) throw new Error(`Node ${index + 1} has no id`);
  if (
    ![node.x, node.y].every(
      value =>
        typeof value === 'number' &&
        Number.isFinite(value) &&
        Math.abs(value) <= 10000000
    )
  ) {
    throw new Error(`Node "${node.id}" must have numeric x and y`);
  }
  validateVisualProperties('node', node, `Node ${node.id}`);
  requireLimit(
    String(node.label ?? node.id).length,
    PROJECT_LIMITS.label,
    'Node label'
  );
  return {
    ...cloneJson(node),
    id: node.id,
    ...(node.color !== undefined ? { color: node.color } : {}),
    ...(node.status !== undefined ? { status: node.status } : {}),
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
  validateVisualProperties('edge', edge, `Edge ${edge.id}`);
  requireLimit(
    String(edge.label ?? '').length,
    PROJECT_LIMITS.label,
    'Edge label'
  );
  if (
    edge.duration !== undefined &&
    (typeof edge.duration !== 'number' || !Number.isFinite(edge.duration))
  )
    throw new Error(`Edge ${edge.id}: invalid duration`);
  if (edge.directed !== undefined && typeof edge.directed !== 'boolean')
    throw new Error(`Edge ${edge.id}: directed must be a boolean`);
  return {
    ...cloneJson(edge),
    from: edge.from,
    to: edge.to,
    ...(edge.color !== undefined ? { color: edge.color } : {}),
    ...(edge.status !== undefined ? { status: edge.status } : {}),
    ...(edge.duration !== undefined
      ? { duration: Math.max(80, Math.min(3000, edge.duration)) }
      : {}),
    id: String(edge.id),
    directed: Boolean(edge.directed),
    label: String(edge.label ?? ''),
    visible: edge.visible !== false,
  };
};

const sanitizeOverrideMap = (value, validIds, label, objectType) => {
  if (value === undefined || value === null) return {};
  if (!isRecord(value)) throw new Error(`${label} must be an object`);
  const sanitizedEntries = Object.entries(value).reduce(
    (entries, [id, patch]) => {
      if (!validIds.has(String(id))) {
        throw new Error(`${label} references missing id "${id}"`);
      }
      if (!isRecord(patch)) {
        throw new Error(`${label} entry "${id}" must be an object`);
      }
      validateVisualProperties(objectType, patch, `${label} entry ${id}`);
      const sanitizedPatch = sanitizeTemporalOverridePatch(
        objectType,
        cloneJson(patch)
      );
      if (Object.keys(sanitizedPatch).length > 0) {
        entries.push([String(id), sanitizedPatch]);
      }
      return entries;
    },
    []
  );
  return Object.fromEntries(sanitizedEntries);
};

const sanitizeStep = (step, index, nodeIds, edgeIds) => {
  if (!isRecord(step))
    throw new Error(`Timeline step ${index + 1} must be an object`);
  requireLimit(
    String(step.description ?? '').length,
    PROJECT_LIMITS.description,
    'Frame description'
  );
  const captionVisible =
    typeof step.captionVisible === 'boolean'
      ? step.captionVisible
      : step.showCaption;
  const sanitized = {
    id: String(step.id ?? `step-${index}`),
    description: String(step.description ?? `Step ${index + 1}`),
    durationMs: normalizeFrameDuration(step.durationMs),
    nodeOverrides: sanitizeOverrideMap(
      step.nodeOverrides,
      nodeIds,
      `Timeline step ${index + 1} nodeOverrides`,
      'node'
    ),
    edgeOverrides: sanitizeOverrideMap(
      step.edgeOverrides,
      edgeIds,
      `Timeline step ${index + 1} edgeOverrides`,
      'edge'
    ),
  };
  delete sanitized.showCaption;
  if (typeof captionVisible === 'boolean') {
    sanitized.captionVisible = captionVisible;
  } else {
    delete sanitized.captionVisible;
  }
  return sanitized;
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
  return { zoom: clamp(zoom, 0.001, 2.6), x, y };
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
  const snapEnabled = booleanOrDefault(
    input.snapEnabled,
    DEFAULT_SETTINGS.snapEnabled
  );
  const showGrid = snapEnabled
    ? true
    : booleanOrDefault(input.showGrid, DEFAULT_SETTINGS.showGrid);
  return {
    edgeRouting:
      input.edgeRouting === EDGE_ROUTING.bezier
        ? EDGE_ROUTING.bezier
        : EDGE_ROUTING.straight,
    snapEnabled,
    showGrid,
    captionOverlay: normalizeCaptionOverlay(input.captionOverlay),
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
      nodeLabelFontSize: numberOrDefault(
        globalInput.nodeLabelFontSize,
        getDefaultNodeLabelFontSize(
          globalInput.nodeSize ?? DEFAULT_SETTINGS.globalSettings.nodeSize
        ),
        NODE_LABEL_FONT_SIZE_RANGE.min,
        NODE_LABEL_FONT_SIZE_RANGE.max
      ),
      edgeWidth: numberOrDefault(
        globalInput.edgeWidth,
        DEFAULT_SETTINGS.globalSettings.edgeWidth,
        1,
        8
      ),
      edgeLabelFontSize: numberOrDefault(
        globalInput.edgeLabelFontSize,
        getDefaultEdgeLabelFontSize(
          globalInput.edgeWidth ?? DEFAULT_SETTINGS.globalSettings.edgeWidth
        ),
        EDGE_LABEL_FONT_SIZE_RANGE.min,
        EDGE_LABEL_FONT_SIZE_RANGE.max
      ),
    },
  };
};

const normalizeStepForExport = step => {
  const cloned = isRecord(step) ? cloneJson(step) : {};
  const captionVisible =
    typeof cloned.captionVisible === 'boolean'
      ? cloned.captionVisible
      : cloned.showCaption;
  delete cloned.showCaption;
  if (typeof captionVisible === 'boolean') {
    cloned.captionVisible = captionVisible;
  } else {
    delete cloned.captionVisible;
  }
  cloned.nodeOverrides = sanitizeTemporalOverrideMap(
    'node',
    cloned.nodeOverrides
  );
  cloned.edgeOverrides = sanitizeTemporalOverrideMap(
    'edge',
    cloned.edgeOverrides
  );
  cloned.durationMs = normalizeFrameDuration(cloned.durationMs);
  return cloned;
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
    steps: (Array.isArray(steps) ? steps : []).map(normalizeStepForExport),
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

  requireLimit(
    requireArray(payload.graph.nodes, 'Graph nodes').length,
    PROJECT_LIMITS.nodes,
    'Node count'
  );
  requireLimit(
    requireArray(payload.graph.edges, 'Graph edges').length,
    PROJECT_LIMITS.edges,
    'Edge count'
  );
  requireLimit(
    requireArray(payload.timeline.steps, 'Timeline steps').length,
    PROJECT_LIMITS.frames,
    'Frame count'
  );
  let overrideCount = 0;
  for (const step of payload.timeline.steps) {
    overrideCount +=
      Object.keys(step?.nodeOverrides ?? {}).length +
      Object.keys(step?.edgeOverrides ?? {}).length;
    requireLimit(
      overrideCount,
      PROJECT_LIMITS.overrides,
      'Total frame overrides'
    );
  }
  const legend = payload.settings?.customLegend;
  if (legend?.entries)
    requireLimit(legend.entries.length, 64, 'Legend entries');
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
  const source = String(text ?? '');
  requireTextBudget(source);
  let payload;
  try {
    payload = JSON.parse(source);
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
  link.download = `graph-studio-project-${date}.graphviz.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
};
