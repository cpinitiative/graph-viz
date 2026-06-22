import { useEffect, useMemo, useRef, useState } from 'react';
import GraphCanvas from '../GraphCanvas';
import { resolveExportFrameIndexes } from '../lib/exportFrameRange';
import {
  getGraphSvgElement,
  serializeCurrentFrameSvg,
  waitForFrameRender,
} from '../lib/timelineFrameCapture';
import ModalCloseButton from './ModalCloseButton';

const PREVIEW_SVG_ELEMENT_ID = 'graph-studio-export-preview-svg';
const EMPTY_DIFF = {
  changedNodes: new Set(),
  changedEdges: new Set(),
};
const EMPTY_SELECTION = new Set();
const noop = () => {};

const sectionClass =
  'space-y-4 border-b border-[#D7DEE8] bg-[#FFFFFF] p-5 last:border-b-0 dark:border-[#334155] dark:bg-[#111827]';
const actionClass =
  'min-h-[42px] border border-[#CBD5E1] bg-[#F8F9FA] px-3 py-2.5 text-sm font-semibold text-[#1E293B] transition-colors hover:bg-[#EEF2F6] disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#475569] dark:bg-[#1E293B] dark:text-[#F8FAFC] dark:hover:bg-[#334155]';
const primaryActionClass =
  'min-h-[42px] border border-[#0F2747] bg-[#0F2747] px-3 py-2.5 text-sm font-semibold text-[#FFFFFF] transition-colors hover:bg-[#173A68] disabled:cursor-not-allowed disabled:opacity-50';
const selectClass =
  'h-10 w-full border border-[#CBD5E1] bg-[#FFFFFF] py-2 pl-3 pr-10 text-sm font-medium text-[#1E293B] focus:border-[#0F2747] focus:outline-none focus:ring-1 focus:ring-[#0F2747] dark:border-[#475569] dark:bg-[#1E293B] dark:text-[#F8FAFC]';
const numberInputClass =
  'h-10 w-full border border-[#CBD5E1] bg-[#FFFFFF] px-3 py-2 text-sm font-medium text-[#1E293B] focus:border-[#0F2747] focus:outline-none focus:ring-1 focus:ring-[#0F2747] disabled:cursor-not-allowed disabled:bg-[#F1F5F9] disabled:text-[#94A3B8] dark:border-[#475569] dark:bg-[#1E293B] dark:text-[#F8FAFC] dark:disabled:bg-[#0F172A]';

const ExportPreviewRenderer = ({ graph, viewport, canvas }) => {
  if (!graph || viewport.width <= 0 || viewport.height <= 0) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed left-[-10000px] top-0 overflow-hidden opacity-0"
      style={{ width: viewport.width, height: viewport.height }}
    >
      <GraphCanvas
        graph={graph}
        diff={EMPTY_DIFF}
        selectedObject={canvas?.selectedObject ?? null}
        selectedNodeIds={canvas?.selectedNodeIds ?? EMPTY_SELECTION}
        drawFrom={canvas?.drawFrom ?? null}
        mode="select"
        viewState={canvas?.viewState ?? { x: 0, y: 0, zoom: 1 }}
        setViewState={noop}
        showGrid={Boolean(canvas?.showGrid)}
        customLegend={canvas?.customLegend}
        setCustomLegend={noop}
        snapEnabled={false}
        lockCanvas
        edgeRouting={canvas?.edgeRouting}
        edgeCurvature={canvas?.edgeCurvature}
        nodeRadius={canvas?.nodeRadius}
        edgeWidth={canvas?.edgeWidth}
        svgElementId={PREVIEW_SVG_ELEMENT_ID}
        svgTestId="export-preview-renderer-svg"
        svgResourcePrefix="export-preview"
        layoutIdPrefix="export-preview-"
        onSelectNode={noop}
        onSelectEdge={noop}
        onSelectNodes={noop}
        onBackgroundClear={noop}
        onNodePointerDown={noop}
        onNodeMove={noop}
        onNodePointerUp={noop}
        onNodeClickForDraw={noop}
        onCanvasDoubleClick={noop}
      />
    </div>
  );
};

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
  currentFrame = 0,
  steps = [],
  getFrameGraph,
  previewCanvas,
}) => {
  const [previewFrameIndex, setPreviewFrameIndex] = useState(currentFrame);
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewStatus, setPreviewStatus] = useState('loading');
  const [editorViewport, setEditorViewport] = useState({
    width: 0,
    height: 0,
  });
  const wasOpenRef = useRef(false);

  const maxFrame = Math.max(1, totalFrames);
  const frameRange = useMemo(
    () => ({
      mode: exportFrameRange?.mode ?? 'all',
      startFrame: exportFrameRange?.startFrame ?? 1,
      endFrame: exportFrameRange?.endFrame ?? maxFrame,
    }),
    [
      exportFrameRange?.endFrame,
      exportFrameRange?.mode,
      exportFrameRange?.startFrame,
      maxFrame,
    ]
  );
  const includedFrameIndexes = useMemo(
    () =>
      resolveExportFrameIndexes({
        frameCount: totalFrames,
        currentFrame,
        range: frameRange,
      }),
    [currentFrame, frameRange, totalFrames]
  );
  const previewGraph = useMemo(
    () => getFrameGraph?.(previewFrameIndex) ?? null,
    [getFrameGraph, previewFrameIndex]
  );
  const selectedStep = steps[previewFrameIndex];
  const isCustomFrameRange = frameRange.mode === 'range';

  useEffect(() => {
    if (!open) {
      wasOpenRef.current = false;
      return;
    }

    const fallbackFrame =
      includedFrameIndexes.includes(currentFrame) &&
      Number.isInteger(currentFrame)
        ? currentFrame
        : (includedFrameIndexes[0] ?? 0);

    if (!wasOpenRef.current) {
      wasOpenRef.current = true;
      setPreviewFrameIndex(fallbackFrame);
      return;
    }

    setPreviewFrameIndex(previousFrame =>
      includedFrameIndexes.includes(previousFrame)
        ? previousFrame
        : fallbackFrame
    );
  }, [currentFrame, includedFrameIndexes, open]);

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

    let resizeObserver = null;
    const updateViewport = () => {
      try {
        const bounds = getGraphSvgElement().getBoundingClientRect();
        setEditorViewport({
          width: Math.max(2, Math.round(bounds.width)),
          height: Math.max(2, Math.round(bounds.height)),
        });
      } catch {
        setEditorViewport({ width: 0, height: 0 });
      }
    };

    updateViewport();
    try {
      const svgElement = getGraphSvgElement();
      resizeObserver = new ResizeObserver(updateViewport);
      resizeObserver.observe(svgElement);
    } catch {
      // The preview fallback handles a missing editor canvas.
    }

    return () => resizeObserver?.disconnect();
  }, [open]);

  useEffect(() => {
    if (!open || !previewGraph || editorViewport.width <= 0) return undefined;

    let active = true;

    const updatePreview = async () => {
      try {
        await Promise.resolve();
        if (active) setPreviewStatus('loading');
        await waitForFrameRender();
        const svgData = serializeCurrentFrameSvg({
          svgElementId: PREVIEW_SVG_ELEMENT_ID,
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

    updatePreview();
    return () => {
      active = false;
    };
  }, [
    editorViewport.height,
    editorViewport.width,
    imageFraming,
    open,
    previewCanvas,
    previewFrameIndex,
    previewGraph,
  ]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/75 p-2 sm:p-4"
      data-testid="export-menu-modal"
      onMouseDown={event => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <div
        className="flex max-h-[96vh] min-h-0 w-full max-w-[1400px] flex-col overflow-hidden border border-[#94A3B8] bg-[#F8F9FA] shadow-2xl dark:border-[#475569] dark:bg-[#0F172A]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-menu-title"
      >
        <header className="flex flex-none items-start justify-between border-b border-[#CBD5E1] bg-[#FFFFFF] px-5 py-4 dark:border-[#334155] dark:bg-[#111827] sm:px-6">
          <div>
            <h2
              id="export-menu-title"
              className="text-lg font-semibold text-[#0F172A] dark:text-[#F8FAFC]"
            >
              Export
            </h2>
            <p className="mt-1 text-xs text-[#64748B] dark:text-[#94A3B8]">
              Preview and export project data, images, slides, or video.
            </p>
          </div>
          <ModalCloseButton onClick={onClose} />
        </header>

        <div className="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-[minmax(0,1fr)_390px] lg:overflow-hidden">
          <section
            className="flex min-h-[440px] min-w-0 flex-col border-b border-[#CBD5E1] bg-[#E9EDF2] p-4 dark:border-[#334155] dark:bg-[#0B1220] sm:p-6 lg:min-h-0 lg:border-b-0 lg:border-r"
            data-testid="export-preview-section"
          >
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#475569] dark:text-[#94A3B8]">
                  Preview
                </div>
                <h3 className="mt-1 truncate text-base font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                  Frame {previewFrameIndex + 1}
                  {selectedStep?.description
                    ? ` — ${selectedStep.description}`
                    : ''}
                </h3>
              </div>
              <div className="border border-[#CBD5E1] bg-[#FFFFFF] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#475569] dark:border-[#475569] dark:bg-[#111827] dark:text-[#CBD5E1]">
                {imageFraming === 'fit' ? 'Fit graph' : 'Viewport'}
              </div>
            </div>

            <div
              className="flex min-h-[300px] flex-1 items-center justify-center overflow-hidden border border-[#94A3B8] bg-[#FFFFFF] p-4 shadow-[0_4px_16px_rgba(15,23,42,0.08)] sm:p-6"
              data-preview-framing={imageFraming}
              data-preview-frame-index={previewFrameIndex}
              data-testid="export-preview-panel"
            >
              {previewStatus === 'ready' && previewUrl ? (
                <div
                  className="flex h-full w-full items-center justify-center"
                  data-testid="export-preview-current-frame"
                >
                  <img
                    src={previewUrl}
                    alt={`Export preview for frame ${previewFrameIndex + 1}`}
                    className="block max-h-full max-w-full object-contain"
                    data-testid="export-preview-image"
                  />
                </div>
              ) : (
                <div
                  className="max-w-sm text-center text-sm text-[#64748B]"
                  data-testid="export-preview-status"
                >
                  {previewStatus === 'error'
                    ? 'Preview unavailable. Export actions still work.'
                    : 'Preparing preview...'}
                </div>
              )}
            </div>
            <p className="mt-3 text-xs leading-relaxed text-[#64748B] dark:text-[#94A3B8]">
              Preview selection is for review only. Image exports continue to
              use the current editor frame.
            </p>

            <div className="mt-4 flex-none border-t border-[#CBD5E1] pt-4 dark:border-[#334155]">
              <div className="mb-2 flex items-center justify-between gap-4">
                <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-[#334155] dark:text-[#E2E8F0]">
                  Frame Review
                </h4>
                <span className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                  {includedFrameIndexes.length}{' '}
                  {includedFrameIndexes.length === 1 ? 'frame' : 'frames'}
                </span>
              </div>
              <div
                className="flex gap-2 overflow-x-auto pb-1"
                data-testid="export-preview-frame-list"
              >
                {includedFrameIndexes.map(frameIndex => {
                  const step = steps[frameIndex];
                  const isSelected = frameIndex === previewFrameIndex;
                  return (
                    <button
                      key={step?.id ?? frameIndex}
                      type="button"
                      aria-current={isSelected ? 'true' : undefined}
                      className={`min-h-[74px] w-[170px] flex-none border px-3 py-2.5 text-left transition-colors sm:w-[190px] ${
                        isSelected
                          ? 'border-[#B56A2D] bg-[#FFF7ED] text-[#7C2D12] dark:border-[#D97706] dark:bg-[#451A03] dark:text-[#FED7AA]'
                          : 'border-[#CBD5E1] bg-[#FFFFFF] text-[#334155] hover:border-[#94A3B8] hover:bg-[#F8FAFC] dark:border-[#475569] dark:bg-[#111827] dark:text-[#E2E8F0] dark:hover:border-[#64748B]'
                      }`}
                      data-selected={isSelected ? 'true' : 'false'}
                      data-testid={`export-preview-frame-item-${frameIndex}`}
                      onClick={() => setPreviewFrameIndex(frameIndex)}
                    >
                      <span className="flex items-center justify-between gap-3">
                        <span className="text-xs font-semibold">
                          Frame {frameIndex + 1}
                        </span>
                        {Number.isFinite(Number(step?.durationMs)) && (
                          <span className="text-[10px] opacity-70">
                            {Number(step.durationMs)} ms
                          </span>
                        )}
                      </span>
                      <span className="mt-1 line-clamp-2 block text-[11px] leading-relaxed opacity-80">
                        {step?.description ||
                          `Timeline frame ${frameIndex + 1}`}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          <aside className="min-h-0 overflow-y-visible border-[#CBD5E1] dark:border-[#334155] lg:overflow-y-auto">
            <section className={sectionClass}>
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0F172A] dark:text-[#F8FAFC]">
                  Project Data
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-[#64748B] dark:text-[#94A3B8]">
                  Save the full project or copy its graph as an edge list.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
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
                <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0F172A] dark:text-[#F8FAFC]">
                  Current Frame Image
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-[#64748B] dark:text-[#94A3B8]">
                  Configure a crisp image of the active editor frame.
                </p>
              </div>
              <div
                className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1"
                data-testid="image-export-controls"
              >
                <label className="space-y-1.5" htmlFor="png-scale-select">
                  <span className="block text-xs font-semibold text-[#334155] dark:text-[#E2E8F0]">
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
                  <span className="block text-[11px] leading-relaxed text-[#64748B] dark:text-[#94A3B8]">
                    2x is recommended for slides and docs.
                  </span>
                </label>
                <label className="space-y-1.5" htmlFor="image-framing-select">
                  <span className="block text-xs font-semibold text-[#334155] dark:text-[#E2E8F0]">
                    Image Framing
                  </span>
                  <select
                    id="image-framing-select"
                    value={imageFraming}
                    aria-label="Image Framing"
                    data-testid="image-framing-select"
                    onChange={event =>
                      onImageFramingChange?.(event.target.value)
                    }
                    className={selectClass}
                  >
                    <option value="viewport">Viewport</option>
                    <option value="fit">Fit graph</option>
                  </select>
                  <span className="block text-[11px] leading-relaxed text-[#64748B] dark:text-[#94A3B8]">
                    Viewport preserves the editor view; Fit graph crops to
                    visible content.
                  </span>
                </label>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  className={primaryActionClass}
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

            <section className={sectionClass}>
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0F172A] dark:text-[#F8FAFC]">
                  Timeline
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-[#64748B] dark:text-[#94A3B8]">
                  Choose the frames included in slideshow and video exports.
                </p>
              </div>
              <div
                className="space-y-3"
                data-testid="export-frame-range-controls"
              >
                <div className="text-xs font-semibold text-[#334155] dark:text-[#E2E8F0]">
                  Export Frames
                </div>
                <div className="grid grid-cols-3 border border-[#CBD5E1] dark:border-[#475569]">
                  {[
                    ['all', 'All frames'],
                    ['current', 'Current frame'],
                    ['range', 'Custom range'],
                  ].map(([value, label]) => (
                    <label
                      key={value}
                      className={`relative flex min-h-[38px] cursor-pointer items-center justify-center border-r border-[#CBD5E1] px-2 py-2 text-center text-[11px] font-semibold last:border-r-0 dark:border-[#475569] ${
                        frameRange.mode === value
                          ? 'bg-[#0F2747] text-[#FFFFFF]'
                          : 'bg-[#FFFFFF] text-[#475569] hover:bg-[#F1F5F9] dark:bg-[#111827] dark:text-[#CBD5E1] dark:hover:bg-[#1E293B]'
                      }`}
                    >
                      <input
                        type="radio"
                        name="export-frame-range-mode"
                        value={value}
                        checked={frameRange.mode === value}
                        onChange={() =>
                          onExportFrameRangeChange?.({ mode: value })
                        }
                        className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
                {isCustomFrameRange && (
                  <div className="grid grid-cols-2 gap-3">
                    <label
                      className="space-y-1.5"
                      htmlFor="export-frame-range-start"
                    >
                      <span className="block text-xs font-semibold text-[#334155] dark:text-[#E2E8F0]">
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
                        onChange={event => {
                          if (!event.target.value) return;
                          onExportFrameRangeChange?.({
                            startFrame: event.target.value,
                          });
                        }}
                        className={numberInputClass}
                      />
                    </label>
                    <label
                      className="space-y-1.5"
                      htmlFor="export-frame-range-end"
                    >
                      <span className="block text-xs font-semibold text-[#334155] dark:text-[#E2E8F0]">
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
                        onChange={event => {
                          if (!event.target.value) return;
                          onExportFrameRangeChange?.({
                            endFrame: event.target.value,
                          });
                        }}
                        className={numberInputClass}
                      />
                    </label>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  className={primaryActionClass}
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
          </aside>
        </div>
      </div>

      <ExportPreviewRenderer
        graph={previewGraph}
        viewport={editorViewport}
        canvas={previewCanvas}
      />
    </div>
  );
};

export default ExportModal;
