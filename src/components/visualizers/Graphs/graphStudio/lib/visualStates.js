import { GRAPH_STATE_COLORS } from './stateColors.js';

export const VISUAL_STATE_KINDS = Object.freeze(['node', 'edge']);
export const VISUAL_STATE_FALLBACK_COLOR = GRAPH_STATE_COLORS.edgeDefault;

export const DEFAULT_VISUAL_STATES = Object.freeze([
  {
    id: 'node-active',
    kind: 'node',
    label: 'Active node',
    color: GRAPH_STATE_COLORS.nodeActive,
    pinned: false,
  },
  {
    id: 'node-queued',
    kind: 'node',
    label: 'Queued node',
    color: GRAPH_STATE_COLORS.nodeQueued,
    pinned: false,
  },
  {
    id: 'node-visited',
    kind: 'node',
    label: 'Visited node',
    color: GRAPH_STATE_COLORS.nodeVisited,
    pinned: false,
  },
  {
    id: 'edge-highlighted',
    kind: 'edge',
    label: 'Highlighted edge',
    color: GRAPH_STATE_COLORS.edgeHighlighted,
    pinned: false,
  },
  {
    id: 'edge-completed',
    kind: 'edge',
    label: 'Completed edge',
    color: GRAPH_STATE_COLORS.edgeCompleted,
    pinned: false,
  },
  {
    id: 'edge-rejected',
    kind: 'edge',
    label: 'Rejected edge',
    color: GRAPH_STATE_COLORS.edgeRejected,
    pinned: false,
  },
]);

const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i;
const LEGACY_NODE_STATUS_COLORS = Object.freeze({
  active: '#000000',
  queued: '#eeeeee',
  visited: '#e2e2e2',
  discarded: '#ffffff',
});
const LEGACY_NODE_STATUS_LABELS = Object.freeze({
  active: 'Active node',
  queued: 'Queued node',
  visited: 'Visited node',
  discarded: 'Discarded node',
});

const cloneJson = value => JSON.parse(JSON.stringify(value ?? null));
const isRecord = value =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

export const normalizeVisualStateColor = (value, fallback) => {
  const color = String(value ?? '').trim();
  if (HEX_COLOR_PATTERN.test(color)) return color.toUpperCase();
  const fallbackColor = String(fallback ?? '').trim();
  return HEX_COLOR_PATTERN.test(fallbackColor)
    ? fallbackColor.toUpperCase()
    : fallback;
};

export const getReadableTextColor = value => {
  const color = normalizeVisualStateColor(value, '#FFFFFF');
  const channels = [1, 3, 5].map(
    index => Number.parseInt(color.slice(index, index + 2), 16) / 255
  );
  const luminance = channels
    .map(channel =>
      channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
    )
    .reduce(
      (total, channel, index) =>
        total + channel * [0.2126, 0.7152, 0.0722][index],
      0
    );
  const whiteContrast = 1.05 / (luminance + 0.05);
  const blackContrast = (luminance + 0.05) / 0.05;
  return whiteContrast > blackContrast ? '#FFFFFF' : '#0F172A';
};

export const slugifyVisualStateId = (value, fallback = 'visual-state') => {
  const slug = String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
  return slug || fallback;
};

const getUniqueStateId = (candidate, usedIds) => {
  const baseId = slugifyVisualStateId(candidate);
  let id = baseId;
  let suffix = 2;
  while (usedIds.has(id)) {
    id = `${baseId}-${suffix}`;
    suffix += 1;
  }
  usedIds.add(id);
  return id;
};

export const normalizeVisualStates = (value, { useDefaults = true } = {}) => {
  const rawStates = Array.isArray(value)
    ? value
    : useDefaults
      ? DEFAULT_VISUAL_STATES
      : [];
  const usedIds = new Set();

  return rawStates.reduce((states, rawState, index) => {
    if (!isRecord(rawState)) return states;
    const kind = VISUAL_STATE_KINDS.includes(rawState.kind)
      ? rawState.kind
      : 'node';
    const label = String(rawState.label ?? '').trim();
    if (!label) return states;
    const id = getUniqueStateId(
      rawState.id || `${kind}-${label || index + 1}`,
      usedIds
    );
    states.push({
      id,
      kind,
      label,
      color: normalizeVisualStateColor(
        rawState.color,
        VISUAL_STATE_FALLBACK_COLOR
      ),
      pinned: rawState.pinned === true,
    });
    return states;
  }, []);
};

export const createVisualState = ({ kind = 'node', label, color }, states) => {
  const safeKind = VISUAL_STATE_KINDS.includes(kind) ? kind : 'node';
  const safeLabel =
    String(label ?? '').trim() ||
    `New ${safeKind === 'edge' ? 'edge' : 'node'} state`;
  const usedIds = new Set(
    normalizeVisualStates(states, { useDefaults: false }).map(state => state.id)
  );
  return {
    id: getUniqueStateId(`${safeKind}-${safeLabel}`, usedIds),
    kind: safeKind,
    label: safeLabel,
    color: normalizeVisualStateColor(
      color,
      safeKind === 'edge'
        ? GRAPH_STATE_COLORS.edgeHighlighted
        : GRAPH_STATE_COLORS.nodeActive
    ),
    pinned: false,
  };
};

export const getVisualStateMap = visualStates =>
  new Map(
    normalizeVisualStates(visualStates, { useDefaults: false }).map(state => [
      state.id,
      state,
    ])
  );

export const getVisualStatesForKind = (visualStates, kind) =>
  normalizeVisualStates(visualStates, { useDefaults: false }).filter(
    state => state.kind === kind
  );

export const resolveVisualStateObject = (object, kind, stateMap) => {
  const state = stateMap.get(String(object?.stateId ?? ''));
  if (!state || state.kind !== kind) return object;
  return {
    ...object,
    color: state.color,
    resolvedStateLabel: state.label,
  };
};

export const resolveGraphVisualStates = (graph, visualStates) => {
  const stateMap = getVisualStateMap(visualStates);
  return {
    nodes: (graph?.nodes ?? []).map(node =>
      resolveVisualStateObject(node, 'node', stateMap)
    ),
    edges: (graph?.edges ?? []).map(edge =>
      resolveVisualStateObject(edge, 'edge', stateMap)
    ),
  };
};

export const getUsedVisualStateIds = ({ baseGraph, steps }) => {
  const usedIds = new Set();
  const collect = value => {
    const stateId = String(value?.stateId ?? '').trim();
    if (stateId) usedIds.add(stateId);
  };

  (baseGraph?.nodes ?? []).forEach(collect);
  (baseGraph?.edges ?? []).forEach(collect);
  (steps ?? []).forEach(step => {
    Object.values(step?.nodeOverrides ?? {}).forEach(collect);
    Object.values(step?.edgeOverrides ?? {}).forEach(collect);
  });
  return usedIds;
};

export const deriveSmartLegendEntries = ({
  visualStates,
  baseGraph,
  steps,
}) => {
  const usedIds = getUsedVisualStateIds({ baseGraph, steps });
  return normalizeVisualStates(visualStates, { useDefaults: false })
    .filter(state => state.pinned || usedIds.has(state.id))
    .map(state => ({
      stateId: state.id,
      group: state.kind === 'edge' ? 'Edges' : 'Nodes',
      kind: state.kind,
      label: state.label,
      color: state.color,
      pinned: state.pinned,
      used: usedIds.has(state.id),
    }));
};

export const createVisualStatesFromLegend = (
  legend,
  { namespace = 'preset' } = {}
) => {
  const usedIds = new Set();
  return (Array.isArray(legend?.entries) ? legend.entries : []).reduce(
    (states, entry) => {
      const label = String(entry?.label ?? '').trim();
      if (!label) return states;
      const kind = entry.kind === 'edge' ? 'edge' : 'node';
      states.push({
        id: getUniqueStateId(`${namespace}-${kind}-${label}`, usedIds),
        kind,
        label,
        color: normalizeVisualStateColor(
          entry.color,
          VISUAL_STATE_FALLBACK_COLOR
        ),
        pinned: false,
      });
      return states;
    },
    []
  );
};

const assignStateByColor = (object, kind, states) => {
  const objectColor = normalizeVisualStateColor(object?.color, '');
  if (!objectColor) return cloneJson(object);
  const state = states.find(
    candidate => candidate.kind === kind && candidate.color === objectColor
  );
  if (!state) return cloneJson(object);
  const nextObject = { ...cloneJson(object), stateId: state.id };
  delete nextObject.status;
  return nextObject;
};

export const applyVisualStatesByColor = ({ graph, steps, visualStates }) => {
  const states = normalizeVisualStates(visualStates, { useDefaults: false });
  return {
    graph: {
      nodes: (graph?.nodes ?? []).map(node =>
        assignStateByColor(node, 'node', states)
      ),
      edges: (graph?.edges ?? []).map(edge =>
        assignStateByColor(edge, 'edge', states)
      ),
    },
    steps: (steps ?? []).map(step => ({
      ...cloneJson(step),
      nodeOverrides: Object.fromEntries(
        Object.entries(step?.nodeOverrides ?? {}).map(([id, patch]) => [
          id,
          assignStateByColor(patch, 'node', states),
        ])
      ),
      edgeOverrides: Object.fromEntries(
        Object.entries(step?.edgeOverrides ?? {}).map(([id, patch]) => [
          id,
          assignStateByColor(patch, 'edge', states),
        ])
      ),
    })),
  };
};

export const createSemanticPresetModel = (presetName, preset) => {
  const visualStates = createVisualStatesFromLegend(preset?.legend, {
    namespace: presetName,
  });
  const migrated = applyVisualStatesByColor({
    graph: preset?.graph,
    steps: preset?.steps,
    visualStates,
  });
  return {
    ...migrated,
    visualStates,
    legend: {
      ...(preset?.legend ?? {}),
      mode: 'smart',
    },
  };
};

export const migrateLegacyVisualStates = ({ graph, steps, visualStates }) => {
  const states = normalizeVisualStates(visualStates, { useDefaults: true });
  const stateByLegacyKey = new Map();
  const usedIds = new Set(states.map(state => state.id));

  const migrateObject = (object, kind) => {
    const nextObject = cloneJson(object);
    if (String(nextObject?.stateId ?? '').trim()) return nextObject;
    const status = String(nextObject?.status ?? '')
      .trim()
      .toLowerCase();
    if (kind !== 'node' || !LEGACY_NODE_STATUS_LABELS[status]) {
      return nextObject;
    }
    const color = normalizeVisualStateColor(
      nextObject.color,
      LEGACY_NODE_STATUS_COLORS[status]
    );
    const legacyKey = `${kind}:${status}:${color}`;
    let state = stateByLegacyKey.get(legacyKey);
    if (!state) {
      state = {
        id: getUniqueStateId(`legacy-${kind}-${status}`, usedIds),
        kind,
        label: LEGACY_NODE_STATUS_LABELS[status],
        color,
        pinned: false,
      };
      states.push(state);
      stateByLegacyKey.set(legacyKey, state);
    }
    nextObject.stateId = state.id;
    return nextObject;
  };

  return {
    visualStates: states,
    graph: {
      nodes: (graph?.nodes ?? []).map(node => migrateObject(node, 'node')),
      edges: (graph?.edges ?? []).map(edge => migrateObject(edge, 'edge')),
    },
    steps: (steps ?? []).map(step => ({
      ...cloneJson(step),
      nodeOverrides: Object.fromEntries(
        Object.entries(step?.nodeOverrides ?? {}).map(([id, patch]) => [
          id,
          migrateObject(patch, 'node'),
        ])
      ),
      edgeOverrides: Object.fromEntries(
        Object.entries(step?.edgeOverrides ?? {}).map(([id, patch]) => [
          id,
          migrateObject(patch, 'edge'),
        ])
      ),
    })),
  };
};

export const removeVisualStateReferences = ({ graph, steps, stateId }) => {
  const removeReference = object => {
    const nextObject = cloneJson(object);
    if (String(nextObject?.stateId ?? '') === String(stateId)) {
      delete nextObject.stateId;
    }
    return nextObject;
  };
  return {
    graph: {
      nodes: (graph?.nodes ?? []).map(removeReference),
      edges: (graph?.edges ?? []).map(removeReference),
    },
    steps: (steps ?? []).map(step => ({
      ...cloneJson(step),
      nodeOverrides: Object.fromEntries(
        Object.entries(step?.nodeOverrides ?? {}).map(([id, patch]) => [
          id,
          removeReference(patch),
        ])
      ),
      edgeOverrides: Object.fromEntries(
        Object.entries(step?.edgeOverrides ?? {}).map(([id, patch]) => [
          id,
          removeReference(patch),
        ])
      ),
    })),
  };
};
