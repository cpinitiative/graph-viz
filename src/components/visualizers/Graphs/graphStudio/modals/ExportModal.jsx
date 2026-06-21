import { useEffect, useState } from 'react';
import {
  getGraphSvgElement,
  serializeCurrentFrameSvg,
} from '../lib/timelineFrameCapture';
import ModalCloseButton from './ModalCloseButton';

const sectionClass =
  'space-y-4 border border-outline-variant/30 bg-white p-4 dark:border-dark-outline-variant/30 dark:bg-gray-900';
const actionClass =
  'min-h-[44px] rounded-md bg-surface-container px-4 py-3 text-sm font-medium text-on-surface transition-colors hover:bg-surface-container-high disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-800 dark:text-dark-on-surface dark:hover:bg-dark-surface-container-high';
const selectClass =
  'h-10 w-full rounded-md border border-outline-variant/40 bg-white py-2 pl-3 pr-10 text-sm font-medium text-on-surface focus:border-primary focus:outline-none focus:ring-0 dark:border-dark-outline-variant/40 dark:bg-gray-800 dark:text-dark-on-surface';
const numberInputClass =
  'h-10 w-full rounded-md border border-outline-variant/40 bg-white px-3 py-2 text-sm font-medium text-on-surface focus:border-primary focus:outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-50 dark:border-dark-outline-variant/40 dark:bg-gray-800 dark:text-dark-on-surface';

const ExportModal = ({
  open,
  onClose,
  onExportText,
  onExportProject,
  onExportSvg,
  onExportPng,
  pngScale = 2,
  onPngScaleChange,
  imageFraming = 'viewport',
  onImageFramingChange,
  onExportVideo,
  onExportSlideshow,
  exportFrameRange,
  onExportFrameRangeChange,
  totalFrames,
}) => {
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewStatus, setPreviewStatus] = useState('loading');

  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = event => {
      if (event.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, open]);

  useEffect(() => {
    if (!open) return undefined;

    let active = true;
    let updateTimer = null;
    let mutationObserver = null;
    let resizeObserver = null;

    const updatePreview = () => {
      updateTimer = null;
      try {
        const svgData = serializeCurrentFrameSvg({
          framingMode: imageFraming,
        });
        if (!active) return;
        setPreviewUrl(
          `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgData)}`
        );
        setPreviewStatus('ready');
      } catch {
        if (!active) return;
        setPreviewUrl('');
        setPreviewStatus('error');
      }
    };

    const schedulePreviewUpdate = (delay = 80) => {
      if (updateTimer !== null) return;
      updateTimer = window.setTimeout(updatePreview, delay);
    };

    schedulePreviewUpdate(0);

    try {
      const svgEl = getGraphSvgElement();
      mutationObserver = new MutationObserver(() => schedulePreviewUpdate());
      mutationObserver.observe(svgEl, {
        attributes: true,
        childList: true,
        characterData: true,
        subtree: true,
      });
      resizeObserver = new ResizeObserver(() => schedulePreviewUpdate());
      resizeObserver.observe(svgEl);
    } catch {
      // The scheduled update reports a useful empty state if the SVG is absent.
    }

    return () => {
      active = false;
      if (updateTimer !== null) window.clearTimeout(updateTimer);
      mutationObserver?.disconnect();
      resizeObserver?.disconnect();
    };
  }, [imageFraming, open]);

  if (!open) return null;

  const maxFrame = Math.max(1, totalFrames);
  const frameRange = {
    mode: exportFrameRange?.mode ?? 'all',
    startFrame: exportFrameRange?.startFrame ?? 1,
    endFrame: exportFrameRange?.endFrame ?? maxFrame,
  };
  const isCustomFrameRange = frameRange.mode === 'range';

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-surface-container-lowest/80 p-3 backdrop-blur-[20px] dark:bg-black/60 sm:p-5"
      data-testid="export-menu-modal"
      onMouseDown={event => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <div
        className="flex max-h-[94vh] w-full max-w-3xl flex-col rounded-md bg-surface-container-low shadow-ambient-lg dark:bg-black"
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-menu-title"
      >
        <div className="flex items-center justify-between border-b border-outline-variant/20 p-5 dark:border-dark-outline-variant/20">
          <div>
            <h2
              id="export-menu-title"
              className="text-base font-semibold text-on-surface dark:text-dark-on-surface"
            >
              Export
            </h2>
            <p className="mt-1 text-xs text-outline dark:text-dark-outline">
              Export editable data, the current frame, or a timeline.
            </p>
          </div>
          <ModalCloseButton onClick={onClose} />
        </div>

        <div className="grid gap-4 overflow-auto p-4 sm:p-5 md:grid-cols-2">
          <section className={`${sectionClass} md:col-span-2`}>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-on-surface dark:text-dark-on-surface">
                Project Data
              </h3>
              <p className="mt-1 text-xs text-outline dark:text-dark-outline">
                Save the full project or copy its graph as an edge list.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                className={actionClass}
                data-testid="project-export-button"
                onClick={onExportProject}
              >
                Export Project
              </button>
              <button
                type="button"
                className={actionClass}
                onClick={onExportText}
              >
                Export Edge List
              </button>
            </div>
          </section>

          <section className={sectionClass}>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-on-surface dark:text-dark-on-surface">
                Current Frame Image
              </h3>
              <p className="mt-1 text-xs text-outline dark:text-dark-outline">
                Configure a crisp image of the active frame.
              </p>
            </div>
            <div
              className="grid gap-3 sm:grid-cols-2"
              data-testid="image-export-controls"
            >
              <label className="space-y-1.5" htmlFor="png-scale-select">
                <span className="block text-xs font-semibold text-on-surface dark:text-dark-on-surface">
                  PNG Scale
                </span>
                <select
                  id="png-scale-select"
                  value={pngScale}
                  aria-label="PNG Scale"
                  data-testid="png-scale-select"
                  onChange={event =>
                    onPngScaleChange?.(Number(event.target.value))
                  }
                  className={selectClass}
                >
                  <option value={1}>1x</option>
                  <option value={2}>2x</option>
                  <option value={3}>3x</option>
                </select>
                <span className="block text-[10px] leading-relaxed text-outline dark:text-dark-outline">
                  2x is recommended for slides and docs.
                </span>
              </label>
              <label className="space-y-1.5" htmlFor="image-framing-select">
                <span className="block text-xs font-semibold text-on-surface dark:text-dark-on-surface">
                  Image Framing
                </span>
                <select
                  id="image-framing-select"
                  value={imageFraming}
                  aria-label="Image Framing"
                  data-testid="image-framing-select"
                  onChange={event => onImageFramingChange?.(event.target.value)}
                  className={selectClass}
                >
                  <option value="viewport">Viewport</option>
                  <option value="fit">Fit graph</option>
                </select>
                <span className="block text-[10px] leading-relaxed text-outline dark:text-dark-outline">
                  Viewport preserves the editor view; Fit graph crops to visible
                  content.
                </span>
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                className={actionClass}
                data-testid="png-export-button"
                onClick={onExportPng}
              >
                Export PNG
              </button>
              <button
                type="button"
                className={actionClass}
                data-testid="svg-export-button"
                onClick={onExportSvg}
              >
                Export SVG
              </button>
            </div>
          </section>

          <section
            className={`${sectionClass} md:col-span-2`}
            data-testid="export-preview-section"
          >
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-on-surface dark:text-dark-on-surface">
                Preview
              </h3>
              <p className="mt-1 text-xs text-outline dark:text-dark-outline">
                Preview of the current frame using the selected image framing.
              </p>
            </div>
            <div
              className="flex min-h-40 items-center justify-center overflow-hidden border border-[#CBD5E1] bg-[#F8F9FA] p-3 dark:border-[#475569] dark:bg-[#111827]"
              data-preview-framing={imageFraming}
              data-testid="export-preview-panel"
            >
              {previewStatus === 'ready' && previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Current frame export preview"
                  className="block max-h-64 w-full object-contain"
                  data-testid="export-preview-image"
                />
              ) : (
                <p
                  className="text-xs text-[#64748B] dark:text-[#CBD5E1]"
                  data-testid="export-preview-status"
                >
                  {previewStatus === 'error'
                    ? 'Preview unavailable.'
                    : 'Preparing preview...'}
                </p>
              )}
            </div>
          </section>

          <section className={sectionClass}>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-on-surface dark:text-dark-on-surface">
                Timeline
              </h3>
              <p className="mt-1 text-xs text-outline dark:text-dark-outline">
                Choose the frames included in slideshow and video exports.
              </p>
            </div>
            <div
              className="space-y-3"
              data-testid="export-frame-range-controls"
            >
              <div className="text-xs font-semibold text-on-surface dark:text-dark-on-surface">
                Export Frames
              </div>
              <div className="grid gap-2 sm:grid-cols-3 md:grid-cols-1 lg:grid-cols-3">
                {[
                  ['all', 'All frames'],
                  ['current', 'Current frame'],
                  ['range', 'Custom range'],
                ].map(([value, label]) => (
                  <label
                    key={value}
                    className="flex min-h-[40px] cursor-pointer items-center gap-2 border border-outline-variant/30 px-3 py-2 text-xs font-medium text-on-surface dark:border-dark-outline-variant/30 dark:text-dark-on-surface"
                  >
                    <input
                      type="radio"
                      name="export-frame-range-mode"
                      value={value}
                      checked={frameRange.mode === value}
                      onChange={() =>
                        onExportFrameRangeChange?.({ mode: value })
                      }
                      className="h-4 w-4 border-outline-variant text-blue-800 focus:ring-blue-800"
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label
                  className="space-y-1.5"
                  htmlFor="export-frame-range-start"
                >
                  <span className="block text-xs font-semibold text-on-surface dark:text-dark-on-surface">
                    Start Frame
                  </span>
                  <input
                    id="export-frame-range-start"
                    type="number"
                    min="1"
                    max={maxFrame}
                    value={frameRange.startFrame}
                    aria-label="Export start frame"
                    data-testid="export-frame-start-input"
                    disabled={!isCustomFrameRange}
                    onChange={event =>
                      onExportFrameRangeChange?.({
                        startFrame: event.target.value,
                      })
                    }
                    className={numberInputClass}
                  />
                </label>
                <label className="space-y-1.5" htmlFor="export-frame-range-end">
                  <span className="block text-xs font-semibold text-on-surface dark:text-dark-on-surface">
                    End Frame
                  </span>
                  <input
                    id="export-frame-range-end"
                    type="number"
                    min="1"
                    max={maxFrame}
                    value={frameRange.endFrame}
                    aria-label="Export end frame"
                    data-testid="export-frame-end-input"
                    disabled={!isCustomFrameRange}
                    onChange={event =>
                      onExportFrameRangeChange?.({
                        endFrame: event.target.value,
                      })
                    }
                    className={numberInputClass}
                  />
                </label>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                className={actionClass}
                data-testid="slideshow-export-button"
                disabled={!totalFrames}
                onClick={onExportSlideshow}
              >
                Export Slideshow
              </button>
              <button
                type="button"
                className={actionClass}
                onClick={() => {
                  onClose?.();
                  onExportVideo?.();
                }}
              >
                Export MP4
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;
