import { useCallback, useEffect, useRef } from 'react';
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

  const resetUndoHistory = useCallback(() => {
    undoHistoryRef.current = [];
    historyMetaRef.current = null;
    applyingUndoRef.current = false;
  }, []);

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
    if (applyingUndoRef.current) {
      applyingUndoRef.current = false;
      historyMetaRef.current = { signature, snapshot: currentSnapshot };
      return;
    }
    if (signature !== previous.signature) {
      undoHistoryRef.current.push(previous.snapshot);
      if (undoHistoryRef.current.length > HISTORY_LIMIT) {
        undoHistoryRef.current.shift();
      }
      historyMetaRef.current = { signature, snapshot: currentSnapshot };
    }
  }, [baseGraph, settings, steps]);

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
      const isUndo =
        (event.metaKey || event.ctrlKey) &&
        !event.shiftKey &&
        String(event.key).toLowerCase() === 'z';
      if (!isUndo) return;
      if (isTextEditingUndoTarget(event.target)) return;
      event.preventDefault();
      undoLastAction();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [undoLastAction]);

  return { undoLastAction, resetUndoHistory };
};
