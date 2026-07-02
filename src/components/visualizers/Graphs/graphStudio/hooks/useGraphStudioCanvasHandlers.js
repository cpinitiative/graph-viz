import { useCallback, useRef, useState } from 'react';
import { clampNodePosition, snapToGrid } from '../graphStudioUtils';

export const useGraphStudioCanvasHandlers = ({
  setMode,
  setStatus,
  baseGraph,
  addEdge,
  updateBaseNodesBulk,
  selectedNodeIds,
  selectedNodeIdSet,
  setSelectedObject,
  setSelectedNodeIds,
  clearSelection,
  currentFrame = 0,
}) => {
  const [drawFrom, setDrawFrom] = useState(null);
  const dragStateRef = useRef(null);
  const frameNumber = currentFrame + 1;
  const addNodeHelpText = `Click canvas to add a node from Frame ${frameNumber} onward.`;
  const drawEdgeHelpText = `Connect nodes to add an edge from Frame ${frameNumber} onward.`;

  const clearDrawState = useCallback(() => {
    setDrawFrom(null);
  }, []);

  const restoreDrawState = useCallback(nextDrawFrom => {
    setDrawFrom(nextDrawFrom ?? null);
  }, []);

  const onSelectNode = useCallback(
    (nodeId, additive = false) => {
      const idText = String(nodeId);
      setSelectedObject({ type: 'node', id: nodeId });
      if (additive) {
        setSelectedNodeIds(prev => {
          const set = new Set(prev.map(String));
          if (set.has(idText)) set.delete(idText);
          else set.add(idText);
          return Array.from(set);
        });
        return;
      }
      setSelectedNodeIds([idText]);
    },
    [setSelectedNodeIds, setSelectedObject]
  );

  const onSelectEdge = useCallback(
    edgeId => {
      setSelectedObject({ type: 'edge', id: edgeId });
      setSelectedNodeIds([]);
    },
    [setSelectedNodeIds, setSelectedObject]
  );

  const onSelectNodes = useCallback(
    nodeIds => {
      setSelectedNodeIds(nodeIds);
      if (nodeIds.length === 1) {
        setSelectedObject({ type: 'node', id: nodeIds[0] });
      } else {
        setSelectedObject(null);
      }
    },
    [setSelectedNodeIds, setSelectedObject]
  );

  const onBackgroundClear = useCallback(() => {
    clearSelection();
    setDrawFrom(null);
  }, [clearSelection]);

  const onNodeClickForDraw = useCallback(
    nodeId => {
      if (drawFrom === null || drawFrom === undefined) {
        clearSelection();
        setDrawFrom(nodeId);
        setStatus(`Source node ${nodeId} selected. ${drawEdgeHelpText}`);
        return;
      }
      addEdge(drawFrom, nodeId);
      setDrawFrom(null);
    },
    [addEdge, clearSelection, drawEdgeHelpText, drawFrom, setStatus]
  );

  const handleSetMode = useCallback(
    nextMode => {
      if (nextMode !== 'draw') setDrawFrom(null);
      else {
        clearSelection();
        if (drawFrom === null || drawFrom === undefined) {
          setStatus(drawEdgeHelpText);
        }
      }
      if (nextMode === 'add') {
        setStatus(addNodeHelpText);
      }
      setMode(nextMode);
    },
    [
      addNodeHelpText,
      clearSelection,
      drawEdgeHelpText,
      drawFrom,
      setMode,
      setStatus,
    ]
  );

  const startDrawEdge = useCallback(() => {
    if (selectedNodeIds.length === 2) {
      const [from, to] = selectedNodeIds;
      addEdge(from, to);
      setDrawFrom(null);
      setMode('select');
      return;
    }
    if (selectedNodeIds.length === 1) {
      const sourceId = selectedNodeIds[0];
      clearSelection();
      setDrawFrom(sourceId);
      setMode('draw');
      setStatus(`Source node ${sourceId} selected. ${drawEdgeHelpText}`);
      return;
    }
    clearSelection();
    setDrawFrom(null);
    setMode('draw');
    setStatus(drawEdgeHelpText);
  }, [
    addEdge,
    clearSelection,
    drawEdgeHelpText,
    selectedNodeIds,
    setMode,
    setStatus,
  ]);

  const onNodePointerDown = useCallback(
    ({ nodeId, worldX, worldY }) => {
      const shouldDragGroup =
        selectedNodeIdSet.has(String(nodeId)) && selectedNodeIdSet.size > 1;
      const dragNodeIds = shouldDragGroup
        ? Array.from(selectedNodeIdSet)
        : [String(nodeId)];
      const nodeMap = new Map(
        baseGraph.nodes.map(node => [String(node.id), node])
      );
      const anchor = nodeMap.get(String(nodeId));
      if (!anchor) return;
      const offsets = {};
      dragNodeIds.forEach(id => {
        const node = nodeMap.get(String(id));
        if (!node) return;
        offsets[id] = { dx: worldX - node.x, dy: worldY - node.y };
      });
      dragStateRef.current = {
        anchorId: String(nodeId),
        nodeIds: dragNodeIds,
        offsets,
      };
    },
    [baseGraph.nodes, selectedNodeIdSet]
  );

  const onNodeMove = useCallback(
    ({ worldX, worldY, snapEnabled: snap }) => {
      const drag = dragStateRef.current;
      if (!drag) return;
      const patchById = {};
      drag.nodeIds.forEach(id => {
        const offset = drag.offsets[id];
        if (!offset) return;
        const rawX = worldX - offset.dx;
        const rawY = worldY - offset.dy;
        const snappedX = snap ? snapToGrid(rawX) : rawX;
        const snappedY = snap ? snapToGrid(rawY) : rawY;
        patchById[id] = clampNodePosition({ x: snappedX, y: snappedY });
      });
      updateBaseNodesBulk(patchById);
    },
    [updateBaseNodesBulk]
  );

  const onNodePointerUp = useCallback(() => {
    dragStateRef.current = null;
  }, []);

  return {
    drawFrom,
    clearDrawState,
    restoreDrawState,
    handleSetMode,
    startDrawEdge,
    onSelectNode,
    onSelectEdge,
    onSelectNodes,
    onBackgroundClear,
    onNodeClickForDraw,
    onNodePointerDown,
    onNodeMove,
    onNodePointerUp,
  };
};
