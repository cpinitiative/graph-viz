export const DEFAULT_SVG_ELEMENT_ID = 'graph-studio-canvas-svg';

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

  svgEl.setAttribute('width', width);
  svgEl.setAttribute('height', height);

  let svgData = new XMLSerializer().serializeToString(svgEl);

  if (origWidth === null) svgEl.removeAttribute('width');
  else svgEl.setAttribute('width', origWidth);

  if (origHeight === null) svgEl.removeAttribute('height');
  else svgEl.setAttribute('height', origHeight);

  if (!svgData.includes('xmlns=')) {
    svgData = svgData.replace(
      '<svg',
      '<svg xmlns="http://www.w3.org/2000/svg"'
    );
  }

  return svgData;
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
