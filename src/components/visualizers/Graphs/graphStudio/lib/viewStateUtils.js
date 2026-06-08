import { VIEWBOX_HEIGHT, VIEWBOX_WIDTH } from '../constants';
import { getSelectionBounds } from '../graphStudioUtils';

export const computeMinGridZoomForViewport = (viewportWidth, viewportHeight) =>
  Math.max(
    0.1,
    Math.min(viewportWidth / VIEWBOX_WIDTH, viewportHeight / VIEWBOX_HEIGHT)
  );

export const createCenteredViewState = (
  nodes = [],
  zoom = 1,
  viewportWidth = 1280,
  viewportHeight = 760
) => {
  const bounds = getSelectionBounds(nodes);
  if (!bounds) {
    return {
      zoom,
      x: (viewportWidth - VIEWBOX_WIDTH * zoom) / 2,
      y: (viewportHeight - VIEWBOX_HEIGHT * zoom) / 2,
    };
  }
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;
  return {
    zoom,
    x: viewportWidth / 2 - centerX * zoom,
    y: viewportHeight / 2 - centerY * zoom,
  };
};

export const createInitialViewState = (
  nodes = [],
  viewportWidth = 1280,
  viewportHeight = 760
) => {
  const bounds = getSelectionBounds(nodes);
  if (!bounds) {
    const minGridZoom = computeMinGridZoomForViewport(
      viewportWidth,
      viewportHeight
    );
    return createCenteredViewState(
      [],
      minGridZoom,
      viewportWidth,
      viewportHeight
    );
  }
  const padding = 42;
  const fitWidth = bounds.width + padding * 2;
  const fitHeight = bounds.height + padding * 2;
  const fitZoomX = viewportWidth / Math.max(1, fitWidth);
  const fitZoomY = viewportHeight / Math.max(1, fitHeight);
  const fitZoom = Math.min(fitZoomX, fitZoomY, 1);
  const minGridZoom = computeMinGridZoomForViewport(
    viewportWidth,
    viewportHeight
  );
  const zoom = Math.max(minGridZoom, fitZoom);
  return createCenteredViewState(nodes, zoom, viewportWidth, viewportHeight);
};
