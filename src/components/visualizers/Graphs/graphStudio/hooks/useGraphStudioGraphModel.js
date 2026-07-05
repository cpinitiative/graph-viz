import { useCallback, useEffect, useRef } from 'react';
import { VIEWBOX_HEIGHT, VIEWBOX_WIDTH } from '../constants';
import {
  circularLayout,
  clampNodePosition,
  forceDirectedLayout,
  snapToGrid,
  treeLayout,
} from '../graphStudioUtils';
import {
  applyFrameOverride,
  applyPropertyToAllFrames,
  applyTemporalVisibilityFromFrame,
  applyVisibilityFromFrame,
  applyVisibilityToStep,
  deleteObjectsFromProject,
  removeFrameOverrideProperties,
} from '../lib/temporalGraphState';

const LAYOUT_STATUS_LABELS = {
  circle: 'Circle',
  tree: 'Tree',
  force: 'Force',
};

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

  const setFrameOverride = useCallback(
    (objectType, objectId, patch) => {
      updateStep(currentFrame, step =>
        applyFrameOverride(step, objectType, objectId, patch)
      );
    },
    [currentFrame, updateStep]
  );

  const resetFrameOverride = useCallback(
    (objectType, objectId, keys) => {
      updateStep(currentFrame, step =>
        removeFrameOverrideProperties(step, objectType, objectId, keys)
      );
    },
    [currentFrame, updateStep]
  );

  const applyTemporalPropertyToAllFrames = useCallback(
    (objectType, objectId, patch) => {
      const next = applyPropertyToAllFrames({
        baseGraph,
        steps,
        objectType,
        objectId,
        patch,
      });
      replaceTimeline(next.baseGraph, next.steps, currentFrame);
    },
    [baseGraph, currentFrame, replaceTimeline, steps]
  );

  const setTemporalVisibility = useCallback(
    (objectType, objectId, visible) => {
      updateStep(currentFrame, step =>
        applyVisibilityToStep({
          baseGraph,
          step,
          objectType,
          objectId,
          visible,
        })
      );
    },
    [baseGraph, currentFrame, updateStep]
  );

  const setTemporalVisibilityFromFrame = useCallback(
    (objectType, objectId, visible) => {
      const nextSteps = applyVisibilityFromFrame({
        baseGraph,
        steps,
        objectType,
        objectId,
        frameIndex: currentFrame,
        visible,
      });
      replaceTimeline(baseGraph, nextSteps, currentFrame);
    },
    [baseGraph, currentFrame, replaceTimeline, steps]
  );

  const addNodeAt = useCallback(
    point => {
      const id = nextNodeIdRef.current;
      nextNodeIdRef.current += 1;
      const position = clampNodePosition({
        x: snapEnabled ? snapToGrid(point.x) : point.x,
        y: snapEnabled ? snapToGrid(point.y) : point.y,
      });
      const nextBaseGraph = {
        ...baseGraph,
        nodes: [
          ...baseGraph.nodes,
          {
            id,
            label: String(id),
            x: position.x,
            y: position.y,
            visible: true,
          },
        ],
      };
      const nextSteps = applyTemporalVisibilityFromFrame(
        steps,
        'node',
        id,
        currentFrame
      );
      replaceTimeline(nextBaseGraph, nextSteps, currentFrame);
      setSelectedObject({ type: 'node', id });
      setSelectedNodeIds([String(id)]);
      setStatus(`Node ${id} added from Frame ${currentFrame + 1} onward`);
    },
    [
      baseGraph,
      currentFrame,
      replaceTimeline,
      setSelectedNodeIds,
      setSelectedObject,
      setStatus,
      snapEnabled,
      steps,
    ]
  );

  const addNode = useCallback(() => {
    addNodeAt({ x: VIEWBOX_WIDTH / 2, y: VIEWBOX_HEIGHT / 2 });
  }, [addNodeAt]);

  const addEdge = useCallback(
    (from, to) => {
      const id = `e${nextEdgeIdRef.current}`;
      nextEdgeIdRef.current += 1;
      const nextBaseGraph = {
        ...baseGraph,
        edges: [
          ...baseGraph.edges,
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
      };
      const nextSteps = applyTemporalVisibilityFromFrame(
        steps,
        'edge',
        id,
        currentFrame
      );
      replaceTimeline(nextBaseGraph, nextSteps, currentFrame);
      setSelectedNodeIds([]);
      setSelectedObject({ type: 'edge', id });
      setStatus(
        `Edge ${from} → ${to} added from Frame ${currentFrame + 1} onward`
      );
      return id;
    },
    [
      baseGraph,
      currentFrame,
      replaceTimeline,
      setSelectedNodeIds,
      setSelectedObject,
      setStatus,
      steps,
    ]
  );

  const deleteSelection = useCallback(() => {
    if (selectedNodeIds.length > 0) {
      const next = deleteObjectsFromProject({
        baseGraph,
        steps,
        objectType: 'node',
        objectIds: selectedNodeIds,
      });
      replaceTimeline(next.baseGraph, next.steps, currentFrame);
      setSelectedNodeIds([]);
      setSelectedObject(null);
      setStatus(
        selectedNodeIds.length === 1
          ? `Node ${selectedNodeIds[0]} deleted from project`
          : `${selectedNodeIds.length} nodes deleted from project`
      );
      return;
    }
    if (selectedEdge) {
      const next = deleteObjectsFromProject({
        baseGraph,
        steps,
        objectType: 'edge',
        objectIds: selectedEdge.id,
      });
      replaceTimeline(next.baseGraph, next.steps, currentFrame);
      setSelectedObject(null);
      setStatus(`Edge ${selectedEdge.id} deleted from project`);
    }
  }, [
    baseGraph,
    currentFrame,
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
        const normalizedStrength = Math.max(
          0.2,
          Math.min(
            2,
            Number.isFinite(Number(forceStrength)) ? Number(forceStrength) : 1
          )
        );
        const iterations = Math.round(70 + 35 * normalizedStrength);
        nextGraph = forceDirectedLayout(
          baseGraph,
          iterations,
          normalizedStrength
        );
      }
      setBaseGraph(nextGraph);
      setStatus(`Applied ${LAYOUT_STATUS_LABELS[type] ?? type} layout`);
      return nextGraph;
    },
    [baseGraph, forceStrength, setBaseGraph, setStatus]
  );

  return {
    updateBaseNode,
    updateBaseNodesBulk,
    updateBaseEdge,
    setStepProperty,
    setFrameOverride,
    resetFrameOverride,
    applyTemporalPropertyToAllFrames,
    setTemporalVisibility,
    setTemporalVisibilityFromFrame,
    addNodeAt,
    addNode,
    addEdge,
    deleteSelection,
    applyLayout,
  };
};
