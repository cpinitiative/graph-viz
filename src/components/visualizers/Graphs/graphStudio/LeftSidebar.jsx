const MODE_OPTIONS = ['select', 'pan', 'draw'];
const LAYOUT_OPTIONS = [
  ['circle', 'Circle'],
  ['tree', 'Tree'],
  ['force', 'Force'],
];
const PRESET_OPTIONS = [
  ['bfs', 'BFS Preset'],
  ['dfs', 'DFS Preset'],
  ['dijkstra', 'Dijkstra Preset'],
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
  'min-h-[44px] rounded bg-surface-container py-2 text-[10px] text-on-surface transition-colors hover:bg-surface-container-high dark:bg-dark-surface-container dark:text-dark-on-surface dark:hover:bg-dark-surface-container-high md:min-h-0 md:py-1.5 md:text-[10px]';

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
  lockCanvas,
  setLockCanvas,
  onAddNode,
  onDrawEdge,
  drawFrom,
  onAutoLayout,
  onOpenParser,
  onExportText,
  onExportVideo,
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
  const drawHelpText =
    drawFrom !== null && drawFrom !== undefined
      ? `Source: node ${drawFrom}. Click the target node.`
      : 'Click the source node, then the target node. Select two nodes first to connect them instantly.';

  return (
    <div className="flex h-full flex-col gap-4 overflow-auto bg-surface-container-low p-4 text-sm dark:bg-dark-surface md:gap-6 md:p-6">
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
        {mode === 'draw' && (
          <p className="text-[10px] leading-snug text-outline dark:text-dark-outline">
            {drawHelpText}
          </p>
        )}
      </div>

      <div className="space-y-3">
        <SectionTitle>View</SectionTitle>
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
      </div>

      <div className="space-y-3">
        <SectionTitle>Canvas</SectionTitle>
        <div className="space-y-2">
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
          <div className="rounded-md bg-surface-container p-3 dark:bg-dark-surface-container md:p-2">
            <div className="mb-1.5 text-xs text-on-surface dark:text-dark-on-surface">
              Edge Routing
            </div>
            <select
              value={routing}
              onChange={event => setRouting(event.target.value)}
              className="w-full rounded-md border border-outline-variant/30 bg-white px-2 py-2 text-xs text-on-surface focus:border-primary focus:outline-none focus:ring-0 dark:border-dark-outline-variant/30 dark:bg-gray-800 dark:text-dark-on-surface md:py-1.5"
            >
              <option value="straight">Straight</option>
              <option value="bezier">Bezier Avoid</option>
            </select>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <SectionTitle>Data</SectionTitle>
        <div className="grid grid-cols-2 gap-1 rounded-md bg-surface-container p-2 dark:bg-dark-surface-container md:p-2">
          <button
            type="button"
            className={dataButtonClass}
            onClick={onOpenParser}
          >
            Import
          </button>
          <button
            type="button"
            className={dataButtonClass}
            onClick={onExportText}
          >
            Export
          </button>
          <button
            type="button"
            className={joinClasses(dataButtonClass, 'col-span-2')}
            onClick={onExportVideo}
          >
            Export MP4
          </button>
          <button
            type="button"
            className={joinClasses(dataButtonClass, 'col-span-2')}
            onClick={onOpenScript}
          >
            Script Mode
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <SectionTitle>Presets</SectionTitle>
        <select
          onChange={event => {
            if (event.target.value) onApplyPreset(event.target.value);
            event.target.value = '';
          }}
          className="w-full rounded-md border border-outline-variant/30 bg-surface-container px-3 py-2 text-xs text-on-surface focus:border-primary focus:outline-none focus:ring-0 dark:border-dark-outline-variant/30 dark:bg-dark-surface-container dark:text-dark-on-surface md:py-2"
        >
          <option value="">Load a preset...</option>
          {PRESET_OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
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
