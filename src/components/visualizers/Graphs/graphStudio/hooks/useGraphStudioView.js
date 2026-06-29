import { useCallback, useRef, useState } from 'react';
import { clamp } from '../graphStudioUtils';
import { createInitialViewState } from '../lib/viewStateUtils';

const DEFAULT_VIEWPORT_WIDTH = 1280;
const DEFAULT_VIEWPORT_HEIGHT = 760;

export const useGraphStudioView = ({ initialNodes = [] }) => {
  const [viewState, setViewState] = useState(() =>
    createInitialViewState(initialNodes)
  );
  const [viewResetCounter, setViewResetCounter] = useState(0);
  const [lockCanvas, setLockCanvas] = useState(false);
  const viewportSizeRef = useRef({
    width: DEFAULT_VIEWPORT_WIDTH,
    height: DEFAULT_VIEWPORT_HEIGHT,
  });

  const setViewFromNodes = useCallback(nodes => {
    const { width, height } = viewportSizeRef.current;
    setViewState(createInitialViewState(nodes, width, height));
  }, []);

  const setZoomViewportSize = useCallback(size => {
    const width = Number(size?.width);
    const height = Number(size?.height);
    if (width > 0 && height > 0) {
      viewportSizeRef.current = { width, height };
    }
  }, []);

  const bumpViewReset = useCallback(() => {
    setViewResetCounter(count => count + 1);
  }, []);

  const centerViewOnContent = useCallback(() => {
    if (lockCanvas) return;
    setViewResetCounter(count => count + 1);
  }, [lockCanvas]);

  const adjustZoom = useCallback(
    direction => {
      if (lockCanvas) return;
      const delta = direction > 0 ? 0.12 : -0.12;
      setViewState(prev => {
        const nextZoom = clamp(prev.zoom + delta, 0.05, 2.6);
        const { width, height } = viewportSizeRef.current;
        const centerX = width / 2;
        const centerY = height / 2;
        const worldCenterX = (centerX - prev.x) / prev.zoom;
        const worldCenterY = (centerY - prev.y) / prev.zoom;
        return {
          ...prev,
          zoom: nextZoom,
          x: centerX - worldCenterX * nextZoom,
          y: centerY - worldCenterY * nextZoom,
        };
      });
    },
    [lockCanvas]
  );

  const zoomIn = useCallback(() => adjustZoom(1), [adjustZoom]);
  const zoomOut = useCallback(() => adjustZoom(-1), [adjustZoom]);
  const setZoomPercent = useCallback(
    percent => {
      if (lockCanvas) return;
      const nextZoom = clamp(Number(percent) / 100, 0.05, 2.6);
      if (!Number.isFinite(nextZoom)) return;
      setViewState(prev => {
        const { width, height } = viewportSizeRef.current;
        const centerX = width / 2;
        const centerY = height / 2;
        const worldCenterX = (centerX - prev.x) / prev.zoom;
        const worldCenterY = (centerY - prev.y) / prev.zoom;
        return {
          ...prev,
          zoom: nextZoom,
          x: centerX - worldCenterX * nextZoom,
          y: centerY - worldCenterY * nextZoom,
        };
      });
    },
    [lockCanvas]
  );

  return {
    viewState,
    setViewState,
    viewResetCounter,
    lockCanvas,
    setLockCanvas,
    setViewFromNodes,
    setZoomViewportSize,
    bumpViewReset,
    centerViewOnContent,
    zoomIn,
    zoomOut,
    setZoomPercent,
    zoomPercent: Math.round(viewState.zoom * 100),
  };
};
