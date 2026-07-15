import {
  CAPTURE_MODE,
  createCaptureCanvas,
  EXPORT_CAPTURE_SVG_ELEMENT_ID,
  getGraphSvgElement,
  IMAGE_FRAMING,
  loadSvgImageFromElement,
} from './timelineFrameCapture.js';

const SLIDE_WIDTH = 13.333;
const SLIDE_HEIGHT = 7.5;
const IMAGE_MARGIN = 0.08;

const getDatedFilename = () => {
  const date = new Date().toISOString().slice(0, 10);
  return `graph-studio-slideshow-${date}.pptx`;
};

const getFittedImageRect = ({ imageWidth, imageHeight }) => {
  const availableWidth = SLIDE_WIDTH - IMAGE_MARGIN * 2;
  const availableHeight = SLIDE_HEIGHT - IMAGE_MARGIN * 2;
  const imageRatio = imageWidth / imageHeight;
  const availableRatio = availableWidth / availableHeight;

  if (imageRatio > availableRatio) {
    const width = availableWidth;
    const height = width / imageRatio;
    return {
      x: IMAGE_MARGIN,
      y: IMAGE_MARGIN + (availableHeight - height) / 2,
      w: width,
      h: height,
    };
  }

  const height = availableHeight;
  const width = height * imageRatio;
  return {
    x: IMAGE_MARGIN + (availableWidth - width) / 2,
    y: IMAGE_MARGIN,
    w: width,
    h: height,
  };
};

/**
 * Renders each timeline step as a raster image slide.
 * Captures an explicit resolved-frame surface without navigating the editor.
 */
export async function exportTimelineSlideshow({
  steps,
  frameIndexes,
  renderFrame,
  svgElementId = EXPORT_CAPTURE_SVG_ELEMENT_ID,
}) {
  if (!steps?.length) {
    throw new Error('No timeline frames to export');
  }
  const selectedFrameIndexes = Array.isArray(frameIndexes)
    ? frameIndexes.filter(
        index => Number.isInteger(index) && index >= 0 && index < steps.length
      )
    : steps.map((_, index) => index);
  if (!selectedFrameIndexes.length) {
    throw new Error('No timeline frames selected for export');
  }
  if (typeof renderFrame !== 'function') {
    throw new Error('Slideshow export renderer is unavailable');
  }

  const { default: PptxGenJS } = await import('pptxgenjs');
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.author = 'Graph Studio';
  pptx.subject = 'Graph animation slideshow export';
  pptx.title = 'Graph Studio Slideshow';
  pptx.company = 'Graph Studio';
  pptx.lang = 'en-US';
  pptx.theme = {
    headFontFace: 'Arial',
    bodyFontFace: 'Arial',
    lang: 'en-US',
  };

  const slideshowFramingMode = IMAGE_FRAMING.slide;
  let captureSurface = null;

  for (const i of selectedFrameIndexes) {
    const renderedSvg = await renderFrame(i);
    const svgEl = renderedSvg ?? getGraphSvgElement(svgElementId);
    if (!captureSurface) {
      captureSurface = createCaptureCanvas(svgEl, {
        framingMode: IMAGE_FRAMING.slide,
        captureMode: CAPTURE_MODE.slide,
      });
    }
    const { canvas, ctx, viewport } = captureSurface;

    const img = await loadSvgImageFromElement({
      svgEl,
      width: canvas.width,
      height: canvas.height,
      viewportWidth: viewport.width,
      viewportHeight: viewport.height,
      framingMode: slideshowFramingMode,
    });
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const slide = pptx.addSlide();
    slide.background = { color: 'FFFFFF' };
    slide.addImage({
      data: canvas.toDataURL('image/png'),
      altText: `Graph Studio Frame ${i + 1}: ${String(
        steps[i]?.description ?? ''
      )}`,
      ...getFittedImageRect({
        imageWidth: canvas.width,
        imageHeight: canvas.height,
      }),
    });
  }

  await pptx.writeFile({ fileName: getDatedFilename() });
}
