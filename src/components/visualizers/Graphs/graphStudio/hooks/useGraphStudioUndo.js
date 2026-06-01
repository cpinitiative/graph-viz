import { useCallback, useEffect, useRef } from "react";
import {
  HISTORY_LIMIT,
  snapshotTimelineState,
} from "../lib/undoUtils";

export const useGraphStudioUndo = ({
  baseGraph,
  steps,
  currentFrame,
  replaceTimeline,
  setCurrentFrame,
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
      currentFrame,
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
  }, [baseGraph, steps, currentFrame]);

  const undoLastAction = useCallback(() => {
    const previousSnapshot = undoHistoryRef.current.pop();
    if (!previousSnapshot) {
      setStatus("Nothing to undo");
      return;
    }
    applyingUndoRef.current = true;
    replaceTimeline(previousSnapshot.baseGraph, previousSnapshot.steps);
    setCurrentFrame(previousSnapshot.currentFrame);
    setStatus("Undid last action");
  }, [replaceTimeline, setCurrentFrame, setStatus]);

  useEffect(() => {
    const onKeyDown = (event) => {
      const isUndo =
        (event.metaKey || event.ctrlKey) &&
        !event.shiftKey &&
        String(event.key).toLowerCase() === "z";
      if (!isUndo) return;
      const target = event.target;
      const tagName = String(target?.tagName ?? "").toLowerCase();
      if (
        tagName === "input" ||
        tagName === "textarea" ||
        tagName === "select" ||
        target?.isContentEditable
      ) {
        return;
      }
      event.preventDefault();
      undoLastAction();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [undoLastAction]);

  return { undoLastAction, resetUndoHistory };
};
