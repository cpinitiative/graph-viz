import { useCallback, useEffect, useRef } from 'react';
import { VIEWBOX_HEIGHT, VIEWBOX_WIDTH } from '../constants';
import {
  circularLayout,
  clampNodePosition,
  forceDirectedLayout,
  snapToGrid,
  treeLayout,
} from '../graphStudioUtils';

const syncIdCounters = (graph, nextNodeIdRef, nextEdgeIdRef) => {
  nextNodeIdRef.current =
    Math.max(
      -1,
      ...(graph?.nodes ?? []).map(node =>
        Number.isFinite(Number(node.id)) ? Number(node.id) : -1
      )
    ) + 1;

  nextEdgeIdRef.current =
    Math.max(
      -1,
      ...(graph?.edges ?? []).map(edge => {
        const match = String(edge.id).match(/^e(\d+)$/);
        return match ? Number(match[1]) : -1;
      })
    ) + 1;
};

export const useGraphStudioGraphModel = ({
  baseGraph,
  setBaseGraph,
  steps,
  currentFrame,
  updateStep,
  replaceTimeline,
  snapEnabled,
  forceStrength,
  setStatus,
  selectedNodeIds,
  selectedEdge,
  setSelectedObject,
  setSelectedNodeIds,
}) => {
  const nextNodeIdRef = useRef(0);
  const nextEdgeIdRef = useRef(0);

  useEffect(() => {
    syncIdCounters(baseGraph, nextNodeIdRef, nextEdgeIdRef);
  }, [baseGraph]);

  const updateBaseNode = useCallback(
    (nodeId, patch) => {
      setBaseGraph(prev => ({
        ...prev,
        nodes: prev.nodes.map(node =>
          String(node.id) === String(nodeId) ? { ...node, ...patch } : node
        ),
      }));
    },
    [setBaseGraph]
  );

  const updateBaseNodesBulk = useCallback(
    patchById => {
      setBaseGraph(prev => ({
        ...prev,
        nodes: prev.nodes.map(node => {
          const patch = patchById[String(node.id)];
          return patch ? { ...node, ...patch } : node;
        }),
      }));
    },
    [setBaseGraph]
  );

  const updateBaseEdge = useCallback(
    (edgeId, patch) => {
      setBaseGraph(prev => ({
        ...prev,
        edges: prev.edges.map(edge =>
          String(edge.id) === String(edgeId) ? { ...edge, ...patch } : edge
        ),
      }));
    },
    [setBaseGraph]
  );

  const setStepProperty = useCallback(
    (path, value) => {
      updateStep(currentFrame, path, value);
    },
    [currentFrame, updateStep]
  );

  const addNodeAt = useCallback(
    point => {
      const id = nextNodeIdRef.current;
      nextNodeIdRef.current += 1;
      const position = clampNodePosition({
        x: snapEnabled ? snapToGrid(point.x) : point.x,
        y: snapEnabled ? snapToGrid(point.y) : point.y,
      });
      setBaseGraph(prev => ({
        ...prev,
        nodes: [
          ...prev.nodes,
          {
            id,
            label: String(id),
            x: position.x,
            y: position.y,
            visible: true,
          },
        ],
      }));
      setSelectedObject({ type: 'node', id });
      setSelectedNodeIds([String(id)]);
      setStatus(`Node ${id} added`);
    },
    [
      setBaseGraph,
      setSelectedNodeIds,
      setSelectedObject,
      setStatus,
      snapEnabled,
    ]
  );

  const addNode = useCallback(() => {
    addNodeAt({ x: VIEWBOX_WIDTH / 2, y: VIEWBOX_HEIGHT / 2 });
  }, [addNodeAt]);

  const addEdge = useCallback(
    (from, to) => {
      const id = `e${nextEdgeIdRef.current}`;
      nextEdgeIdRef.current += 1;
      setBaseGraph(prev => ({
        ...prev,
        edges: [
          ...prev.edges,
          {
            id,
            from,
            to,
            directed: false,
            label: '',
            color: '#64748b',
            duration: 450,
            visible: true,
          },
        ],
      }));
      setSelectedObject({ type: 'edge', id });
      setStatus(`Edge ${from} → ${to} added`);
    },
    [setBaseGraph, setSelectedObject, setStatus]
  );

  const deleteSelection = useCallback(() => {
    if (selectedNodeIds.length > 0) {
      const selectedSet = new Set(selectedNodeIds.map(String));
      const nextBaseGraph = {
        nodes: baseGraph.nodes.filter(
          node => !selectedSet.has(String(node.id))
        ),
        edges: baseGraph.edges.filter(
          edge =>
            !selectedSet.has(String(edge.from)) &&
            !selectedSet.has(String(edge.to))
        ),
      };
      const nextSteps = steps.map(step => {
        const nodeOverrides = { ...(step.nodeOverrides ?? {}) };
        const edgeOverrides = { ...(step.edgeOverrides ?? {}) };
        selectedSet.forEach(nodeId => {
          delete nodeOverrides[nodeId];
        });
        Object.keys(edgeOverrides).forEach(edgeId => {
          const stillExists = nextBaseGraph.edges.some(
            edge => String(edge.id) === String(edgeId)
          );
          if (!stillExists) delete edgeOverrides[edgeId];
        });
        return { ...step, nodeOverrides, edgeOverrides };
      });
      replaceTimeline(nextBaseGraph, nextSteps);
      setSelectedNodeIds([]);
      setSelectedObject(null);
      setStatus('Selection deleted');
      return;
    }
    if (selectedEdge) {
      const nextBaseGraph = {
        ...baseGraph,
        edges: baseGraph.edges.filter(
          edge => String(edge.id) !== String(selectedEdge.id)
        ),
      };
      const nextSteps = steps.map(step => {
        const edgeOverrides = { ...(step.edgeOverrides ?? {}) };
        delete edgeOverrides[String(selectedEdge.id)];
        return { ...step, edgeOverrides };
      });
      replaceTimeline(nextBaseGraph, nextSteps);
      setSelectedObject(null);
      setStatus(`Edge ${selectedEdge.id} deleted`);
    }
  }, [
    baseGraph,
    replaceTimeline,
    selectedEdge,
    selectedNodeIds,
    setSelectedNodeIds,
    setSelectedObject,
    setStatus,
    steps,
  ]);

  const applyLayout = useCallback(
    type => {
      let nextGraph = baseGraph;
      if (type === 'circle') nextGraph = circularLayout(baseGraph);
      if (type === 'tree')
        nextGraph = treeLayout(baseGraph, baseGraph.nodes[0]?.id);
      if (type === 'force') {
        const iterations = Math.round(100 * forceStrength);
        nextGraph = forceDirectedLayout(baseGraph, iterations);
      }
      setBaseGraph(nextGraph);
      setStatus(`Applied ${type} layout`);
    },
    [baseGraph, forceStrength, setBaseGraph, setStatus]
  );

  return {
    updateBaseNode,
    updateBaseNodesBulk,
    updateBaseEdge,
    setStepProperty,
    addNodeAt,
    addNode,
    addEdge,
    deleteSelection,
    applyLayout,
  };
};
