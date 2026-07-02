const cloneJson = value => JSON.parse(JSON.stringify(value ?? null));

const OVERRIDE_MAP_BY_TYPE = {
  node: 'nodeOverrides',
  edge: 'edgeOverrides',
};

const GRAPH_COLLECTION_BY_TYPE = {
  node: 'nodes',
  edge: 'edges',
};

const getOverrideMapKey = objectType => OVERRIDE_MAP_BY_TYPE[objectType];

const getGraphCollectionKey = objectType =>
  GRAPH_COLLECTION_BY_TYPE[objectType];

const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value, key);

const isRecord = value =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const getObjectOverride = (step, objectType, objectId) => {
  const mapKey = getOverrideMapKey(objectType);
  if (!mapKey) return {};
  const overrideMap = isRecord(step?.[mapKey]) ? step[mapKey] : {};
  const override = overrideMap[String(objectId)];
  return isRecord(override) ? override : {};
};

export const resolveFrameGraph = (baseGraph, step) => {
  const nodeOverrides = isRecord(step?.nodeOverrides) ? step.nodeOverrides : {};
  const edgeOverrides = isRecord(step?.edgeOverrides) ? step.edgeOverrides : {};
  const nodes = (baseGraph?.nodes ?? []).map(node => ({
    ...node,
    ...(nodeOverrides[String(node.id)] ?? {}),
    id: node.id,
  }));
  const edges = (baseGraph?.edges ?? []).map(edge => ({
    ...edge,
    ...(edgeOverrides[String(edge.id)] ?? {}),
    id: edge.id,
    from: edge.from,
    to: edge.to,
  }));
  return { nodes, edges };
};

export const hasFrameOverride = (step, objectType, objectId, key) =>
  hasOwn(getObjectOverride(step, objectType, objectId), key);

export const getFrameOverrideState = (step, objectType, objectId, keys) =>
  Object.fromEntries(
    keys.map(key => [key, hasFrameOverride(step, objectType, objectId, key)])
  );

export const applyFrameOverride = (step, objectType, objectId, patch) => {
  const mapKey = getOverrideMapKey(objectType);
  if (!mapKey || !isRecord(patch)) return cloneJson(step ?? {});
  const nextStep = cloneJson(step ?? {});
  const overrideMap = isRecord(nextStep[mapKey]) ? nextStep[mapKey] : {};
  const id = String(objectId);
  nextStep[mapKey] = {
    ...overrideMap,
    [id]: {
      ...(isRecord(overrideMap[id]) ? overrideMap[id] : {}),
      ...cloneJson(patch),
    },
  };
  return nextStep;
};

export const removeFrameOverrideProperties = (
  step,
  objectType,
  objectId,
  keys
) => {
  const mapKey = getOverrideMapKey(objectType);
  const resetKeys = Array.isArray(keys) ? keys : [keys];
  if (!mapKey || resetKeys.length === 0) return cloneJson(step ?? {});

  const nextStep = cloneJson(step ?? {});
  const overrideMap = isRecord(nextStep[mapKey]) ? nextStep[mapKey] : {};
  const id = String(objectId);
  const entry = isRecord(overrideMap[id]) ? { ...overrideMap[id] } : null;
  if (!entry) return nextStep;

  resetKeys.forEach(key => {
    delete entry[key];
  });

  nextStep[mapKey] = { ...overrideMap };
  if (Object.keys(entry).length) {
    nextStep[mapKey][id] = entry;
  } else {
    delete nextStep[mapKey][id];
  }

  return nextStep;
};

export const removeFrameOverridePropertiesFromSteps = (
  steps,
  objectType,
  objectId,
  keys
) =>
  (Array.isArray(steps) ? steps : []).map(step =>
    removeFrameOverrideProperties(step, objectType, objectId, keys)
  );

export const applyTemporalVisibilityFromFrame = (
  steps,
  objectType,
  objectId,
  frameIndex
) => {
  const safeFrameIndex = Math.max(0, Number(frameIndex) || 0);
  return (Array.isArray(steps) ? steps : []).map((step, index) =>
    index < safeFrameIndex
      ? applyFrameOverride(step, objectType, objectId, { visible: false })
      : removeFrameOverrideProperties(step, objectType, objectId, 'visible')
  );
};

export const applyPropertyToAllFrames = ({
  baseGraph,
  steps,
  objectType,
  objectId,
  patch,
}) => {
  const collectionKey = getGraphCollectionKey(objectType);
  if (!collectionKey || !isRecord(patch)) {
    return {
      baseGraph: cloneJson(baseGraph ?? { nodes: [], edges: [] }),
      steps: cloneJson(steps ?? []),
    };
  }

  const id = String(objectId);
  const patchKeys = Object.keys(patch);
  const nextGraph = {
    ...cloneJson(baseGraph ?? { nodes: [], edges: [] }),
    [collectionKey]: (baseGraph?.[collectionKey] ?? []).map(item =>
      String(item.id) === id ? { ...item, ...cloneJson(patch) } : item
    ),
  };
  const nextSteps = removeFrameOverridePropertiesFromSteps(
    steps,
    objectType,
    objectId,
    patchKeys
  );

  return { baseGraph: nextGraph, steps: nextSteps };
};
