export const DEFAULT_SVG_ELEMENT_ID = 'graph-studio-canvas-svg';

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

export const serializeSvgElement = ({ svgEl, width, height }) => {
  const origWidth = svgEl.getAttribute('width');
  const origHeight = svgEl.getAttribute('height');
  const origVersion = svgEl.getAttribute('version');

  svgEl.setAttribute('width', width);
  svgEl.setAttribute('height', height);
  svgEl.setAttribute('version', '1.1');

  let svgData = new XMLSerializer().serializeToString(svgEl);

  if (origWidth === null) svgEl.removeAttribute('width');
  else svgEl.setAttribute('width', origWidth);

  if (origHeight === null) svgEl.removeAttribute('height');
  else svgEl.setAttribute('height', origHeight);

  if (origVersion === null) svgEl.removeAttribute('version');
  else svgEl.setAttribute('version', origVersion);

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

export const loadSvgImageFromElement = async ({ svgEl, width, height }) => {
  const svgData = serializeSvgElement({ svgEl, width, height });
  return loadSvgImage(svgData);
};

export const createCaptureCanvas = svgEl => {
  const rect = svgEl.getBoundingClientRect();
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(2, Math.floor(rect.width / 2) * 2);
  canvas.height = Math.max(2, Math.floor(rect.height / 2) * 2);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas rendering context unavailable');
  return { canvas, ctx };
};

export const exportCurrentFrameSvg = async ({
  svgElementId = DEFAULT_SVG_ELEMENT_ID,
} = {}) => {
  await waitForFrameRender();
  const svgEl = getGraphSvgElement(svgElementId);
  const { canvas } = createCaptureCanvas(svgEl);
  const svgData = serializeSvgElement({
    svgEl,
    width: canvas.width,
    height: canvas.height,
  });

  downloadBlob({
    blob: new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' }),
    filename: getDatedFrameFilename('svg'),
  });
};

export const exportCurrentFramePng = async ({
  svgElementId = DEFAULT_SVG_ELEMENT_ID,
} = {}) => {
  await waitForFrameRender();
  const svgEl = getGraphSvgElement(svgElementId);
  const { canvas, ctx } = createCaptureCanvas(svgEl);
  const svgData = serializeSvgElement({
    svgEl,
    width: canvas.width,
    height: canvas.height,
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
