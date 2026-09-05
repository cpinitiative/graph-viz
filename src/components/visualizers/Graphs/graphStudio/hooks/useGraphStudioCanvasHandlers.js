import { useCallback, useEffect, useRef, useState } from 'react';
import { clamp, clampNodePosition, snapToGrid } from '../graphStudioUtils';
import { isNodeVisible } from '../lib/effectiveVisibility';
import { resolveNodeSelection } from '../lib/selectionState';

const MIN_NODE_POSITION = clampNodePosition({
  x: Number.NEGATIVE_INFINITY,
  y: Number.NEGATIVE_INFINITY,
});
const MAX_NODE_POSITION = clampNodePosition({
  x: Number.POSITIVE_INFINITY,
  y: Number.POSITIVE_INFINITY,
});

export const useGraphStudioCanvasHandlers = ({
  setMode,
  setStatus,
  baseGraph,
  computedGraph,
  addEdge,
  updateBaseNodesBulk,
  selectedObject,
  selectedNodeIds,
  selectedNodeIdSet,
  setSelectedObject,
  setSelectedNodeIds,
  clearSelection,
  beginHistoryTransaction,
  endHistoryTransaction,
}) => {
  const [drawFrom, setDrawFrom] = useState(null);
  const dragStateRef = useRef(null);

  useEffect(() => {
    if (drawFrom === null || drawFrom === undefined) return undefined;
    const sourceNode = (computedGraph?.nodes ?? []).find(
      node => String(node.id) === String(drawFrom)
    );
    if (isNodeVisible(sourceNode)) return undefined;
    const timeout = setTimeout(() => setDrawFrom(null), 0);
    return () => clearTimeout(timeout);
  }, [computedGraph, drawFrom]);

  const clearDrawState = useCallback(() => {
    setDrawFrom(null);
  }, []);

  const restoreDrawState = useCallback(nextDrawFrom => {
    setDrawFrom(nextDrawFrom ?? null);
  }, []);

  const onSelectNode = useCallback(
    (nodeId, additive = false) => {
      const nextSelection = resolveNodeSelection({
        selectedObject,
        selectedNodeIds,
        nodeId,
        additive,
      });
      setSelectedObject(nextSelection.selectedObject);
      setSelectedNodeIds(nextSelection.selectedNodeIds);
    },
    [selectedNodeIds, selectedObject, setSelectedNodeIds, setSelectedObject]
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
        setStatus(`Source node ${nodeId} selected`);
        return;
      }
      addEdge(drawFrom, nodeId);
      setDrawFrom(null);
    },
    [addEdge, clearSelection, drawFrom, setStatus]
  );

  const handleSetMode = useCallback(
    nextMode => {
      if (nextMode !== 'draw') setDrawFrom(null);
      else clearSelection();
      setMode(nextMode);
    },
    [clearSelection, setMode]
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
      setStatus(`Source node ${sourceId} selected`);
      return;
    }
    clearSelection();
    setDrawFrom(null);
    setMode('draw');
  }, [addEdge, clearSelection, selectedNodeIds, setMode, setStatus]);

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
      const positions = {};
      dragNodeIds.forEach(id => {
        const node = nodeMap.get(String(id));
        if (!node) return;
        offsets[id] = { dx: worldX - node.x, dy: worldY - node.y };
        positions[id] = { x: node.x, y: node.y };
      });
      dragStateRef.current = {
        anchorId: String(nodeId),
        nodeIds: dragNodeIds,
        offsets,
        positions,
      };
      beginHistoryTransaction?.();
    },
    [baseGraph.nodes, beginHistoryTransaction, selectedNodeIdSet]
  );

  const onNodeMove = useCallback(
    ({ worldX, worldY, snapEnabled: snap }) => {
      const drag = dragStateRef.current;
      if (!drag) return;
      const anchorOffset = drag.offsets[drag.anchorId];
      const anchorPosition = drag.positions[drag.anchorId];
      if (!anchorOffset || !anchorPosition) return;
      const rawAnchorX = worldX - anchorOffset.dx;
      const rawAnchorY = worldY - anchorOffset.dy;
      const targetAnchorX = snap ? snapToGrid(rawAnchorX) : rawAnchorX;
      const targetAnchorY = snap ? snapToGrid(rawAnchorY) : rawAnchorY;
      const requestedDeltaX = targetAnchorX - anchorPosition.x;
      const requestedDeltaY = targetAnchorY - anchorPosition.y;
      const positions = drag.nodeIds
        .map(id => drag.positions[id])
        .filter(Boolean);
      const deltaX = clamp(
        requestedDeltaX,
        Math.max(
          ...positions.map(position => MIN_NODE_POSITION.x - position.x)
        ),
        Math.min(...positions.map(position => MAX_NODE_POSITION.x - position.x))
      );
      const deltaY = clamp(
        requestedDeltaY,
        Math.max(
          ...positions.map(position => MIN_NODE_POSITION.y - position.y)
        ),
        Math.min(...positions.map(position => MAX_NODE_POSITION.y - position.y))
      );
      const patchById = {};
      drag.nodeIds.forEach(id => {
        const position = drag.positions[id];
        if (!position) return;
        patchById[id] = {
          x: position.x + deltaX,
          y: position.y + deltaY,
        };
      });
      updateBaseNodesBulk(patchById);
    },
    [updateBaseNodesBulk]
  );

  const onNodePointerUp = useCallback(() => {
    dragStateRef.current = null;
    endHistoryTransaction?.();
  }, [endHistoryTransaction]);

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
