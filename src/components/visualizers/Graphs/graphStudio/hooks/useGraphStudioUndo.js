import { useCallback, useEffect, useRef, useState } from 'react';
import { hasOpenModal } from '../lib/keyboardTargets';
import {
  HISTORY_LIMIT,
  isTextEditingUndoTarget,
  snapshotTimelineState,
} from '../lib/undoUtils';

export const useGraphStudioUndo = ({
  baseGraph,
  steps,
  settings,
  currentFrame,
  replaceTimeline,
  restoreSettings,
  setStatus,
}) => {
  const undoHistoryRef = useRef([]);
  const redoHistoryRef = useRef([]);
  const historyMetaRef = useRef(null);
  const applyingHistoryRef = useRef(false);
  const [historyAvailability, setHistoryAvailability] = useState({
    canUndo: false,
    canRedo: false,
  });

  const syncHistoryAvailability = useCallback(() => {
    setHistoryAvailability({
      canUndo: undoHistoryRef.current.length > 0,
      canRedo: redoHistoryRef.current.length > 0,
    });
  }, []);

  const resetUndoHistory = useCallback(() => {
    undoHistoryRef.current = [];
    redoHistoryRef.current = [];
    historyMetaRef.current = null;
    applyingHistoryRef.current = false;
    syncHistoryAvailability();
  }, [syncHistoryAvailability]);

  useEffect(() => {
    const currentSnapshot = snapshotTimelineState({
      baseGraph,
      steps,
      settings,
    });
    const signature = JSON.stringify(currentSnapshot);
    const previous = historyMetaRef.current;
    if (!previous) {
      historyMetaRef.current = { signature, snapshot: currentSnapshot };
      return;
    }
    if (applyingHistoryRef.current) {
      applyingHistoryRef.current = false;
      historyMetaRef.current = { signature, snapshot: currentSnapshot };
      syncHistoryAvailability();
      return;
    }
    if (signature !== previous.signature) {
      undoHistoryRef.current.push(previous.snapshot);
      if (undoHistoryRef.current.length > HISTORY_LIMIT) {
        undoHistoryRef.current.shift();
      }
      redoHistoryRef.current = [];
      historyMetaRef.current = { signature, snapshot: currentSnapshot };
      syncHistoryAvailability();
    }
  }, [baseGraph, settings, steps, syncHistoryAvailability]);

  const undoLastAction = useCallback(() => {
    const previousSnapshot = undoHistoryRef.current.pop();
    if (!previousSnapshot) {
      setStatus('Nothing to undo');
      return;
    }
    if (historyMetaRef.current?.snapshot) {
      redoHistoryRef.current.push(historyMetaRef.current.snapshot);
    }
    applyingHistoryRef.current = true;
    syncHistoryAvailability();
    replaceTimeline(
      previousSnapshot.baseGraph,
      previousSnapshot.steps,
      currentFrame
    );
    restoreSettings?.(previousSnapshot.settings);
    setStatus('Undid last action');
  }, [
    currentFrame,
    replaceTimeline,
    restoreSettings,
    setStatus,
    syncHistoryAvailability,
  ]);

  const redoLastAction = useCallback(() => {
    const nextSnapshot = redoHistoryRef.current.pop();
    if (!nextSnapshot) {
      setStatus('Nothing to redo');
      return;
    }
    if (historyMetaRef.current?.snapshot) {
      undoHistoryRef.current.push(historyMetaRef.current.snapshot);
    }
    applyingHistoryRef.current = true;
    syncHistoryAvailability();
    replaceTimeline(nextSnapshot.baseGraph, nextSnapshot.steps, currentFrame);
    restoreSettings?.(nextSnapshot.settings);
    setStatus('Redid last action');
  }, [
    currentFrame,
    replaceTimeline,
    restoreSettings,
    setStatus,
    syncHistoryAvailability,
  ]);

  useEffect(() => {
    const onKeyDown = event => {
      const key = String(event.key).toLowerCase();
      const hasModifier = event.metaKey || event.ctrlKey;
      const isUndo = hasModifier && !event.shiftKey && key === 'z';
      const isRedo =
        hasModifier && ((event.shiftKey && key === 'z') || key === 'y');
      if (!isUndo && !isRedo) return;
      if (isTextEditingUndoTarget(event.target)) return;
      if (hasOpenModal()) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      event.preventDefault();
      if (isUndo) undoLastAction();
      else redoLastAction();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [redoLastAction, undoLastAction]);

  return {
    ...historyAvailability,
    undoLastAction,
    redoLastAction,
    resetUndoHistory,
  };
};
