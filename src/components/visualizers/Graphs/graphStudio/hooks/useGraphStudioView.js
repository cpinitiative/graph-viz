import { useCallback, useState } from "react";
import { clamp } from "../graphStudioUtils";
import { createInitialViewState } from "../lib/viewStateUtils";

const VIEWPORT_CENTER_X = 640;
const VIEWPORT_CENTER_Y = 380;

export const useGraphStudioView = ({ initialNodes = [] }) => {
  const [viewState, setViewState] = useState(() =>
    createInitialViewState(initialNodes),
  );
  const [viewResetCounter, setViewResetCounter] = useState(0);
  const [lockCanvas, setLockCanvas] = useState(true);

  const setViewFromNodes = useCallback((nodes) => {
    setViewState(createInitialViewState(nodes));
  }, []);

  const bumpViewReset = useCallback(() => {
    setViewResetCounter((count) => count + 1);
  }, []);

  const centerViewOnContent = useCallback(() => {
    if (lockCanvas) return;
    setViewResetCounter((count) => count + 1);
  }, [lockCanvas]);

  const adjustZoom = useCallback(
    (direction) => {
      if (lockCanvas) return;
      const delta = direction > 0 ? 0.12 : -0.12;
      setViewState((prev) => {
        const nextZoom = clamp(prev.zoom + delta, 0.05, 2.6);
        const worldCenterX = (VIEWPORT_CENTER_X - prev.x) / prev.zoom;
        const worldCenterY = (VIEWPORT_CENTER_Y - prev.y) / prev.zoom;
        return {
          ...prev,
          zoom: nextZoom,
          x: VIEWPORT_CENTER_X - worldCenterX * nextZoom,
          y: VIEWPORT_CENTER_Y - worldCenterY * nextZoom,
        };
      });
    },
    [lockCanvas],
  );

  const zoomIn = useCallback(() => adjustZoom(1), [adjustZoom]);
  const zoomOut = useCallback(() => adjustZoom(-1), [adjustZoom]);

  return {
    viewState,
    setViewState,
    viewResetCounter,
    lockCanvas,
    setLockCanvas,
    setViewFromNodes,
    bumpViewReset,
    centerViewOnContent,
    zoomIn,
    zoomOut,
    zoomPercent: Math.round(viewState.zoom * 100),
  };
};
