import { useId, useState } from 'react';
import { DEFAULT_CUSTOM_LEGEND } from './lib/customLegend';
import NativeSelect from './NativeSelect';

const TOOL_OPTIONS = [
  { id: 'select', label: 'Select' },
  { id: 'pan', label: 'Pan' },
  { id: 'add', label: 'Add Node' },
  { id: 'draw', label: 'Draw Edge' },
];
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
  'font-manrope text-[11px] font-bold uppercase tracking-[0.14em] text-[#0F2747] dark:text-[#F8FAFC]';
const actionButtonBaseClass =
  'min-h-[44px] rounded-sm border px-2.5 py-2.5 text-xs font-semibold transition-colors md:min-h-9 md:py-2';
const actionButtonDefaultClass =
  'border-[#D7DEE8] bg-[#FFFFFF] text-[#334155] hover:bg-[#EEF2F6] dark:border-[#475569] dark:bg-[#1E293B] dark:text-[#E2E8F0] dark:hover:bg-[#334155]';
const iconButtonClass =
  'flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border border-[#D7DEE8] bg-[#FFFFFF] p-1.5 text-[#334155] transition-colors hover:bg-[#EEF2F6] focus:outline-none focus:ring-2 focus:ring-[#0F2747] disabled:cursor-not-allowed disabled:bg-[#F8F9FA] disabled:text-[#94A3B8] dark:border-[#475569] dark:bg-[#1E293B] dark:text-[#E2E8F0] dark:hover:bg-[#334155] dark:focus:ring-[#60A5FA] dark:disabled:bg-[#111827] dark:disabled:text-[#64748B]';
const fitViewButtonClass =
  'flex h-8 min-w-0 items-center justify-center whitespace-nowrap rounded-sm border border-[#D7DEE8] bg-[#FFFFFF] px-2 text-[11px] font-semibold text-[#334155] transition-colors hover:bg-[#EEF2F6] focus:outline-none focus:ring-2 focus:ring-[#0F2747] disabled:cursor-not-allowed disabled:bg-[#F8F9FA] disabled:text-[#94A3B8] dark:border-[#475569] dark:bg-[#1E293B] dark:text-[#E2E8F0] dark:hover:bg-[#334155] dark:focus:ring-[#60A5FA] dark:disabled:bg-[#111827] dark:disabled:text-[#64748B]';
const toggleRowClass =
  'flex min-h-[44px] cursor-pointer items-center justify-between rounded-sm border border-[#D7DEE8] bg-[#FFFFFF] px-3 py-2 transition-colors hover:bg-[#EEF2F6] dark:border-[#475569] dark:bg-[#1E293B] dark:hover:bg-[#334155] md:min-h-9';
const checkboxClass =
  'h-4 w-4 rounded-sm accent-[#0F2747] focus:ring-[#0F2747] dark:accent-[#3B82F6] dark:focus:ring-[#3B82F6]';
const dataButtonClass =
  'min-h-[44px] rounded-sm border border-[#D7DEE8] bg-[#FFFFFF] py-2 text-xs font-semibold text-[#334155] transition-colors hover:bg-[#EEF2F6] disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#475569] dark:bg-[#1E293B] dark:text-[#E2E8F0] dark:hover:bg-[#334155] md:min-h-9';
const sidebarControlLabelClass =
  'text-[11px] font-medium text-[#475569] dark:text-[#CBD5E1]';
const compactNumberInputClass =
  'h-6 w-10 rounded-sm border border-[#E2E8F0] bg-transparent px-1 text-right font-mono text-[11px] font-semibold tabular-nums text-[#475569] focus:border-[#0F2747] focus:bg-[#FFFFFF] focus:outline-none focus:ring-1 focus:ring-[#0F2747] disabled:cursor-not-allowed disabled:text-[#94A3B8] dark:border-[#334155] dark:text-[#CBD5E1] dark:focus:border-[#60A5FA] dark:focus:bg-[#0F172A] dark:focus:ring-[#60A5FA] dark:disabled:text-[#64748B]';
const helpButtonClass =
  'flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm border border-transparent bg-transparent text-[9px] font-bold leading-none text-[#94A3B8] transition-colors hover:border-[#CBD5E1] hover:text-[#475569] focus:outline-none focus-visible:ring-1 focus-visible:ring-[#0F2747] dark:text-[#64748B] dark:hover:border-[#475569] dark:hover:text-[#CBD5E1] dark:focus-visible:ring-[#60A5FA]';

const joinClasses = (...classes) => classes.filter(Boolean).join(' ');

const SectionTitle = ({ children }) => (
  <div className={sectionTitleClass}>{children}</div>
);

const SidebarSection = ({ children }) => (
  <section className="space-y-2.5 border-b border-[#D7DEE8] py-4 first:pt-0 last:border-b-0 dark:border-[#334155]">
    {children}
  </section>
);

const ActionButton = ({ children, className, ...props }) => (
  <button
    type="button"
    className={joinClasses(
      actionButtonBaseClass,
      actionButtonDefaultClass,
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

const SidebarRangeControl = ({
  label,
  helpText,
  value,
  min,
  max,
  step,
  onChange,
  disabled = false,
}) => {
  const labelId = useId();
  const helpId = useId();
  const [draftValue, setDraftValue] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const displayValue = isEditing ? draftValue : String(value);
  const numericMin = Number(min);
  const numericMax = Number(max);
  const numericStep = Number(step);
  const decimalPlaces = String(step).includes('.')
    ? String(step).split('.')[1].length
    : 0;

  const normalizeValue = rawValue => {
    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed)) return null;
    const clamped = Math.max(numericMin, Math.min(numericMax, parsed));
    if (!Number.isFinite(numericStep) || numericStep <= 0) {
      return Number(clamped.toFixed(decimalPlaces));
    }
    const stepped =
      numericMin +
      Math.round((clamped - numericMin) / numericStep) * numericStep;
    return Number(
      Math.max(numericMin, Math.min(numericMax, stepped)).toFixed(decimalPlaces)
    );
  };

  const commitDraftValue = () => {
    const nextValue = normalizeValue(displayValue);
    if (nextValue === null) {
      setDraftValue('');
      setIsEditing(false);
      return;
    }
    setDraftValue('');
    setIsEditing(false);
    onChange?.(nextValue);
  };

  return (
    <div className="grid grid-cols-[max-content_minmax(64px,1fr)_2.5rem] items-center gap-2 px-1 py-0.5">
      <span className="flex min-w-0 items-center gap-1.5">
        <span id={labelId} className={sidebarControlLabelClass}>
          {label}
        </span>
        {helpText && (
          <span className="relative inline-flex">
            <button
              type="button"
              aria-describedby={helpId}
              aria-expanded={isHelpOpen}
              aria-label={`${label} help`}
              className={helpButtonClass}
              onBlur={() => setIsHelpOpen(false)}
              onClick={() => setIsHelpOpen(true)}
              onFocus={() => setIsHelpOpen(true)}
              onKeyDown={event => {
                if (event.key === 'Escape') setIsHelpOpen(false);
              }}
              onMouseEnter={() => setIsHelpOpen(true)}
              onMouseLeave={() => setIsHelpOpen(false)}
            >
              ?
            </button>
            <span id={helpId} className="sr-only">
              {helpText}
            </span>
            {isHelpOpen && (
              <span
                role="tooltip"
                className="pointer-events-none absolute left-0 top-full z-20 mt-1 w-36 rounded-sm border border-[#CBD5E1] bg-[#FFFFFF] p-2 text-[10px] font-medium normal-case leading-relaxed tracking-normal text-[#334155] shadow-[0_8px_24px_#0F172A1F] dark:border-[#475569] dark:bg-[#0F172A] dark:text-[#E2E8F0]"
              >
                {helpText}
              </span>
            )}
          </span>
        )}
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        aria-labelledby={labelId}
        onChange={event => onChange?.(Number(event.target.value))}
        className={joinClasses(
          'h-1.5 w-full accent-[#0F2747] dark:accent-[#60A5FA]',
          disabled &&
            'cursor-not-allowed accent-[#94A3B8] dark:accent-[#64748B]'
        )}
      />
      <input
        aria-label={`${label} value`}
        className={compactNumberInputClass}
        disabled={disabled}
        inputMode="decimal"
        onBlur={commitDraftValue}
        onChange={event => {
          setIsEditing(true);
          setDraftValue(event.target.value);
        }}
        onFocus={() => {
          setIsEditing(true);
          setDraftValue(String(value));
        }}
        onKeyDown={event => {
          if (event.key === 'Enter') {
            event.currentTarget.blur();
          } else if (event.key === 'Escape') {
            setDraftValue('');
            setIsEditing(false);
            event.currentTarget.blur();
          }
        }}
        type="text"
        value={displayValue}
      />
    </div>
  );
};

const ZoomValueInput = ({ value, disabled, onCommit }) => {
  const [draft, setDraft] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const displayValue = isEditing ? draft : String(value);

  const reset = () => {
    setDraft('');
    setIsEditing(false);
  };
  const commit = () => {
    const parsed = Number(displayValue);
    if (!Number.isFinite(parsed)) {
      reset();
      return;
    }
    const nextValue = Math.round(Math.max(5, Math.min(260, parsed)));
    setDraft('');
    setIsEditing(false);
    onCommit?.(nextValue);
  };

  return (
    <span
      className={joinClasses(
        'box-border flex h-8 w-full min-w-0 items-center justify-center overflow-hidden rounded-sm border border-[#CBD5E1] bg-[#FFFFFF] px-1 text-[#334155] transition-colors focus-within:border-[#0F2747] focus-within:ring-1 focus-within:ring-[#0F2747] dark:border-[#475569] dark:bg-[#0F172A] dark:text-[#E2E8F0] dark:focus-within:border-[#60A5FA] dark:focus-within:ring-[#60A5FA]',
        disabled &&
          'bg-[#F8F9FA] text-[#94A3B8] dark:bg-[#111827] dark:text-[#64748B]'
      )}
      data-testid="zoom-percent-field"
    >
      <span
        className="inline-grid grid-cols-[3ch_auto] items-baseline justify-center gap-0.5 font-mono text-xs font-semibold tabular-nums leading-none text-inherit"
        data-testid="zoom-percent-unit"
      >
        <input
          aria-label="Zoom percent"
          className="w-[3ch] bg-transparent text-right font-mono text-xs font-semibold tabular-nums leading-none text-inherit focus:outline-none disabled:cursor-not-allowed"
          disabled={disabled}
          inputMode="numeric"
          onBlur={commit}
          onChange={event => {
            setIsEditing(true);
            setDraft(event.target.value);
          }}
          onFocus={() => {
            setIsEditing(true);
            setDraft(String(value));
          }}
          onKeyDown={event => {
            if (event.key === 'Enter') {
              event.currentTarget.blur();
            } else if (event.key === 'Escape') {
              reset();
              event.currentTarget.blur();
            }
          }}
          type="text"
          value={displayValue}
        />
        <span aria-hidden="true" className="text-inherit">
          %
        </span>
      </span>
    </span>
  );
};

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

const LeftSidebar = ({
  mode,
  setMode,
  snapEnabled,
  setSnapEnabled,
  showGrid,
  setShowGrid,
  customLegend = DEFAULT_CUSTOM_LEGEND,
  setCustomLegend,
  lockCanvas,
  setLockCanvas,
  onDrawEdge,
  drawFrom,
  onAutoLayout,
  forceStrength = 1,
  onForceStrengthChange,
  onOpenImportMenu,
  onOpenExportMenu,
  onOpenLegendEditor,
  isLegendEditorOpen = false,
  onOpenScript,
  onApplyPreset,
  currentFrame = 0,
  onCenterView,
  zoomPercent,
  onZoomIn,
  onZoomOut,
  onZoomCommit,
}) => {
  const frameNumber = currentFrame + 1;
  const addNodeHelpText = `Click canvas to add a node from Frame ${frameNumber} onward.`;
  const drawEdgeHelpText = `Connect nodes to add an edge from Frame ${frameNumber} onward.`;
  const drawHelpText =
    drawFrom !== null && drawFrom !== undefined
      ? `Source node ${drawFrom} selected. ${drawEdgeHelpText}`
      : drawEdgeHelpText;
  const patchCustomLegend = patch => {
    setCustomLegend?.(prev => ({
      ...DEFAULT_CUSTOM_LEGEND,
      ...(prev ?? {}),
      ...patch,
    }));
  };

  return (
    <div
      className="graphstudio-scroll-panel flex h-full flex-col overflow-auto bg-[#F8F9FA] p-4 text-sm dark:bg-[#111827]"
      data-testid="left-sidebar"
    >
      <SidebarSection>
        <SectionTitle>Tools</SectionTitle>
        <div className="grid grid-cols-2 gap-2">
          {TOOL_OPTIONS.map(tool => (
            <button
              key={tool.id}
              type="button"
              className={joinClasses(
                actionButtonBaseClass,
                mode === tool.id
                  ? 'border-[#0F2747] bg-[#0F2747] text-[#FFFFFF] dark:border-[#2563EB] dark:bg-[#2563EB] dark:text-[#FFFFFF]'
                  : actionButtonDefaultClass
              )}
              aria-pressed={mode === tool.id}
              data-testid={`tool-button-${tool.id}`}
              onClick={() =>
                tool.id === 'draw' ? onDrawEdge() : setMode(tool.id)
              }
            >
              {tool.label}
            </button>
          ))}
        </div>
        {mode === 'add' && (
          <p className="text-[10px] leading-relaxed text-[#64748B] dark:text-[#94A3B8]">
            {addNodeHelpText}
          </p>
        )}
        {mode === 'draw' && (
          <p className="text-[10px] leading-relaxed text-[#64748B] dark:text-[#94A3B8]">
            {drawHelpText}
          </p>
        )}
      </SidebarSection>

      <SidebarSection>
        <SectionTitle>Presets</SectionTitle>
        <NativeSelect
          aria-label="Load graph preset"
          onChange={event => {
            if (event.target.value) onApplyPreset(event.target.value);
            event.target.value = '';
          }}
        >
          <option value="">Load preset...</option>
          {PRESET_OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </NativeSelect>
      </SidebarSection>

      <SidebarSection>
        <SectionTitle>Arrange</SectionTitle>
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
        <SidebarRangeControl
          label="Force strength"
          value={forceStrength}
          min="0.2"
          max="2"
          step="0.1"
          disabled={!onForceStrengthChange}
          onChange={onForceStrengthChange}
        />
      </SidebarSection>

      <SidebarSection>
        <SectionTitle>View &amp; Canvas</SectionTitle>
        <div
          className="grid grid-cols-[minmax(64px,1fr)_32px_54px_32px] items-center gap-1 px-2 py-1.5"
          data-testid="view-canvas-zoom-row"
        >
          <button
            type="button"
            className={fitViewButtonClass}
            aria-label="Fit View"
            title="Fit View"
            data-testid="fit-view-button"
            disabled={lockCanvas}
            onClick={onCenterView}
          >
            Fit View
          </button>
          <IconButton
            title="Zoom Out"
            disabled={lockCanvas}
            onClick={onZoomOut}
          >
            <ZoomOutIcon />
          </IconButton>
          <ZoomValueInput
            disabled={lockCanvas}
            value={zoomPercent}
            onCommit={onZoomCommit}
          />
          <IconButton title="Zoom In" disabled={lockCanvas} onClick={onZoomIn}>
            <ZoomInIcon />
          </IconButton>
        </div>
        <div className="space-y-2">
          <ToggleRow
            label="Show Grid"
            checked={showGrid}
            onChange={setShowGrid}
          />
          <ToggleRow
            label="Snap to Grid"
            checked={snapEnabled}
            onChange={setSnapEnabled}
          />
          <ToggleRow
            label="Lock View"
            checked={lockCanvas}
            onChange={setLockCanvas}
          />
        </div>
      </SidebarSection>

      <SidebarSection>
        <SectionTitle>Legend</SectionTitle>
        <div className="space-y-2.5" data-testid="custom-legend-controls">
          <div className="flex min-h-10 items-center justify-between gap-3 rounded-sm border border-[#D7DEE8] bg-[#FFFFFF] px-3 py-1.5 dark:border-[#475569] dark:bg-[#1E293B]">
            <label className="flex min-w-0 cursor-pointer items-center gap-2 text-xs font-semibold text-[#1E293B] dark:text-[#F8FAFC]">
              <input
                type="checkbox"
                aria-label="Legend"
                checked={Boolean(customLegend.enabled)}
                onChange={event =>
                  patchCustomLegend({ enabled: event.target.checked })
                }
                className={checkboxClass}
              />
              <span className="whitespace-nowrap">Show legend</span>
            </label>
            <button
              type="button"
              aria-haspopup="dialog"
              aria-expanded={isLegendEditorOpen}
              aria-controls="custom-legend-editor"
              data-testid="custom-legend-edit-toggle"
              onClick={onOpenLegendEditor}
              className="min-h-8 shrink-0 rounded-sm border border-[#CBD5E1] bg-[#F8F9FA] px-3 text-xs font-semibold text-[#334155] transition-colors hover:bg-[#EEF2F6] focus:outline-none focus-visible:ring-1 focus-visible:ring-[#0F2747] dark:border-[#64748B] dark:bg-[#0F172A] dark:text-[#E2E8F0] dark:hover:bg-[#334155] dark:focus-visible:ring-[#60A5FA]"
            >
              Edit
            </button>
          </div>
        </div>
      </SidebarSection>

      <SidebarSection>
        <SectionTitle>Data</SectionTitle>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            className={dataButtonClass}
            data-testid="open-import-menu"
            onClick={onOpenImportMenu}
          >
            Import...
          </button>
          <button
            type="button"
            className={dataButtonClass}
            data-testid="open-export-menu"
            onClick={onOpenExportMenu}
          >
            Export...
          </button>
        </div>
      </SidebarSection>

      <SidebarSection>
        <SectionTitle>Advanced</SectionTitle>
        <ActionButton className="w-full" onClick={onOpenScript}>
          Script Mode
        </ActionButton>
      </SidebarSection>
    </div>
  );
};

export default LeftSidebar;
