import { useRef } from 'react';
import {
  CUSTOM_LEGEND_POSITION_LABELS,
  CUSTOM_LEGEND_POSITIONS,
  DEFAULT_CUSTOM_LEGEND,
} from './lib/customLegend';

const MODE_OPTIONS = ['select', 'pan', 'draw'];
const LAYOUT_OPTIONS = [
  ['circle', 'Circle'],
  ['tree', 'Tree'],
  ['force', 'Force'],
];
const PRESET_OPTIONS = [
  ['bfs', 'BFS'],
  ['dfs', 'DFS'],
  ['topological-sort', 'Topological Sort'],
  ['disjoint-set-union', 'Disjoint Set Union'],
  ['connected-components', 'Connected Components'],
  ['kruskal-mst', 'Kruskal MST'],
  ['dijkstra', 'Dijkstra'],
  ['dijkstra-shortest-paths', 'Dijkstra Shortest Paths'],
  ['multigraph', 'Multi-Edge / Loop'],
];

const sectionTitleClass =
  'font-manrope text-xs font-semibold uppercase tracking-wider text-on-surface dark:text-dark-on-surface';
const actionButtonBaseClass =
  'min-h-[44px] rounded-md py-3 text-xs font-medium transition-colors md:min-h-0 md:py-2';
const actionButtonDefaultClass =
  'bg-surface-container text-on-surface hover:bg-surface-container-high dark:bg-dark-surface-container dark:text-dark-on-surface dark:hover:bg-dark-surface-container-high';
const actionButtonPrimaryClass =
  'bg-primary text-on-primary dark:bg-dark-primary dark:text-dark-on-primary';
const iconButtonClass =
  'min-w-[44px] rounded-md p-2 text-on-surface transition-colors hover:bg-surface-container-high dark:text-dark-on-surface dark:hover:bg-dark-surface-container-high md:min-w-0 md:p-1.5';
const toggleRowClass =
  'flex cursor-pointer items-center justify-between rounded-md bg-surface-container p-3 transition-colors hover:bg-surface-container-high dark:bg-dark-surface-container dark:hover:bg-dark-surface-container-high md:p-2';
const checkboxClass =
  'h-5 w-5 rounded bg-surface-container-high text-blue-800 focus:ring-blue-800 focus:ring-offset-slate-800';
const dataButtonClass =
  'min-h-[44px] rounded bg-surface-container py-2 text-[10px] text-on-surface transition-colors hover:bg-surface-container-high disabled:cursor-not-allowed disabled:opacity-50 dark:bg-dark-surface-container dark:text-dark-on-surface dark:hover:bg-dark-surface-container-high md:min-h-0 md:py-1.5 md:text-[10px]';
const compactSelectClass =
  'w-full rounded border border-outline-variant/30 bg-white px-2 py-1.5 text-[10px] font-medium text-on-surface focus:border-primary focus:outline-none focus:ring-0 dark:border-dark-outline-variant/30 dark:bg-gray-800 dark:text-dark-on-surface';
const compactNumberInputClass =
  'w-full rounded border border-outline-variant/30 bg-white px-2 py-1.5 text-[10px] font-medium text-on-surface focus:border-primary focus:outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-50 dark:border-dark-outline-variant/30 dark:bg-gray-800 dark:text-dark-on-surface';
const rangeRadioClass =
  'h-3.5 w-3.5 border-outline-variant text-blue-800 focus:ring-blue-800';

const joinClasses = (...classes) => classes.filter(Boolean).join(' ');

const SectionTitle = ({ children }) => (
  <div className={sectionTitleClass}>{children}</div>
);

const ActionButton = ({
  children,
  className,
  variant = 'default',
  ...props
}) => (
  <button
    type="button"
    className={joinClasses(
      actionButtonBaseClass,
      variant === 'primary'
        ? actionButtonPrimaryClass
        : actionButtonDefaultClass,
      className
    )}
    {...props}
  >
    {children}
  </button>
);

const IconButton = ({ title, children, ...props }) => (
  <button
    type="button"
    className={iconButtonClass}
    title={title}
    aria-label={title}
    {...props}
  >
    {children}
  </button>
);

const ToggleRow = ({ label, checked, onChange }) => (
  <label className={toggleRowClass}>
    <span className="text-xs text-on-surface dark:text-dark-on-surface">
      {label}
    </span>
    <input
      type="checkbox"
      checked={checked}
      onChange={event => onChange(event.target.checked)}
      className={checkboxClass}
    />
  </label>
);

const CenterViewIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 3h6v6H3z" />
    <path d="M15 3h6v6h-6z" />
    <path d="M15 15h6v6h-6z" />
    <path d="M3 15h6v6H3z" />
  </svg>
);

const ZoomOutIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const ZoomInIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const StopIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <rect x="6" y="4" width="4" height="16" />
    <rect x="14" y="4" width="4" height="16" />
  </svg>
);

const PlayIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);

const LeftSidebar = ({
  mode,
  setMode,
  routing,
  setRouting,
  snapEnabled,
  setSnapEnabled,
  showGrid,
  setShowGrid,
  customLegend = DEFAULT_CUSTOM_LEGEND,
  setCustomLegend,
  lockCanvas,
  setLockCanvas,
  onAddNode,
  onDrawEdge,
  drawFrom,
  onAutoLayout,
  onOpenParser,
  onExportText,
  onExportProject,
  onExportSvg,
  onExportPng,
  onImportProjectFile,
  onExportVideo,
  onExportSlideshow,
  exportFrameRange,
  onExportFrameRangeChange,
  onOpenLegendEditor,
  isLegendEditorOpen = false,
  onOpenScript,
  selectedCount,
  onApplyPreset,
  currentFrame,
  totalFrames,
  onPlay,
  isPlaying,
  onCenterView,
  zoomPercent,
  onZoomIn,
  onZoomOut,
}) => {
  const projectImportInputRef = useRef(null);
  const drawHelpText =
    drawFrom !== null && drawFrom !== undefined
      ? `Source: node ${drawFrom}. Click the target node.`
      : 'Click the source node, then the target node. Select two nodes first to connect them instantly.';
  const legendEntries = Array.isArray(customLegend.entries)
    ? customLegend.entries
    : [];
  const legendPosition = CUSTOM_LEGEND_POSITIONS.includes(customLegend.position)
    ? customLegend.position
    : DEFAULT_CUSTOM_LEGEND.position;
  const legendSummary = `${legendEntries.length} ${
    legendEntries.length === 1 ? 'entry' : 'entries'
  } - ${CUSTOM_LEGEND_POSITION_LABELS[legendPosition] ?? 'Auto'}`;
  const maxFrame = Math.max(1, totalFrames);
  const frameRange = {
    mode: exportFrameRange?.mode ?? 'all',
    startFrame: exportFrameRange?.startFrame ?? 1,
    endFrame: exportFrameRange?.endFrame ?? maxFrame,
  };
  const isCustomFrameRange = frameRange.mode === 'range';
  const patchCustomLegend = patch => {
    setCustomLegend?.(prev => ({
      ...DEFAULT_CUSTOM_LEGEND,
      ...(prev ?? {}),
      ...patch,
    }));
  };

  return (
    <div
      className="flex h-full flex-col gap-4 overflow-auto bg-surface-container-low p-4 text-sm dark:bg-dark-surface md:gap-6 md:p-6"
      data-testid="left-sidebar"
    >
      <div className="space-y-3">
        <SectionTitle>Tools</SectionTitle>
        <div className="flex rounded-md bg-surface-container p-1 dark:bg-dark-surface-container">
          {MODE_OPTIONS.map(item => (
            <button
              key={item}
              type="button"
              className={joinClasses(
                'min-h-[44px] flex-1 rounded-md py-2 text-xs font-medium capitalize transition-colors md:min-h-0 md:py-1.5',
                mode === item
                  ? 'bg-primary text-on-primary dark:bg-blue-800 dark:text-dark-on-primary'
                  : 'text-on-surface hover:text-on-surface dark:text-dark-on-surface'
              )}
              onClick={() => setMode(item)}
            >
              {item}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <ActionButton onClick={onAddNode}>Add Node</ActionButton>
          <ActionButton
            variant={mode === 'draw' ? 'primary' : 'default'}
            onClick={onDrawEdge}
          >
            Draw Edge
          </ActionButton>
        </div>
        {mode === 'draw' && (
          <p className="text-[10px] leading-snug text-outline dark:text-dark-outline">
            {drawHelpText}
          </p>
        )}
      </div>

      <div className="space-y-3">
        <SectionTitle>Layout</SectionTitle>
        <div className="grid grid-cols-3 gap-1">
          {LAYOUT_OPTIONS.map(([type, label]) => (
            <ActionButton
              key={type}
              disabled={!onAutoLayout}
              onClick={() => onAutoLayout?.(type)}
            >
              {label}
            </ActionButton>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <SectionTitle>View / Canvas</SectionTitle>
        <div className="flex items-center justify-between rounded-md bg-surface-container p-2 dark:bg-dark-surface-container">
          <IconButton title="Center View" onClick={onCenterView}>
            <CenterViewIcon />
          </IconButton>
          <div className="flex items-center gap-2">
            <IconButton title="Zoom Out" onClick={onZoomOut}>
              <ZoomOutIcon />
            </IconButton>
            <span className="w-10 text-center text-xs font-medium text-on-surface dark:text-dark-on-surface">
              {zoomPercent}%
            </span>
            <IconButton title="Zoom In" onClick={onZoomIn}>
              <ZoomInIcon />
            </IconButton>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className={joinClasses(
              'flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-md py-3 text-xs font-semibold transition-colors md:min-h-0 md:py-2',
              isPlaying
                ? 'bg-surface-container-high text-primary hover:bg-surface-container-high dark:bg-dark-surface-container-high dark:text-dark-primary'
                : 'bg-primary text-on-primary hover:bg-blue-700 dark:bg-blue-800 dark:text-dark-on-primary'
            )}
            onClick={onPlay}
          >
            {isPlaying ? (
              <>
                <StopIcon />
                Stop
              </>
            ) : (
              <>
                <PlayIcon />
                Play
              </>
            )}
          </button>
          <div className="flex min-h-[44px] items-center rounded-md bg-surface-container px-3 py-2 text-xs font-medium text-on-surface dark:bg-dark-surface-container dark:text-dark-on-surface md:min-h-0 md:py-2">
            {currentFrame + 1} / {Math.max(1, totalFrames)}
          </div>
        </div>
        <div className="space-y-2">
          <div className="rounded-md bg-surface-container p-3 dark:bg-dark-surface-container md:p-2">
            <div className="mb-1.5 text-xs text-on-surface dark:text-dark-on-surface">
              Edge Routing
            </div>
            <select
              value={routing}
              aria-label="Edge routing"
              onChange={event => setRouting(event.target.value)}
              className="w-full rounded-md border border-outline-variant/30 bg-white px-2 py-2 text-xs text-on-surface focus:border-primary focus:outline-none focus:ring-0 dark:border-dark-outline-variant/30 dark:bg-gray-800 dark:text-dark-on-surface md:py-1.5"
            >
              <option value="straight">Straight</option>
              <option value="bezier">Bezier Avoid</option>
            </select>
          </div>
          <ToggleRow
            label="Dot Grid"
            checked={showGrid}
            onChange={setShowGrid}
          />
          <ToggleRow
            label="Snap to Grid"
            checked={snapEnabled}
            onChange={setSnapEnabled}
          />
          <ToggleRow
            label="Lock Canvas"
            checked={lockCanvas}
            onChange={setLockCanvas}
          />
        </div>
      </div>

      <div className="space-y-3">
        <SectionTitle>Examples</SectionTitle>
        <select
          aria-label="Load graph preset"
          onChange={event => {
            if (event.target.value) onApplyPreset(event.target.value);
            event.target.value = '';
          }}
          className="w-full rounded-md border border-outline-variant/30 bg-surface-container px-3 py-2 text-xs text-on-surface focus:border-primary focus:outline-none focus:ring-0 dark:border-dark-outline-variant/30 dark:bg-dark-surface-container dark:text-dark-on-surface md:py-2"
        >
          <option value="">Choose algorithm...</option>
          {PRESET_OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-3">
        <SectionTitle>Import</SectionTitle>
        <div className="grid grid-cols-1 gap-1">
          <button
            type="button"
            className={dataButtonClass}
            onClick={onOpenParser}
          >
            Import Edge List
          </button>
          <button
            type="button"
            className={dataButtonClass}
            data-testid="project-import-button"
            onClick={() => projectImportInputRef.current?.click()}
          >
            Import Project
          </button>
          <input
            ref={projectImportInputRef}
            type="file"
            accept=".json,.graphviz.json,application/json"
            aria-label="Import Project JSON"
            data-testid="project-import-input"
            className="sr-only"
            onChange={event => {
              onImportProjectFile?.(event.target.files?.[0]);
              event.target.value = '';
            }}
          />
        </div>
      </div>

      <div className="space-y-3">
        <SectionTitle>Export</SectionTitle>
        <div
          className="space-y-2 rounded-md bg-surface-container p-2 dark:bg-dark-surface-container"
          data-testid="custom-legend-controls"
        >
          <div className="flex items-center justify-between gap-2 rounded bg-surface-container-low p-2 dark:bg-dark-surface">
            <div className="min-w-0 flex-1">
              <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-on-surface dark:text-dark-on-surface">
                <input
                  type="checkbox"
                  checked={Boolean(customLegend.enabled)}
                  onChange={event =>
                    patchCustomLegend({ enabled: event.target.checked })
                  }
                  className={checkboxClass}
                />
                <span>Legend</span>
              </label>
              <div
                className="mt-1 truncate text-[10px] text-outline dark:text-dark-outline"
                data-testid="custom-legend-summary"
              >
                {legendSummary}
              </div>
            </div>
            <button
              type="button"
              aria-haspopup="dialog"
              aria-expanded={isLegendEditorOpen}
              aria-controls="custom-legend-editor"
              data-testid="custom-legend-edit-toggle"
              onClick={onOpenLegendEditor}
              className="min-h-8 rounded bg-surface-container-high px-3 text-[10px] font-semibold text-on-surface transition-colors hover:bg-outline-variant/20 dark:bg-dark-surface-container-high dark:text-dark-on-surface"
            >
              Edit Legend
            </button>
          </div>
          <label
            className="block space-y-1 rounded bg-surface-container-low p-2 dark:bg-dark-surface"
            htmlFor="custom-legend-sidebar-position"
          >
            <span className="text-[10px] font-semibold uppercase text-outline dark:text-dark-outline">
              Placement
            </span>
            <select
              id="custom-legend-sidebar-position"
              value={legendPosition}
              aria-label="Legend Placement"
              data-testid="custom-legend-placement-select"
              onChange={event =>
                patchCustomLegend({ position: event.target.value })
              }
              className={compactSelectClass}
            >
              {CUSTOM_LEGEND_POSITIONS.map(position => (
                <option key={position} value={position}>
                  {CUSTOM_LEGEND_POSITION_LABELS[position]}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div
          className="space-y-2 rounded-md bg-surface-container p-2 dark:bg-dark-surface-container"
          data-testid="export-frame-range-controls"
        >
          <div className="text-[10px] font-semibold uppercase text-outline dark:text-dark-outline">
            Export Frames
          </div>
          <div className="space-y-1">
            {[
              ['all', 'All frames'],
              ['current', 'Current frame'],
              ['range', 'Custom range'],
            ].map(([value, label]) => (
              <label
                key={value}
                className="flex cursor-pointer items-center gap-2 text-[11px] font-medium text-on-surface dark:text-dark-on-surface"
              >
                <input
                  type="radio"
                  name="export-frame-range-mode"
                  value={value}
                  checked={frameRange.mode === value}
                  onChange={() => onExportFrameRangeChange?.({ mode: value })}
                  className={rangeRadioClass}
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label
              className="space-y-1 text-[10px] font-semibold uppercase text-outline dark:text-dark-outline"
              htmlFor="export-frame-range-start"
            >
              <span>Start</span>
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
                className={compactNumberInputClass}
              />
            </label>
            <label
              className="space-y-1 text-[10px] font-semibold uppercase text-outline dark:text-dark-outline"
              htmlFor="export-frame-range-end"
            >
              <span>End</span>
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
                className={compactNumberInputClass}
              />
            </label>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-1">
          <button
            type="button"
            className={dataButtonClass}
            onClick={onExportText}
          >
            Export Edge List
          </button>
          <button
            type="button"
            className={dataButtonClass}
            data-testid="project-export-button"
            onClick={onExportProject}
          >
            Export Project
          </button>
          <button
            type="button"
            className={dataButtonClass}
            data-testid="svg-export-button"
            onClick={onExportSvg}
          >
            Export SVG
          </button>
          <button
            type="button"
            className={dataButtonClass}
            data-testid="png-export-button"
            onClick={onExportPng}
          >
            Export PNG
          </button>
          <button
            type="button"
            className={dataButtonClass}
            onClick={onExportVideo}
          >
            Export MP4
          </button>
          <button
            type="button"
            className={dataButtonClass}
            data-testid="slideshow-export-button"
            disabled={!totalFrames}
            onClick={onExportSlideshow}
          >
            Export Slideshow
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <SectionTitle>Advanced</SectionTitle>
        <ActionButton className="w-full" onClick={onOpenScript}>
          Script Mode
        </ActionButton>
      </div>

      <div className="mt-auto pt-4">
        <div className="text-center text-[10px] text-outline dark:text-dark-outline">
          {selectedCount} item(s) selected
        </div>
      </div>
    </div>
  );
};

export default LeftSidebar;
