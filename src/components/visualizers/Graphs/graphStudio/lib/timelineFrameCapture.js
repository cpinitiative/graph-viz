export const DEFAULT_SVG_ELEMENT_ID = 'graph-studio-canvas-svg';
export const EXPORT_CAPTURE_SVG_ELEMENT_ID = 'graph-studio-export-capture-svg';
export const DEFAULT_PNG_SCALE = 2;
export const MAX_PNG_DIMENSION = 4096;
export const SLIDE_EXPORT_WIDTH = 1040;
export const SLIDE_EXPORT_HEIGHT = 585;
export const IMAGE_FRAMING = {
  viewport: 'viewport',
  fit: 'fit',
  slide: 'slide',
};
export const SLIDE_ASPECT_RATIO = SLIDE_EXPORT_WIDTH / SLIDE_EXPORT_HEIGHT;
export const CAPTURE_MODE = Object.freeze({
  static: 'static',
  slide: 'slide',
  video: 'video',
});

const FIT_CONTENT_MIN_PADDING = 36;
const FIT_CONTENT_MAX_PADDING = 56;
const FIT_CONTENT_PADDING_RATIO = 0.075;

const getDatedFrameFilename = extension => {
  const date = new Date().toISOString().slice(0, 10);
  return `graph-studio-frame-${date}.${extension}`;
};

export const downloadBlob = ({ blob, filename }) => {
  const downloadUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  try {
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
  } finally {
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 0);
  }
};

const waitForAnimationFrame = () =>
  new Promise(resolve => requestAnimationFrame(resolve));

const isExpectedExportSurface = ({ svgEl, frameIndex, captureToken }) => {
  const frameIsReady =
    frameIndex === undefined ||
    svgEl?.getAttribute('data-export-frame-index') === String(frameIndex);
  const tokenIsReady =
    captureToken === undefined ||
    svgEl?.getAttribute('data-export-capture-token') === String(captureToken);
  return Boolean(svgEl && frameIsReady && tokenIsReady);
};

export const waitForExportReady = async ({
  svgElementId,
  frameIndex,
  captureToken,
} = {}) => {
  if (document.fonts?.ready) await document.fonts.ready;

  for (let attempt = 0; attempt < 6; attempt += 1) {
    await waitForAnimationFrame();
    const svgEl = svgElementId ? document.getElementById(svgElementId) : null;
    if (!svgElementId) return null;
    if (isExpectedExportSurface({ svgEl, frameIndex, captureToken })) {
      await waitForAnimationFrame();
      const settledSvgEl = document.getElementById(svgElementId);
      if (
        isExpectedExportSurface({
          svgEl: settledSvgEl,
          frameIndex,
          captureToken,
        })
      ) {
        return settledSvgEl;
      }
    }
  }

  throw new Error(
    Number.isInteger(frameIndex)
      ? `Export frame ${frameIndex + 1} did not become ready`
      : 'Export canvas did not become ready'
  );
};

export const waitForFrameRender = waitForExportReady;

export const getGraphSvgElement = (svgElementId = DEFAULT_SVG_ELEMENT_ID) => {
  const svgEl = document.getElementById(svgElementId);
  if (!svgEl) throw new Error(`SVG "${svgElementId}" not found`);
  return svgEl;
};

const getViewportSize = svgEl => {
  const rect = svgEl.getBoundingClientRect();
  return {
    width: Math.max(2, rect.width),
    height: Math.max(2, rect.height),
  };
};

const getUntransformedBounds = element => {
  const box = element.getBBox();
  return {
    minX: box.x,
    minY: box.y,
    maxX: box.x + box.width,
    maxY: box.y + box.height,
  };
};

const getFitContentPadding = svgEl => {
  const viewport = getViewportSize(svgEl);
  return Math.round(
    Math.max(
      FIT_CONTENT_MIN_PADDING,
      Math.min(
        FIT_CONTENT_MAX_PADDING,
        Math.min(viewport.width, viewport.height) * FIT_CONTENT_PADDING_RATIO
      )
    )
  );
};

const expandViewportToAspectRatio = ({ width, height }, aspectRatio) => {
  let nextWidth = width;
  let nextHeight = height;
  const centerX = width / 2;
  const centerY = height / 2;

  if (nextWidth / nextHeight > aspectRatio) {
    nextHeight = nextWidth / aspectRatio;
  } else {
    nextWidth = nextHeight * aspectRatio;
  }

  return {
    x: centerX - nextWidth / 2,
    y: centerY - nextHeight / 2,
    width: nextWidth,
    height: nextHeight,
  };
};

export const getFitContentTransform = ({ bounds, viewport, padding }) => {
  const sourceWidth = Number(bounds?.maxX) - Number(bounds?.minX);
  const sourceHeight = Number(bounds?.maxY) - Number(bounds?.minY);
  const viewportX = Number(viewport?.x);
  const viewportY = Number(viewport?.y);
  const viewportWidth = Number(viewport?.width);
  const viewportHeight = Number(viewport?.height);
  const availableWidth = Math.max(1, viewportWidth - padding * 2);
  const availableHeight = Math.max(1, viewportHeight - padding * 2);
  if (
    ![
      sourceWidth,
      sourceHeight,
      viewportX,
      viewportY,
      viewportWidth,
      viewportHeight,
      availableWidth,
      availableHeight,
    ].every(Number.isFinite) ||
    sourceWidth <= 0 ||
    sourceHeight <= 0
  ) {
    return null;
  }
  const scale = Math.min(
    availableWidth / sourceWidth,
    availableHeight / sourceHeight
  );
  return {
    x:
      viewportX +
      (viewportWidth - sourceWidth * scale) / 2 -
      Number(bounds.minX) * scale,
    y:
      viewportY +
      (viewportHeight - sourceHeight * scale) / 2 -
      Number(bounds.minY) * scale,
    scale,
  };
};

const getGraphContentTransform = ({ svgEl, viewport }) => {
  const graphContent = svgEl.querySelector('[data-export-content="true"]');
  if (!graphContent) return null;
  try {
    return getFitContentTransform({
      bounds: getUntransformedBounds(graphContent),
      viewport,
      padding: getFitContentPadding(svgEl),
    });
  } catch {
    return null;
  }
};

const formatTransformNumber = value => Number(value.toFixed(4));

const formatViewBox = viewBox =>
  [viewBox.x, viewBox.y, viewBox.width, viewBox.height]
    .map(value => Number(value.toFixed(3)))
    .join(' ');

const EDITOR_ONLY_SELECTORS = [
  '[data-edge-hit-target-id]',
  '[data-node-selection-ring-id]',
  '[data-node-draw-source-ring-id]',
  '[data-edge-selection-underlay-id]',
  '[data-testid="graph-grid"]',
  '[id$="graphstudio-grid-minor"]',
  '[id$="graphstudio-grid-major"]',
];

const EDITOR_ONLY_ATTRIBUTES = [
  'data-testid',
  'data-frame-navigation-surface',
  'data-mode',
  'data-view-x',
  'data-view-y',
  'data-view-zoom',
  'data-export-mode',
  'data-export-capture-token',
  'data-snap-enabled',
  'class',
  'tabindex',
  'pointer-events',
];

const sanitizeExportSvg = exportSvg => {
  EDITOR_ONLY_SELECTORS.forEach(selector => {
    exportSvg.querySelectorAll(selector).forEach(element => element.remove());
  });

  [exportSvg, ...exportSvg.querySelectorAll('*')].forEach(element => {
    EDITOR_ONLY_ATTRIBUTES.forEach(attribute =>
      element.removeAttribute(attribute)
    );
    if (!element.hasAttribute('style')) return;
    [
      'cursor',
      'pointer-events',
      'touch-action',
      'user-select',
      '-webkit-user-select',
    ].forEach(property => element.style.removeProperty(property));
    if (!element.getAttribute('style')?.trim())
      element.removeAttribute('style');
  });

  return exportSvg;
};

export const normalizeCaptureDimensions = ({
  width,
  height,
  mode = CAPTURE_MODE.static,
}) => {
  const numericWidth = Number(width);
  const numericHeight = Number(height);
  const normalizedWidth = Math.max(
    2,
    Number.isFinite(numericWidth) ? Math.round(numericWidth) : 2
  );
  const normalizedHeight = Math.max(
    2,
    Number.isFinite(numericHeight) ? Math.round(numericHeight) : 2
  );
  if (mode !== CAPTURE_MODE.video) {
    return { width: normalizedWidth, height: normalizedHeight };
  }
  return {
    width: Math.max(2, Math.floor(normalizedWidth / 2) * 2),
    height: Math.max(2, Math.floor(normalizedHeight / 2) * 2),
  };
};

export const serializeSvgElement = ({
  svgEl,
  width,
  height,
  viewportWidth = width,
  viewportHeight = height,
  framingMode = IMAGE_FRAMING.viewport,
}) => {
  const exportSvg = sanitizeExportSvg(svgEl.cloneNode(true));
  const outputAspectRatio = width / height;
  const isFitFraming =
    framingMode === IMAGE_FRAMING.fit || framingMode === IMAGE_FRAMING.slide;
  const finalViewBox = expandViewportToAspectRatio(
    {
      width: viewportWidth,
      height: viewportHeight,
    },
    outputAspectRatio
  );
  if (isFitFraming) {
    const graphView = exportSvg.querySelector(
      '[data-graph-view-transform="true"]'
    );
    const fitTransform = getGraphContentTransform({
      svgEl,
      viewport: finalViewBox,
    });
    if (fitTransform) {
      graphView?.setAttribute(
        'transform',
        `translate(${formatTransformNumber(fitTransform.x)} ${formatTransformNumber(fitTransform.y)}) scale(${formatTransformNumber(fitTransform.scale)})`
      );
    } else {
      graphView?.setAttribute('transform', 'translate(0 0) scale(1)');
    }
  }

  exportSvg.setAttribute('width', width);
  exportSvg.setAttribute('height', height);
  exportSvg.setAttribute('version', '1.1');
  exportSvg.setAttribute('data-export-framing', framingMode);
  exportSvg.setAttribute(
    'data-export-aspect-ratio',
    Number(outputAspectRatio.toFixed(6))
  );
  exportSvg.setAttribute('viewBox', formatViewBox(finalViewBox));
  exportSvg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  const backgroundRect = Array.from(exportSvg.children).find(
    child => child.tagName?.toLowerCase() === 'rect'
  );
  if (backgroundRect) {
    backgroundRect.setAttribute('x', String(finalViewBox.x));
    backgroundRect.setAttribute('y', String(finalViewBox.y));
    backgroundRect.setAttribute('width', String(finalViewBox.width));
    backgroundRect.setAttribute('height', String(finalViewBox.height));
  }

  let svgData = new XMLSerializer().serializeToString(exportSvg);

  if (!svgData.includes('xmlns=')) {
    svgData = svgData.replace(
      '<svg',
      '<svg xmlns="http://www.w3.org/2000/svg"'
    );
  }
  if (!svgData.includes('xmlns:xlink=')) {
    svgData = svgData.replace(
      '<svg',
      '<svg xmlns:xlink="http://www.w3.org/1999/xlink"'
    );
  }

  return svgData.startsWith('<?xml')
    ? svgData
    : `<?xml version="1.0" encoding="UTF-8"?>\n${svgData}`;
};

export const serializeCurrentFrameSvg = ({
  svgElementId = DEFAULT_SVG_ELEMENT_ID,
  framingMode = IMAGE_FRAMING.viewport,
} = {}) => {
  const svgEl = getGraphSvgElement(svgElementId);
  const viewport = getViewportSize(svgEl);
  const outputSize =
    framingMode === IMAGE_FRAMING.slide
      ? {
          width: SLIDE_EXPORT_WIDTH,
          height: SLIDE_EXPORT_HEIGHT,
        }
      : {
          width: Math.round(viewport.width),
          height: Math.round(viewport.height),
        };
  return serializeSvgElement({
    svgEl,
    width: outputSize.width,
    height: outputSize.height,
    viewportWidth: viewport.width,
    viewportHeight: viewport.height,
    framingMode,
  });
};

export const loadSvgImage = async svgData => {
  const img = new Image();
  const svgBlob = new Blob([svgData], {
    type: 'image/svg+xml;charset=utf-8',
  });
  const url = URL.createObjectURL(svgBlob);
  try {
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = () =>
        reject(
          new Error('Failed to load SVG image. Check console for details.')
        );
      img.src = url;
    });
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
};

export const loadSvgImageFromElement = async ({
  svgEl,
  width,
  height,
  viewportWidth,
  viewportHeight,
  framingMode,
}) => {
  const svgData = serializeSvgElement({
    svgEl,
    width,
    height,
    viewportWidth,
    viewportHeight,
    framingMode,
  });
  return loadSvgImage(svgData);
};

export const createCaptureCanvas = (
  svgEl,
  {
    pngScale,
    framingMode = IMAGE_FRAMING.viewport,
    captureMode = CAPTURE_MODE.static,
  } = {}
) => {
  const viewport = getViewportSize(svgEl);
  const canvas = document.createElement('canvas');
  const baseSize =
    framingMode === IMAGE_FRAMING.slide
      ? {
          width: SLIDE_EXPORT_WIDTH,
          height: SLIDE_EXPORT_HEIGHT,
        }
      : viewport;
  let targetSize = baseSize;
  if (pngScale !== undefined) {
    const requestedScale = [1, 2, 3].includes(Number(pngScale))
      ? Number(pngScale)
      : DEFAULT_PNG_SCALE;
    const cappedScale = Math.min(
      requestedScale,
      MAX_PNG_DIMENSION / Math.max(baseSize.width, baseSize.height)
    );
    targetSize = {
      width: baseSize.width * cappedScale,
      height: baseSize.height * cappedScale,
    };
  }
  const normalizedSize = normalizeCaptureDimensions({
    ...targetSize,
    mode: captureMode,
  });
  canvas.width = normalizedSize.width;
  canvas.height = normalizedSize.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas rendering context unavailable');
  return { canvas, ctx, viewport };
};

export const exportCurrentFrameSvg = async ({
  svgElementId = DEFAULT_SVG_ELEMENT_ID,
  framingMode = IMAGE_FRAMING.viewport,
  frameIndex,
  captureToken,
} = {}) => {
  await waitForExportReady({ svgElementId, frameIndex, captureToken });
  const svgData = serializeCurrentFrameSvg({
    svgElementId,
    framingMode,
  });

  downloadBlob({
    blob: new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' }),
    filename: getDatedFrameFilename('svg'),
  });
};

export const exportCurrentFramePng = async ({
  svgElementId = DEFAULT_SVG_ELEMENT_ID,
  pngScale = DEFAULT_PNG_SCALE,
  framingMode = IMAGE_FRAMING.viewport,
  frameIndex,
  captureToken,
} = {}) => {
  await waitForExportReady({ svgElementId, frameIndex, captureToken });
  const svgEl = getGraphSvgElement(svgElementId);
  const { canvas, ctx, viewport } = createCaptureCanvas(svgEl, {
    pngScale,
    framingMode,
  });
  const svgData = serializeSvgElement({
    svgEl,
    width: canvas.width,
    height: canvas.height,
    viewportWidth: viewport.width,
    viewportHeight: viewport.height,
    framingMode,
  });
  const img = await loadSvgImage(svgData);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(nextBlob => {
      if (nextBlob) resolve(nextBlob);
      else reject(new Error('PNG encoding failed'));
    }, 'image/png');
  });

  downloadBlob({
    blob,
    filename: getDatedFrameFilename('png'),
  });
};
