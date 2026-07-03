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

const getBaseObject = (baseGraph, objectType, objectId) => {
  const collectionKey = getGraphCollectionKey(objectType);
  if (!collectionKey) return null;
  return (
    (baseGraph?.[collectionKey] ?? []).find(
      item => String(item.id) === String(objectId)
    ) ?? null
  );
};

const isBaseObjectVisible = (baseGraph, objectType, objectId) => {
  const object = getBaseObject(baseGraph, objectType, objectId);
  return object?.visible !== false;
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

export const applyVisibilityToStep = ({
  baseGraph,
  step,
  objectType,
  objectId,
  visible,
}) => {
  if (visible === false) {
    return applyFrameOverride(step, objectType, objectId, { visible: false });
  }

  if (isBaseObjectVisible(baseGraph, objectType, objectId)) {
    return removeFrameOverrideProperties(step, objectType, objectId, 'visible');
  }

  return applyFrameOverride(step, objectType, objectId, { visible: true });
};

export const applyVisibilityToFrame = ({
  baseGraph,
  steps,
  objectType,
  objectId,
  frameIndex,
  visible,
}) => {
  const safeFrameIndex = Math.max(0, Number(frameIndex) || 0);
  return (Array.isArray(steps) ? steps : []).map((step, index) =>
    index === safeFrameIndex
      ? applyVisibilityToStep({
          baseGraph,
          step,
          objectType,
          objectId,
          visible,
        })
      : cloneJson(step ?? {})
  );
};

export const applyVisibilityFromFrame = ({
  baseGraph,
  steps,
  objectType,
  objectId,
  frameIndex,
  visible,
}) => {
  const safeFrameIndex = Math.max(0, Number(frameIndex) || 0);
  return (Array.isArray(steps) ? steps : []).map((step, index) =>
    index < safeFrameIndex
      ? cloneJson(step ?? {})
      : applyVisibilityToStep({
          baseGraph,
          step,
          objectType,
          objectId,
          visible,
        })
  );
};

export const deleteObjectsFromProject = ({
  baseGraph,
  steps,
  objectType,
  objectIds,
}) => {
  const ids = new Set(
    (Array.isArray(objectIds) ? objectIds : [objectIds]).map(String)
  );
  const nextGraph = cloneJson(baseGraph ?? { nodes: [], edges: [] });
  const nextStepsInput = Array.isArray(steps) ? steps : [];

  if (!ids.size) {
    return {
      baseGraph: nextGraph,
      steps: nextStepsInput.map(step => cloneJson(step ?? {})),
    };
  }

  if (objectType === 'node') {
    const removedEdgeIds = new Set();
    const nodes = (nextGraph.nodes ?? []).filter(
      node => !ids.has(String(node.id))
    );
    const edges = (nextGraph.edges ?? []).filter(edge => {
      const shouldRemove =
        ids.has(String(edge.from)) || ids.has(String(edge.to));
      if (shouldRemove) removedEdgeIds.add(String(edge.id));
      return !shouldRemove;
    });
    const nextSteps = nextStepsInput.map(step => {
      const nextStep = cloneJson(step ?? {});
      const nodeOverrides = isRecord(nextStep.nodeOverrides)
        ? { ...nextStep.nodeOverrides }
        : {};
      const edgeOverrides = isRecord(nextStep.edgeOverrides)
        ? { ...nextStep.edgeOverrides }
        : {};
      ids.forEach(id => {
        delete nodeOverrides[id];
      });
      removedEdgeIds.forEach(edgeId => {
        delete edgeOverrides[edgeId];
      });
      return { ...nextStep, nodeOverrides, edgeOverrides };
    });

    return {
      baseGraph: { ...nextGraph, nodes, edges },
      steps: nextSteps,
    };
  }

  if (objectType === 'edge') {
    const edges = (nextGraph.edges ?? []).filter(
      edge => !ids.has(String(edge.id))
    );
    const nextSteps = nextStepsInput.map(step => {
      const nextStep = cloneJson(step ?? {});
      const edgeOverrides = isRecord(nextStep.edgeOverrides)
        ? { ...nextStep.edgeOverrides }
        : {};
      ids.forEach(id => {
        delete edgeOverrides[id];
      });
      return { ...nextStep, edgeOverrides };
    });

    return {
      baseGraph: { ...nextGraph, edges },
      steps: nextSteps,
    };
  }

  return {
    baseGraph: nextGraph,
    steps: nextStepsInput.map(step => cloneJson(step ?? {})),
  };
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
