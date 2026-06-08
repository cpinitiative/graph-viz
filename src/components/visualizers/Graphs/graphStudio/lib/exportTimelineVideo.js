import * as Mp4Muxer from 'mp4-muxer';

const DEFAULT_SVG_ELEMENT_ID = 'graph-studio-canvas-svg';
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
  labelPos,
  svgElementId = DEFAULT_SVG_ELEMENT_ID,
}) {
  if (typeof VideoEncoder === 'undefined') {
    throw new Error('VideoEncoder API is not supported in this browser.');
  }

  const canvas = document.createElement('canvas');
  const svgEl =
    document.getElementById(svgElementId) || document.querySelector('svg');
  if (!svgEl) throw new Error('SVG not found');

  const rect = svgEl.getBoundingClientRect();
  canvas.width = Math.floor(rect.width / 2) * 2;
  canvas.height = Math.floor(rect.height / 2) * 2;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas rendering context unavailable');

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

  for (let i = 0; i < steps.length; i++) {
    setCurrentFrame(i);
    await new Promise(resolve => setTimeout(resolve, 100));

    const origWidth = svgEl.getAttribute('width');
    const origHeight = svgEl.getAttribute('height');

    svgEl.setAttribute('width', canvas.width);
    svgEl.setAttribute('height', canvas.height);

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

    const img = new Image();
    const svgBlob = new Blob([svgData], {
      type: 'image/svg+xml;charset=utf-8',
    });
    const url = URL.createObjectURL(svgBlob);
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = () =>
        reject(
          new Error('Failed to load SVG image. Check console for details.')
        );
      img.src = url;
    });

    const stepDurationMs = steps[i].durationMs || 600;
    const framesForStep = Math.round((stepDurationMs / 1000) * fps);
    for (let f = 0; f < framesForStep; f++) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      const desc = steps[i].description;
      if (desc) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.font = '24px sans-serif';
        const textMetrics = ctx.measureText(desc);
        const padding = 10;
        const textWidth = textMetrics.width;
        const textHeight = 24;
        let x;
        let y;
        if (labelPos.includes('left')) x = 20;
        else if (labelPos.includes('right'))
          x = canvas.width - textWidth - 20 - padding * 2;
        else x = (canvas.width - textWidth) / 2 - padding;
        if (labelPos.includes('top')) y = 20;
        else if (labelPos.includes('bottom'))
          y = canvas.height - textHeight - 20 - padding * 2;
        else y = (canvas.height - textHeight) / 2 - padding;
        ctx.fillRect(x, y, textWidth + padding * 2, textHeight + padding * 2);
        ctx.fillStyle = '#000000';
        ctx.fillText(desc, x + padding, y + textHeight + padding - 4);
      }
      const frame = new VideoFrame(canvas, {
        timestamp: (frameIndex * 1000000) / fps,
      });
      videoEncoder.encode(frame, { keyFrame: frameIndex % 30 === 0 });
      frame.close();
      frameIndex++;
    }
    URL.revokeObjectURL(url);
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
