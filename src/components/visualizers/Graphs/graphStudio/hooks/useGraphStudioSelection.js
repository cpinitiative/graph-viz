import { useCallback, useEffect, useMemo, useState } from 'react';
import { splitEdgePatch, splitNodePatch } from '../lib/graphPropertyRouting';
import { reconcileSelectionWithGraph } from '../lib/selectionState';

const PROPERTY_LABELS = {
  color: 'color',
  status: 'status',
  visible: 'visibility',
  label: 'label',
  directed: 'direction',
};

const getPropertyLabel = key => PROPERTY_LABELS[key] ?? key;

const getFirstPatchKey = patch => Object.keys(patch ?? {})[0];

const getPresenceLabel = visible => (visible ? 'shown' : 'not shown');

const selectionObjectsMatch = (first, second) =>
  first === second ||
  (first?.type === second?.type && String(first?.id) === String(second?.id));

const selectedNodeIdsMatch = (first, second) =>
  first.length === second.length &&
  first.every((id, index) => String(id) === String(second[index]));

export const useGraphStudioSelection = ({ baseGraph, computedGraph }) => {
  const [selectedObject, setSelectedObject] = useState(null);
  const [selectedNodeIds, setSelectedNodeIds] = useState([]);
  const nodeMap = useMemo(
    () => new Map(computedGraph.nodes.map(node => [String(node.id), node])),
    [computedGraph.nodes]
  );

  const selectedNodeIdSet = useMemo(
    () => new Set(selectedNodeIds.map(String)),
    [selectedNodeIds]
  );

  const selectedNode = useMemo(() => {
    if (!selectedObject || selectedObject.type !== 'node') return null;
    return (
      computedGraph.nodes.find(
        node => String(node.id) === String(selectedObject.id)
      ) ?? null
    );
  }, [selectedObject, computedGraph.nodes]);

  const selectedEdge = useMemo(() => {
    if (!selectedObject || selectedObject.type !== 'edge') return null;
    return (
      computedGraph.edges.find(
        edge => String(edge.id) === String(selectedObject.id)
      ) ?? null
    );
  }, [selectedObject, computedGraph.edges]);

  useEffect(() => {
    const nextSelection = reconcileSelectionWithGraph({
      selectedObject,
      selectedNodeIds,
      nodeIds: computedGraph.nodes.map(node => node.id),
      edgeIds: computedGraph.edges.map(edge => edge.id),
    });
    const objectChanged = !selectionObjectsMatch(
      selectedObject,
      nextSelection.selectedObject
    );
    const nodeIdsChanged = !selectedNodeIdsMatch(
      selectedNodeIds,
      nextSelection.selectedNodeIds
    );
    if (!objectChanged && !nodeIdsChanged) return undefined;

    const timeout = setTimeout(() => {
      if (objectChanged) setSelectedObject(nextSelection.selectedObject);
      if (nodeIdsChanged) setSelectedNodeIds(nextSelection.selectedNodeIds);
    }, 0);
    return () => clearTimeout(timeout);
  }, [
    selectedObject,
    selectedNodeIds,
    computedGraph.nodes,
    computedGraph.edges,
  ]);

  const nodeConnectedEdges = useMemo(() => {
    if (!selectedNode) return [];
    const nodeId = String(selectedNode.id);
    return (baseGraph?.edges ?? []).filter(
      edge => String(edge.from) === nodeId || String(edge.to) === nodeId
    );
  }, [baseGraph?.edges, selectedNode]);

  const edgeConnectedNodes = useMemo(() => {
    if (!selectedEdge) return [];
    const fromNode = nodeMap.get(String(selectedEdge.from));
    const toNode = nodeMap.get(String(selectedEdge.to));
    return [fromNode, toNode].filter(
      (node, index, nodes) =>
        node &&
        nodes.findIndex(item => String(item?.id) === String(node.id)) === index
    );
  }, [selectedEdge, nodeMap]);

  const clearSelection = useCallback(() => {
    setSelectedObject(null);
    setSelectedNodeIds([]);
  }, []);

  return {
    selectedObject,
    setSelectedObject,
    selectedNodeIds,
    setSelectedNodeIds,
    selectedNodeIdSet,
    selectedNode,
    selectedEdge,
    nodeConnectedEdges,
    edgeConnectedNodes,
    clearSelection,
  };
};

export const useGraphStudioSelectionPatchers = ({
  selectedNode,
  selectedEdge,
  selectedNodeIds,
  updateBaseNode,
  updateBaseEdge,
  setFrameOverride,
  resetFrameOverride,
  applyTemporalPropertyToAllFrames,
  setTemporalVisibility,
  setTemporalVisibilityFromFrame,
  setTemporalVisibilityForObjects,
  setTemporalVisibilityForObjectsFromFrame,
  currentFrame,
  setStatus,
}) => {
  const frameNumber = currentFrame + 1;

  const updateSelectedNode = useCallback(
    patch => {
      if (!selectedNode) return;
      const { basePatch, stepUpdates } = splitNodePatch(patch);
      if (stepUpdates.length > 0) {
        const visibilityUpdate = stepUpdates.find(
          ({ key }) => key === 'visible'
        );
        const stepPatch = Object.fromEntries(
          stepUpdates
            .filter(({ key }) => key !== 'visible')
            .map(({ key, value }) => [key, value])
        );
        if (Object.keys(stepPatch).length > 0) {
          setFrameOverride('node', selectedNode.id, stepPatch);
        }
        if (visibilityUpdate) {
          setTemporalVisibility?.(
            'node',
            selectedNode.id,
            visibilityUpdate.value
          );
          setStatus?.(
            `Node ${selectedNode.id} ${getPresenceLabel(
              visibilityUpdate.value
            )} on Frame ${frameNumber}`
          );
        } else {
          setStatus?.(
            `Node ${getPropertyLabel(stepUpdates[0].key)} updated for Frame ${frameNumber}`
          );
        }
      }
      if (Object.keys(basePatch).length > 0) {
        updateBaseNode(selectedNode.id, basePatch);
        const key = getFirstPatchKey(basePatch);
        setStatus?.(`Node ${getPropertyLabel(key)} updated for all frames`);
      }
    },
    [
      frameNumber,
      selectedNode,
      setFrameOverride,
      setStatus,
      setTemporalVisibility,
      updateBaseNode,
    ]
  );

  const updateSelectedEdge = useCallback(
    patch => {
      if (!selectedEdge) return;
      const { basePatch, stepUpdates } = splitEdgePatch(patch);
      if (stepUpdates.length > 0) {
        const visibilityUpdate = stepUpdates.find(
          ({ key }) => key === 'visible'
        );
        const stepPatch = Object.fromEntries(
          stepUpdates
            .filter(({ key }) => key !== 'visible')
            .map(({ key, value }) => [key, value])
        );
        if (Object.keys(stepPatch).length > 0) {
          setFrameOverride('edge', selectedEdge.id, stepPatch);
        }
        if (visibilityUpdate) {
          setTemporalVisibility?.(
            'edge',
            selectedEdge.id,
            visibilityUpdate.value
          );
          setStatus?.(
            `Edge ${selectedEdge.id} ${getPresenceLabel(
              visibilityUpdate.value
            )} on Frame ${frameNumber}`
          );
        } else {
          setStatus?.(
            `Edge ${getPropertyLabel(stepUpdates[0].key)} updated for Frame ${frameNumber}`
          );
        }
      }
      if (Object.keys(basePatch).length > 0) {
        updateBaseEdge(selectedEdge.id, basePatch);
        const key = getFirstPatchKey(basePatch);
        setStatus?.(`Edge ${getPropertyLabel(key)} updated for all frames`);
      }
    },
    [
      frameNumber,
      selectedEdge,
      setFrameOverride,
      setStatus,
      setTemporalVisibility,
      updateBaseEdge,
    ]
  );

  const applyPatchToSelectedNodes = useCallback(
    patch => {
      if (!selectedNodeIds.length) return;
      const hasVisibility = Object.prototype.hasOwnProperty.call(
        patch ?? {},
        'visible'
      );
      const framePatch = { ...(patch ?? {}) };
      delete framePatch.visible;
      selectedNodeIds.forEach(id => {
        if (Object.keys(framePatch).length > 0) {
          setFrameOverride('node', id, framePatch);
        }
        if (hasVisibility) {
          setTemporalVisibility?.('node', id, patch.visible);
        }
      });
      if (hasVisibility) {
        setStatus?.(
          `${selectedNodeIds.length} nodes ${getPresenceLabel(
            patch.visible
          )} on Frame ${frameNumber}`
        );
      } else {
        setStatus?.(
          `${selectedNodeIds.length} nodes updated for Frame ${frameNumber}`
        );
      }
    },
    [
      frameNumber,
      selectedNodeIds,
      setFrameOverride,
      setStatus,
      setTemporalVisibility,
    ]
  );

  const resetSelectedNodeOverride = useCallback(
    key => {
      if (!selectedNode) return;
      resetFrameOverride('node', selectedNode.id, key);
      setStatus?.(
        `Node ${getPropertyLabel(key)} reset for Frame ${frameNumber}`
      );
    },
    [frameNumber, resetFrameOverride, selectedNode, setStatus]
  );

  const resetSelectedEdgeOverride = useCallback(
    key => {
      if (!selectedEdge) return;
      resetFrameOverride('edge', selectedEdge.id, key);
      setStatus?.(
        `Edge ${getPropertyLabel(key)} reset for Frame ${frameNumber}`
      );
    },
    [frameNumber, resetFrameOverride, selectedEdge, setStatus]
  );

  const applySelectedNodeToAllFrames = useCallback(
    patch => {
      if (!selectedNode) return;
      applyTemporalPropertyToAllFrames('node', selectedNode.id, patch);
      const key = getFirstPatchKey(patch);
      setStatus?.(`Applied node ${getPropertyLabel(key)} to all frames`);
    },
    [applyTemporalPropertyToAllFrames, selectedNode, setStatus]
  );

  const applySelectedEdgeToAllFrames = useCallback(
    patch => {
      if (!selectedEdge) return;
      applyTemporalPropertyToAllFrames('edge', selectedEdge.id, patch);
      const key = getFirstPatchKey(patch);
      setStatus?.(`Applied edge ${getPropertyLabel(key)} to all frames`);
    },
    [applyTemporalPropertyToAllFrames, selectedEdge, setStatus]
  );

  const setSelectedNodeVisibilityForFrame = useCallback(
    visible => {
      if (!selectedNode) return;
      setTemporalVisibility?.('node', selectedNode.id, visible);
      setStatus?.(
        `Node ${selectedNode.id} ${getPresenceLabel(visible)} on Frame ${frameNumber}`
      );
    },
    [frameNumber, selectedNode, setStatus, setTemporalVisibility]
  );

  const setSelectedNodeVisibilityFromFrame = useCallback(
    visible => {
      if (!selectedNode) return;
      setTemporalVisibilityFromFrame?.('node', selectedNode.id, visible);
      setStatus?.(
        `Node ${selectedNode.id} ${getPresenceLabel(
          visible
        )} from Frame ${frameNumber} onward`
      );
    },
    [frameNumber, selectedNode, setStatus, setTemporalVisibilityFromFrame]
  );

  const setSelectedNodesVisibilityForFrame = useCallback(
    visible => {
      if (!selectedNodeIds.length) return;
      setTemporalVisibilityForObjects?.('node', selectedNodeIds, visible);
      setStatus?.(
        `${selectedNodeIds.length} nodes ${getPresenceLabel(
          visible
        )} on Frame ${frameNumber}`
      );
    },
    [frameNumber, selectedNodeIds, setStatus, setTemporalVisibilityForObjects]
  );

  const setSelectedNodesVisibilityFromFrame = useCallback(
    visible => {
      if (!selectedNodeIds.length) return;
      setTemporalVisibilityForObjectsFromFrame?.(
        'node',
        selectedNodeIds,
        visible
      );
      setStatus?.(
        `${selectedNodeIds.length} nodes ${getPresenceLabel(
          visible
        )} from Frame ${frameNumber} onward`
      );
    },
    [
      frameNumber,
      selectedNodeIds,
      setStatus,
      setTemporalVisibilityForObjectsFromFrame,
    ]
  );

  const setSelectedEdgeVisibilityForFrame = useCallback(
    visible => {
      if (!selectedEdge) return;
      setTemporalVisibility?.('edge', selectedEdge.id, visible);
      setStatus?.(
        `Edge ${selectedEdge.id} ${getPresenceLabel(visible)} on Frame ${frameNumber}`
      );
    },
    [frameNumber, selectedEdge, setStatus, setTemporalVisibility]
  );

  const setSelectedEdgeVisibilityFromFrame = useCallback(
    visible => {
      if (!selectedEdge) return;
      setTemporalVisibilityFromFrame?.('edge', selectedEdge.id, visible);
      setStatus?.(
        `Edge ${selectedEdge.id} ${getPresenceLabel(
          visible
        )} from Frame ${frameNumber} onward`
      );
    },
    [frameNumber, selectedEdge, setStatus, setTemporalVisibilityFromFrame]
  );

  return {
    updateSelectedNode,
    updateSelectedEdge,
    applyPatchToSelectedNodes,
    resetSelectedNodeOverride,
    resetSelectedEdgeOverride,
    applySelectedNodeToAllFrames,
    applySelectedEdgeToAllFrames,
    setSelectedNodeVisibilityForFrame,
    setSelectedNodeVisibilityFromFrame,
    setSelectedNodesVisibilityForFrame,
    setSelectedNodesVisibilityFromFrame,
    setSelectedEdgeVisibilityForFrame,
    setSelectedEdgeVisibilityFromFrame,
  };
};
