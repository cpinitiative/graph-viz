export const DEFAULT_SVG_ELEMENT_ID = 'graph-studio-canvas-svg';
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

const FIT_CONTENT_MIN_PADDING = 36;
const FIT_CONTENT_MAX_PADDING = 56;
const FIT_CONTENT_PADDING_RATIO = 0.075;

const getDatedFrameFilename = extension => {
  const date = new Date().toISOString().slice(0, 10);
  return `graph-viz-frame-${date}.${extension}`;
};

export const downloadBlob = ({ blob, filename }) => {
  const downloadUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 0);
};

export const waitForFrameRender = async () => {
  await new Promise(resolve => requestAnimationFrame(resolve));
  await new Promise(resolve => requestAnimationFrame(resolve));
  await new Promise(resolve => setTimeout(resolve, 80));
};

export const getGraphSvgElement = (svgElementId = DEFAULT_SVG_ELEMENT_ID) => {
  const svgEl =
    document.getElementById(svgElementId) || document.querySelector('svg');
  if (!svgEl) throw new Error('SVG not found');
  return svgEl;
};

const getViewportSize = svgEl => {
  const rect = svgEl.getBoundingClientRect();
  return {
    width: Math.max(2, rect.width),
    height: Math.max(2, rect.height),
  };
};

const transformBounds = (element, matrix) => {
  const box = element.getBBox();
  const points = [
    new DOMPoint(box.x, box.y),
    new DOMPoint(box.x + box.width, box.y),
    new DOMPoint(box.x, box.y + box.height),
    new DOMPoint(box.x + box.width, box.y + box.height),
  ].map(point => point.matrixTransform(matrix));
  const xs = points.map(point => point.x);
  const ys = points.map(point => point.y);
  return {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xs),
    maxY: Math.max(...ys),
  };
};

const combineBounds = boundsList => ({
  minX: Math.min(...boundsList.map(bounds => bounds.minX)),
  minY: Math.min(...boundsList.map(bounds => bounds.minY)),
  maxX: Math.max(...boundsList.map(bounds => bounds.maxX)),
  maxY: Math.max(...boundsList.map(bounds => bounds.maxY)),
});

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

const expandBoundsToAspectRatio = (bounds, aspectRatio, padding) => {
  let width = bounds.maxX - bounds.minX + padding * 2;
  let height = bounds.maxY - bounds.minY + padding * 2;
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;

  if (width / height > aspectRatio) height = width / aspectRatio;
  else width = height * aspectRatio;

  return {
    x: centerX - width / 2,
    y: centerY - height / 2,
    width,
    height,
  };
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

export const getFitContentViewBox = ({ svgEl, aspectRatio }) => {
  const exportElements = [
    svgEl.querySelector('[data-export-content="true"]'),
    svgEl.querySelector('[data-testid="custom-export-legend"]'),
    svgEl.querySelector('[data-testid="frame-caption-overlay"]'),
  ].filter(Boolean);

  const boundsList = exportElements.flatMap(element => {
    try {
      const matrix = element.getCTM();
      if (!matrix) return [];
      const bounds = transformBounds(element, matrix);
      const values = Object.values(bounds);
      return values.every(Number.isFinite) ? [bounds] : [];
    } catch {
      return [];
    }
  });

  if (!boundsList.length) return null;
  return expandBoundsToAspectRatio(
    combineBounds(boundsList),
    aspectRatio,
    getFitContentPadding(svgEl)
  );
};

const formatViewBox = viewBox =>
  [viewBox.x, viewBox.y, viewBox.width, viewBox.height]
    .map(value => Number(value.toFixed(3)))
    .join(' ');

export const serializeSvgElement = ({
  svgEl,
  width,
  height,
  viewportWidth = width,
  viewportHeight = height,
  framingMode = IMAGE_FRAMING.viewport,
}) => {
  const exportSvg = svgEl.cloneNode(true);
  const outputAspectRatio = width / height;
  const isFitFraming =
    framingMode === IMAGE_FRAMING.fit || framingMode === IMAGE_FRAMING.slide;
  const fitViewBox = isFitFraming
    ? getFitContentViewBox({
        svgEl,
        aspectRatio: outputAspectRatio,
      })
    : null;
  const finalViewBox =
    fitViewBox ??
    expandViewportToAspectRatio(
      {
        width: viewportWidth,
        height: viewportHeight,
      },
      outputAspectRatio
    );

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
  { pngScale, framingMode = IMAGE_FRAMING.viewport } = {}
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
  if (pngScale === undefined) {
    canvas.width = Math.max(2, Math.floor(baseSize.width / 2) * 2);
    canvas.height = Math.max(2, Math.floor(baseSize.height / 2) * 2);
  } else {
    const requestedScale = [1, 2, 3].includes(Number(pngScale))
      ? Number(pngScale)
      : DEFAULT_PNG_SCALE;
    const cappedScale = Math.min(
      requestedScale,
      MAX_PNG_DIMENSION / Math.max(baseSize.width, baseSize.height)
    );
    canvas.width = Math.max(2, Math.round(baseSize.width * cappedScale));
    canvas.height = Math.max(2, Math.round(baseSize.height * cappedScale));
  }
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas rendering context unavailable');
  return { canvas, ctx, viewport };
};

export const exportCurrentFrameSvg = async ({
  svgElementId = DEFAULT_SVG_ELEMENT_ID,
  framingMode = IMAGE_FRAMING.viewport,
} = {}) => {
  await waitForFrameRender();
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
} = {}) => {
  await waitForFrameRender();
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
