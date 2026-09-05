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
  const historyMetaRef = useRef(null);
  const applyingUndoRef = useRef(false);
  const transactionRef = useRef(false);
  const [revision, setRevision] = useState(0);
  const beginTransaction = useCallback(() => {
    transactionRef.current = true;
  }, []);
  const endTransaction = useCallback(() => {
    if (!transactionRef.current) return;
    transactionRef.current = false;
    setRevision(value => value + 1);
  }, []);

  const resetUndoHistory = useCallback(() => {
    undoHistoryRef.current = [];
    historyMetaRef.current = null;
    applyingUndoRef.current = false;
    transactionRef.current = false;
  }, []);

  useEffect(() => {
    if (transactionRef.current) return;
    const currentSnapshot = snapshotTimelineState({
      baseGraph,
      steps,
      settings,
    });
    const signature = [baseGraph, steps, settings];
    const previous = historyMetaRef.current;
    if (!previous) {
      historyMetaRef.current = { signature, snapshot: currentSnapshot };
      return;
    }
    if (applyingUndoRef.current) {
      applyingUndoRef.current = false;
      historyMetaRef.current = { signature, snapshot: currentSnapshot };
      return;
    }
    if (signature.some((value, index) => value !== previous.signature[index])) {
      undoHistoryRef.current.push(previous.snapshot);
      if (undoHistoryRef.current.length > HISTORY_LIMIT) {
        undoHistoryRef.current.shift();
      }
      historyMetaRef.current = { signature, snapshot: currentSnapshot };
    }
  }, [baseGraph, settings, steps, revision]);

  useEffect(() => {
    const start = event => {
      if (event.target.matches?.('input[type=range]')) beginTransaction();
    };
    document.addEventListener('pointerdown', start, true);
    window.addEventListener('pointerup', endTransaction);
    window.addEventListener('pointercancel', endTransaction);
    window.addEventListener('blur', endTransaction);
    return () => {
      document.removeEventListener('pointerdown', start, true);
      window.removeEventListener('pointerup', endTransaction);
      window.removeEventListener('pointercancel', endTransaction);
      window.removeEventListener('blur', endTransaction);
    };
  }, [beginTransaction, endTransaction]);

  const undoLastAction = useCallback(() => {
    const previousSnapshot = undoHistoryRef.current.pop();
    if (!previousSnapshot) {
      setStatus('Nothing to undo');
      return;
    }
    applyingUndoRef.current = true;
    replaceTimeline(
      previousSnapshot.baseGraph,
      previousSnapshot.steps,
      currentFrame
    );
    restoreSettings?.(previousSnapshot.settings);
    setStatus('Undid last action');
  }, [currentFrame, replaceTimeline, restoreSettings, setStatus]);

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
      if (!isUndo) return;
      event.preventDefault();
      undoLastAction();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [undoLastAction]);

  return { undoLastAction, resetUndoHistory, beginTransaction, endTransaction };
};
