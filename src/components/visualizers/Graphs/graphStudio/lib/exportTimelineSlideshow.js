import {
  createCaptureCanvas,
  DEFAULT_SVG_ELEMENT_ID,
  getGraphSvgElement,
  IMAGE_FRAMING,
  loadSvgImageFromElement,
  waitForFrameRender,
} from './timelineFrameCapture';

const SLIDE_WIDTH = 13.333;
const SLIDE_HEIGHT = 7.5;
const IMAGE_MARGIN = 0.08;

const getDatedFilename = () => {
  const date = new Date().toISOString().slice(0, 10);
  return `graph-viz-slideshow-${date}.pptx`;
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

const getSlideshowFramingMode = framingMode =>
  framingMode === IMAGE_FRAMING.viewport
    ? IMAGE_FRAMING.viewport
    : IMAGE_FRAMING.slide;

/**
 * Renders each timeline step as a raster image slide.
 * Depends on GraphCanvas exposing `id="graph-studio-canvas-svg"`.
 */
export async function exportTimelineSlideshow({
  steps,
  currentFrame,
  setCurrentFrame,
  frameIndexes,
  svgElementId = DEFAULT_SVG_ELEMENT_ID,
  framingMode = IMAGE_FRAMING.viewport,
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

  const { default: PptxGenJS } = await import('pptxgenjs');
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.author = 'Graph Viz';
  pptx.subject = 'Graph animation slideshow export';
  pptx.title = 'Graph Viz Slideshow';
  pptx.company = 'Graph Viz';
  pptx.lang = 'en-US';
  pptx.theme = {
    headFontFace: 'Arial',
    bodyFontFace: 'Arial',
    lang: 'en-US',
  };

  const svgEl = getGraphSvgElement(svgElementId);
  const slideshowFramingMode = getSlideshowFramingMode(framingMode);
  const { canvas, ctx, viewport } = createCaptureCanvas(svgEl, {
    framingMode: IMAGE_FRAMING.slide,
  });

  try {
    for (const i of selectedFrameIndexes) {
      setCurrentFrame(i);
      await waitForFrameRender();

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
        ...getFittedImageRect({
          imageWidth: canvas.width,
          imageHeight: canvas.height,
        }),
      });
    }
  } finally {
    setCurrentFrame(currentFrame);
    await waitForFrameRender();
  }

  await pptx.writeFile({ fileName: getDatedFilename() });
}
