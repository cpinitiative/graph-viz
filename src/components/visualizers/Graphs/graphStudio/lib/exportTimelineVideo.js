import * as Mp4Muxer from 'mp4-muxer';
import {
  DEFAULT_SVG_ELEMENT_ID,
  createCaptureCanvas,
  getGraphSvgElement,
  loadSvgImageFromElement,
  waitForFrameRender,
} from './timelineFrameCapture';

const AVC_CODEC = 'avc1.42E01F';

const withDefaultColorSpace = meta => {
  if (!meta?.decoderConfig) return meta;
  return {
    ...meta,
    decoderConfig: {
      ...meta.decoderConfig,
      colorSpace: meta.decoderConfig.colorSpace ?? {
        primaries: 'bt709',
        transfer: 'bt709',
        matrix: 'bt709',
        fullRange: false,
      },
    },
  };
};

/**
 * Renders timeline steps to an MP4 download.
 * Depends on GraphCanvas exposing `id="graph-studio-canvas-svg"`.
 */
export async function exportTimelineVideo({
  steps,
  setCurrentFrame,
  frameIndexes,
  svgElementId = DEFAULT_SVG_ELEMENT_ID,
}) {
  if (typeof VideoEncoder === 'undefined') {
    throw new Error('VideoEncoder API is not supported in this browser.');
  }
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

  const svgEl = getGraphSvgElement(svgElementId);
  const { canvas, ctx } = createCaptureCanvas(svgEl);

  const muxer = new Mp4Muxer.Muxer({
    target: new Mp4Muxer.ArrayBufferTarget(),
    video: { codec: 'avc', width: canvas.width, height: canvas.height },
    fastStart: 'in-memory',
  });
  let receivedDecoderConfig = false;
  const videoEncoder = new VideoEncoder({
    output: (chunk, meta) => {
      const normalizedMeta = withDefaultColorSpace(meta);
      if (normalizedMeta?.decoderConfig) receivedDecoderConfig = true;
      muxer.addVideoChunk(chunk, normalizedMeta);
    },
    error: e => console.error(e),
  });
  videoEncoder.configure({
    codec: AVC_CODEC,
    width: canvas.width,
    height: canvas.height,
    avc: { format: 'avc' },
    bitrate: 5_000_000,
    framerate: 30,
  });

  const fps = 30;
  let frameIndex = 0;

  for (const i of selectedFrameIndexes) {
    setCurrentFrame(i);
    await waitForFrameRender();

    const img = await loadSvgImageFromElement({
      svgEl,
      width: canvas.width,
      height: canvas.height,
    });

    const stepDurationMs = steps[i].durationMs || 600;
    const framesForStep = Math.round((stepDurationMs / 1000) * fps);
    for (let f = 0; f < framesForStep; f++) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      const frame = new VideoFrame(canvas, {
        timestamp: (frameIndex * 1000000) / fps,
      });
      videoEncoder.encode(frame, { keyFrame: frameIndex % 30 === 0 });
      frame.close();
      frameIndex++;
    }
  }

  await videoEncoder.flush();
  if (!receivedDecoderConfig) {
    throw new Error('Video encoder did not provide AVC decoder configuration');
  }
  muxer.finalize();
  const buffer = muxer.target.buffer;
  const blob = new Blob([buffer], { type: 'video/mp4' });
  const downloadUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = 'graph-export.mp4';
  a.click();
  URL.revokeObjectURL(downloadUrl);
}
