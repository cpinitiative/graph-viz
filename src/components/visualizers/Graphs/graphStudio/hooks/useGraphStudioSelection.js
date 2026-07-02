import { useCallback, useEffect, useMemo, useState } from 'react';
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
      const exists = computedGraph.nodes.some(
        node => String(node.id) === String(selectedObject.id)
      );
      if (!exists) {
        const timeout = setTimeout(() => setSelectedObject(null), 0);
        return () => clearTimeout(timeout);
      }
      return;
    }
    if (selectedObject.type === 'edge') {
      const exists = computedGraph.edges.some(
        edge => String(edge.id) === String(selectedObject.id)
      );
      if (!exists) {
        const timeout = setTimeout(() => setSelectedObject(null), 0);
        return () => clearTimeout(timeout);
      }
    }
    return;
  }, [selectedObject, computedGraph]);

  const nodeConnectedEdges = useMemo(() => {
    if (!selectedNode) return [];
    const nodeId = String(selectedNode.id);
    return computedGraph.edges.filter(
      edge => String(edge.from) === nodeId || String(edge.to) === nodeId
    );
  }, [selectedNode, computedGraph.edges]);

  const edgeConnectedNodes = useMemo(() => {
    if (!selectedEdge) return [];
    const nodeMap = new Map(
      computedGraph.nodes.map(node => [String(node.id), node])
    );
    const fromNode = nodeMap.get(String(selectedEdge.from));
    const toNode = nodeMap.get(String(selectedEdge.to));
    return [fromNode, toNode].filter(
      (node, index, nodes) =>
        node &&
        nodes.findIndex(item => String(item?.id) === String(node.id)) === index
    );
  }, [selectedEdge, computedGraph.nodes]);

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

  return {
    updateSelectedNode,
    updateSelectedEdge,
    applyPatchToSelectedNodes,
    resetSelectedNodeOverride,
    resetSelectedEdgeOverride,
    applySelectedNodeToAllFrames,
    applySelectedEdgeToAllFrames,
  };
};
