import { useCallback, useEffect, useMemo, useState } from 'react';
import { splitEdgePatch, splitNodePatch } from '../lib/graphPropertyRouting';

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
  setStepProperty,
}) => {
  const updateSelectedNode = useCallback(
    patch => {
      if (!selectedNode) return;
      const { basePatch, stepUpdates } = splitNodePatch(patch);
      stepUpdates.forEach(({ key, value }) => {
        setStepProperty(`nodeOverrides.${selectedNode.id}.${key}`, value);
      });
      if (Object.keys(basePatch).length > 0) {
        updateBaseNode(selectedNode.id, basePatch);
      }
    },
    [selectedNode, setStepProperty, updateBaseNode]
  );

  const updateSelectedEdge = useCallback(
    patch => {
      if (!selectedEdge) return;
      const { basePatch, stepUpdates } = splitEdgePatch(patch);
      stepUpdates.forEach(({ key, value }) => {
        setStepProperty(`edgeOverrides.${selectedEdge.id}.${key}`, value);
      });
      if (Object.keys(basePatch).length > 0) {
        updateBaseEdge(selectedEdge.id, basePatch);
      }
    },
    [selectedEdge, setStepProperty, updateBaseEdge]
  );

  const applyPatchToSelectedNodes = useCallback(
    patch => {
      if (!selectedNodeIds.length) return;
      selectedNodeIds.forEach(id => {
        Object.entries(patch).forEach(([key, value]) => {
          setStepProperty(`nodeOverrides.${id}.${key}`, value);
        });
      });
    },
    [selectedNodeIds, setStepProperty]
  );

  return {
    updateSelectedNode,
    updateSelectedEdge,
    applyPatchToSelectedNodes,
  };
};
