import {
  DEFAULT_SVG_ELEMENT_ID,
  createCaptureCanvas,
  getGraphSvgElement,
  loadSvgImageFromElement,
  waitForFrameRender,
} from './timelineFrameCapture';

const SLIDE_WIDTH = 13.333;
const SLIDE_HEIGHT = 7.5;
const IMAGE_MARGIN = 0.08;
const CAPTION_HEIGHT = 0.34;
const CAPTION_Y = 7.08;

const getDatedFilename = () => {
  const date = new Date().toISOString().slice(0, 10);
  return `graph-viz-slideshow-${date}.pptx`;
};

const getFittedImageRect = ({ imageWidth, imageHeight, hasCaption }) => {
  const availableWidth = SLIDE_WIDTH - IMAGE_MARGIN * 2;
  const availableHeight =
    SLIDE_HEIGHT - IMAGE_MARGIN * 2 - (hasCaption ? CAPTION_HEIGHT : 0);
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

const addCaption = ({ slide, text }) => {
  slide.addText(text, {
    x: 0.32,
    y: CAPTION_Y - 0.02,
    w: SLIDE_WIDTH - 0.64,
    h: 0.3,
    fontFace: 'Arial',
    fontSize: 8,
    color: '4B5563',
    fill: { color: 'FFFFFF', transparency: 5 },
    line: { color: 'FFFFFF', transparency: 100 },
    margin: 0,
    breakLine: false,
    fit: 'shrink',
  });
};

/**
 * Renders each timeline step as a raster image slide.
 * Depends on GraphCanvas exposing `id="graph-studio-canvas-svg"`.
 */
export async function exportTimelineSlideshow({
  steps,
  currentFrame,
  setCurrentFrame,
  svgElementId = DEFAULT_SVG_ELEMENT_ID,
}) {
  if (!steps?.length) {
    throw new Error('No timeline frames to export');
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
  const { canvas, ctx } = createCaptureCanvas(svgEl);

  try {
    for (let i = 0; i < steps.length; i++) {
      setCurrentFrame(i);
      await waitForFrameRender();

      const img = await loadSvgImageFromElement({
        svgEl,
        width: canvas.width,
        height: canvas.height,
      });
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const caption = String(steps[i]?.description ?? '').trim();
      const slide = pptx.addSlide();
      slide.background = { color: 'FFFFFF' };
      slide.addImage({
        data: canvas.toDataURL('image/png'),
        ...getFittedImageRect({
          imageWidth: canvas.width,
          imageHeight: canvas.height,
          hasCaption: Boolean(caption),
        }),
      });
      if (caption) addCaption({ slide, text: caption });
    }
  } finally {
    setCurrentFrame(currentFrame);
    await waitForFrameRender();
  }

  await pptx.writeFile({ fileName: getDatedFilename() });
}
