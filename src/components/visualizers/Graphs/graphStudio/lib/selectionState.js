const getIdText = id => String(id);

const hasId = (ids, candidateId) => {
  const candidateText = getIdText(candidateId);
  return ids.some(id => getIdText(id) === candidateText);
};

const getUniqueIdList = ids => {
  const seen = new Set();
  const uniqueIds = [];

  (ids ?? []).forEach(id => {
    const idText = getIdText(id);
    if (seen.has(idText)) return;
    seen.add(idText);
    uniqueIds.push(id);
  });

  return uniqueIds;
};

export const resolveNodeSelection = ({
  selectedObject,
  selectedNodeIds,
  nodeId,
  additive = false,
}) => {
  const idText = getIdText(nodeId);
  if (!additive) {
    return {
      selectedObject: { type: 'node', id: nodeId },
      selectedNodeIds: [idText],
    };
  }

  const currentIds = getUniqueIdList(selectedNodeIds).map(getIdText);
  const wasSelected = currentIds.includes(idText);
  const nextNodeIds = wasSelected
    ? currentIds.filter(id => id !== idText)
    : [...currentIds, idText];

  if (nextNodeIds.length === 0) {
    return { selectedObject: null, selectedNodeIds: [] };
  }

  if (!wasSelected) {
    return {
      selectedObject: { type: 'node', id: nodeId },
      selectedNodeIds: nextNodeIds,
    };
  }

  const previousPrimaryId =
    selectedObject?.type === 'node' && hasId(nextNodeIds, selectedObject.id)
      ? selectedObject.id
      : nextNodeIds[nextNodeIds.length - 1];

  return {
    selectedObject: { type: 'node', id: previousPrimaryId },
    selectedNodeIds: nextNodeIds,
  };
};

export const reconcileSelectionWithGraph = ({
  selectedObject,
  selectedNodeIds,
  nodeIds,
  edgeIds,
}) => {
  const existingNodeIds = new Set((nodeIds ?? []).map(getIdText));
  const existingEdgeIds = new Set((edgeIds ?? []).map(getIdText));
  const nextNodeIds = getUniqueIdList(selectedNodeIds).filter(id =>
    existingNodeIds.has(getIdText(id))
  );

  if (nextNodeIds.length === 1) {
    const onlyNodeId = nextNodeIds[0];
    const selectedObjectMatches =
      selectedObject?.type === 'node' &&
      getIdText(selectedObject.id) === getIdText(onlyNodeId);

    return {
      selectedObject: selectedObjectMatches
        ? selectedObject
        : { type: 'node', id: onlyNodeId },
      selectedNodeIds: nextNodeIds,
    };
  }

  if (nextNodeIds.length > 1) {
    const selectedObjectMatches =
      selectedObject?.type === 'node' && hasId(nextNodeIds, selectedObject.id);

    return {
      selectedObject: selectedObjectMatches ? selectedObject : null,
      selectedNodeIds: nextNodeIds,
    };
  }

  const selectedEdgeExists =
    selectedObject?.type === 'edge' &&
    existingEdgeIds.has(getIdText(selectedObject.id));

  return {
    selectedObject: selectedEdgeExists ? selectedObject : null,
    selectedNodeIds: [],
  };
};
