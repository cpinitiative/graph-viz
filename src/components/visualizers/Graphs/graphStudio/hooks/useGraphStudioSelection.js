import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  isEdgeEffectivelyVisible,
  isNodeVisible,
} from '../lib/effectiveVisibility';
import { splitEdgePatch, splitNodePatch } from '../lib/graphPropertyRouting';

const PROPERTY_LABELS = {
  color: 'color',
  status: 'status',
  visible: 'visibility',
  label: 'label',
  directed: 'direction',
};

const getPropertyLabel = key => PROPERTY_LABELS[key] ?? key;

const getFirstPatchKey = patch => Object.keys(patch ?? {})[0];

export const useGraphStudioSelection = ({ computedGraph }) => {
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
    if (!selectedObject) return;
    if (selectedObject.type === 'node') {
      const node = computedGraph.nodes.find(
        node => String(node.id) === String(selectedObject.id)
      );
      if (!node || !isNodeVisible(node)) {
        const timeout = setTimeout(() => setSelectedObject(null), 0);
        return () => clearTimeout(timeout);
      }
      return;
    }
    if (selectedObject.type === 'edge') {
      const edge = computedGraph.edges.find(
        edge => String(edge.id) === String(selectedObject.id)
      );
      if (!edge || !isEdgeEffectivelyVisible(edge, nodeMap)) {
        const timeout = setTimeout(() => setSelectedObject(null), 0);
        return () => clearTimeout(timeout);
      }
    }
    return;
  }, [selectedObject, computedGraph, nodeMap]);

  useEffect(() => {
    if (!selectedNodeIds.length) return undefined;
    const visibleNodeIds = selectedNodeIds.filter(id =>
      isNodeVisible(nodeMap.get(String(id)))
    );
    if (visibleNodeIds.length === selectedNodeIds.length) return undefined;
    const timeout = setTimeout(() => setSelectedNodeIds(visibleNodeIds), 0);
    return () => clearTimeout(timeout);
  }, [nodeMap, selectedNodeIds]);

  const nodeConnectedEdges = useMemo(() => {
    if (!selectedNode) return [];
    const nodeId = String(selectedNode.id);
    return computedGraph.edges.filter(
      edge =>
        (String(edge.from) === nodeId || String(edge.to) === nodeId) &&
        isEdgeEffectivelyVisible(edge, nodeMap)
    );
  }, [computedGraph.edges, nodeMap, selectedNode]);

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
  currentFrame,
  setStatus,
}) => {
  const frameNumber = currentFrame + 1;

  const updateSelectedNode = useCallback(
    patch => {
      if (!selectedNode) return;
      const { basePatch, stepUpdates } = splitNodePatch(patch);
      if (stepUpdates.length > 0) {
        const stepPatch = Object.fromEntries(
          stepUpdates.map(({ key, value }) => [key, value])
        );
        setFrameOverride('node', selectedNode.id, stepPatch);
        setStatus?.(
          `Node ${getPropertyLabel(stepUpdates[0].key)} updated for Frame ${frameNumber}`
        );
      }
      if (Object.keys(basePatch).length > 0) {
        updateBaseNode(selectedNode.id, basePatch);
        const key = getFirstPatchKey(basePatch);
        setStatus?.(`Node ${getPropertyLabel(key)} updated for all frames`);
      }
    },
    [frameNumber, selectedNode, setFrameOverride, setStatus, updateBaseNode]
  );

  const updateSelectedEdge = useCallback(
    patch => {
      if (!selectedEdge) return;
      const { basePatch, stepUpdates } = splitEdgePatch(patch);
      if (stepUpdates.length > 0) {
        const stepPatch = Object.fromEntries(
          stepUpdates.map(({ key, value }) => [key, value])
        );
        setFrameOverride('edge', selectedEdge.id, stepPatch);
        setStatus?.(
          `Edge ${getPropertyLabel(stepUpdates[0].key)} updated for Frame ${frameNumber}`
        );
      }
      if (Object.keys(basePatch).length > 0) {
        updateBaseEdge(selectedEdge.id, basePatch);
        const key = getFirstPatchKey(basePatch);
        setStatus?.(`Edge ${getPropertyLabel(key)} updated for all frames`);
      }
    },
    [frameNumber, selectedEdge, setFrameOverride, setStatus, updateBaseEdge]
  );

  const applyPatchToSelectedNodes = useCallback(
    patch => {
      if (!selectedNodeIds.length) return;
      selectedNodeIds.forEach(id => {
        setFrameOverride('node', id, patch);
      });
      setStatus?.(
        `${selectedNodeIds.length} nodes updated for Frame ${frameNumber}`
      );
    },
    [frameNumber, selectedNodeIds, setFrameOverride, setStatus]
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
        `Node ${selectedNode.id} ${visible ? 'shown' : 'hidden'} on Frame ${frameNumber}`
      );
    },
    [frameNumber, selectedNode, setStatus, setTemporalVisibility]
  );

  const setSelectedNodeVisibilityFromFrame = useCallback(
    visible => {
      if (!selectedNode) return;
      setTemporalVisibilityFromFrame?.('node', selectedNode.id, visible);
      setStatus?.(
        `Node ${selectedNode.id} ${visible ? 'shown' : 'hidden'} from Frame ${frameNumber} onward`
      );
    },
    [frameNumber, selectedNode, setStatus, setTemporalVisibilityFromFrame]
  );

  const setSelectedEdgeVisibilityForFrame = useCallback(
    visible => {
      if (!selectedEdge) return;
      setTemporalVisibility?.('edge', selectedEdge.id, visible);
      setStatus?.(
        `Edge ${selectedEdge.id} ${visible ? 'shown' : 'hidden'} on Frame ${frameNumber}`
      );
    },
    [frameNumber, selectedEdge, setStatus, setTemporalVisibility]
  );

  const setSelectedEdgeVisibilityFromFrame = useCallback(
    visible => {
      if (!selectedEdge) return;
      setTemporalVisibilityFromFrame?.('edge', selectedEdge.id, visible);
      setStatus?.(
        `Edge ${selectedEdge.id} ${visible ? 'shown' : 'hidden'} from Frame ${frameNumber} onward`
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
    setSelectedEdgeVisibilityForFrame,
    setSelectedEdgeVisibilityFromFrame,
  };
};
