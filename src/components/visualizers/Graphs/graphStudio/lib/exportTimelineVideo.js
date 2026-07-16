import * as Mp4Muxer from 'mp4-muxer';
import { normalizeFrameDuration } from './frameDuration.js';
import {
  CAPTURE_MODE,
  createCaptureCanvas,
  downloadBlob,
  EXPORT_CAPTURE_SVG_ELEMENT_ID,
  getGraphSvgElement,
  IMAGE_FRAMING,
  loadSvgImageFromElement,
} from './timelineFrameCapture.js';

const AVC_CODEC = 'avc1.42E01F';
export const VIDEO_EXPORT_FPS = 30;

export const buildVideoFramePlan = ({
  steps,
  frameIndexes,
  fps = VIDEO_EXPORT_FPS,
}) => {
  const sourceSteps = Array.isArray(steps) ? steps : [];
  const selectedFrameIndexes = Array.isArray(frameIndexes)
    ? frameIndexes.filter(
        index =>
          Number.isInteger(index) && index >= 0 && index < sourceSteps.length
      )
    : sourceSteps.map((_, index) => index);

  let outputFrameOffset = 0;
  return selectedFrameIndexes.map(frameIndex => {
    const durationMs = normalizeFrameDuration(
      sourceSteps[frameIndex]?.durationMs
    );
    const outputFrameCount = Math.max(1, Math.round((durationMs / 1000) * fps));
    const descriptor = {
      frameIndex,
      durationMs,
      outputFrameCount,
      outputFrameOffset,
    };
    outputFrameOffset += outputFrameCount;
    return descriptor;
  });
};

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
 * Captures an explicit resolved-frame surface without navigating the editor.
 */
export async function exportTimelineVideo({
  steps,
  frameIndexes,
  renderFrame,
  svgElementId = EXPORT_CAPTURE_SVG_ELEMENT_ID,
}) {
  if (typeof VideoEncoder === 'undefined') {
    throw new Error('VideoEncoder API is not supported in this browser.');
  }
  if (!steps?.length) {
    throw new Error('No timeline frames to export');
  }
  const framePlan = buildVideoFramePlan({ steps, frameIndexes });
  if (!framePlan.length) {
    throw new Error('No timeline frames selected for export');
  }
  if (typeof renderFrame !== 'function') {
    throw new Error('Video export renderer is unavailable');
  }

  const firstSvg =
    (await renderFrame(framePlan[0].frameIndex)) ??
    getGraphSvgElement(svgElementId);
  const { canvas, ctx, viewport } = createCaptureCanvas(firstSvg, {
    framingMode: IMAGE_FRAMING.slide,
    captureMode: CAPTURE_MODE.video,
  });

  const muxer = new Mp4Muxer.Muxer({
    target: new Mp4Muxer.ArrayBufferTarget(),
    video: { codec: 'avc', width: canvas.width, height: canvas.height },
    fastStart: 'in-memory',
  });
  let receivedDecoderConfig = false;
  let encoderError = null;
  const videoEncoder = new VideoEncoder({
    output: (chunk, meta) => {
      const normalizedMeta = withDefaultColorSpace(meta);
      if (normalizedMeta?.decoderConfig) receivedDecoderConfig = true;
      muxer.addVideoChunk(chunk, normalizedMeta);
    },
    error: error => {
      encoderError = error;
      console.error(error);
    },
  });
  const fps = VIDEO_EXPORT_FPS;
  let frameIndex = 0;

  try {
    videoEncoder.configure({
      codec: AVC_CODEC,
      width: canvas.width,
      height: canvas.height,
      avc: { format: 'avc' },
      bitrate: 5_000_000,
      framerate: fps,
    });
    for (const descriptor of framePlan) {
      const svgEl =
        descriptor.frameIndex === framePlan[0].frameIndex
          ? firstSvg
          : ((await renderFrame(descriptor.frameIndex)) ??
            getGraphSvgElement(svgElementId));

      const img = await loadSvgImageFromElement({
        svgEl,
        width: canvas.width,
        height: canvas.height,
        viewportWidth: viewport.width,
        viewportHeight: viewport.height,
        framingMode: IMAGE_FRAMING.slide,
      });

      for (let f = 0; f < descriptor.outputFrameCount; f += 1) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const frame = new VideoFrame(canvas, {
          timestamp: (frameIndex * 1000000) / fps,
        });
        try {
          videoEncoder.encode(frame, { keyFrame: frameIndex % fps === 0 });
        } finally {
          frame.close();
        }
        frameIndex += 1;
      }
    }

    await videoEncoder.flush();
    if (encoderError) throw encoderError;
    if (!receivedDecoderConfig) {
      throw new Error(
        'Video encoder did not provide AVC decoder configuration'
      );
    }
    muxer.finalize();
    downloadBlob({
      blob: new Blob([muxer.target.buffer], { type: 'video/mp4' }),
      filename: 'graph-export.mp4',
    });
  } finally {
    if (videoEncoder.state !== 'closed') videoEncoder.close();
  }
}
