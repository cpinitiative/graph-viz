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
  ['bfs', 'Breadth-First Search (BFS)'],
  ['dfs', 'Depth-First Search (DFS)'],
  ['topological-sort', 'Topological Sort'],
  ['disjoint-set-union', 'Disjoint Set Union (DSU)'],
  ['connected-components', 'Connected Components'],
  ['kruskal-mst', 'Kruskal Minimum Spanning Tree'],
  ['dijkstra', 'Dijkstra — Compact Example'],
  ['dijkstra-shortest-paths', 'Dijkstra — Worked Shortest Paths'],
  ['multigraph', 'Multigraph and Self-Loop'],
];

const sectionTitleClass =
  'font-manrope text-[11px] font-bold uppercase tracking-[0.14em] text-[#0F2747] dark:text-[#F8FAFC]';
const actionButtonBaseClass =
  'min-h-[44px] rounded-sm border px-2.5 py-2.5 text-xs font-semibold transition-colors md:min-h-9 md:py-2';
const actionButtonDefaultClass =
  'border-[#D7DEE8] bg-[#FFFFFF] text-[#334155] hover:bg-[#EEF2F6] dark:border-[#475569] dark:bg-[#1E293B] dark:text-[#E2E8F0] dark:hover:bg-[#334155]';
const toolButtonClass =
  'relative flex items-center justify-center text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0F2747] focus-visible:ring-offset-1 focus-visible:ring-offset-[#F8F9FA] disabled:cursor-not-allowed disabled:border-[#D7DEE8] disabled:bg-[#F8F9FA] disabled:text-[#94A3B8] dark:focus-visible:ring-[#60A5FA] dark:focus-visible:ring-offset-[#111827] dark:disabled:border-[#334155] dark:disabled:bg-[#111827] dark:disabled:text-[#64748B]';
const toolButtonActiveClass =
  'border-[#1D4ED8] bg-[#0F2747] font-bold text-[#FFFFFF] shadow-none ring-1 ring-inset ring-[#93C5FD] hover:bg-[#12345F] dark:border-[#60A5FA] dark:bg-[#1E3A8A] dark:text-[#FFFFFF] dark:ring-[#3B82F6] dark:hover:bg-[#1D4ED8]';
const iconButtonClass =
  'flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border border-[#D7DEE8] bg-[#FFFFFF] p-1.5 text-[#334155] transition-colors hover:bg-[#EEF2F6] focus:outline-none focus:ring-2 focus:ring-[#0F2747] disabled:cursor-not-allowed disabled:bg-[#F8F9FA] disabled:text-[#94A3B8] dark:border-[#475569] dark:bg-[#1E293B] dark:text-[#E2E8F0] dark:hover:bg-[#334155] dark:focus:ring-[#60A5FA] dark:disabled:bg-[#111827] dark:disabled:text-[#64748B]';
const fitViewButtonClass =
  'flex h-9 min-w-0 items-center justify-center whitespace-nowrap rounded-sm border border-[#D7DEE8] bg-[#FFFFFF] px-2 text-xs font-semibold text-[#334155] transition-colors hover:bg-[#EEF2F6] focus:outline-none focus:ring-2 focus:ring-[#0F2747] disabled:cursor-not-allowed disabled:bg-[#F8F9FA] disabled:text-[#94A3B8] dark:border-[#475569] dark:bg-[#1E293B] dark:text-[#E2E8F0] dark:hover:bg-[#334155] dark:focus:ring-[#60A5FA] dark:disabled:bg-[#111827] dark:disabled:text-[#64748B]';
const toggleRowClass =
  'flex min-h-[44px] cursor-pointer items-center justify-between rounded-sm border border-[#D7DEE8] bg-[#FFFFFF] px-3 py-2 transition-colors hover:bg-[#EEF2F6] dark:border-[#475569] dark:bg-[#1E293B] dark:hover:bg-[#334155] md:min-h-9';
const lockRowBaseClass =
  'flex min-h-[44px] cursor-pointer items-center justify-between rounded-sm border px-3 py-2 transition-colors md:min-h-10';
const checkboxClass =
  'h-4 w-4 rounded-sm accent-[#0F2747] focus:ring-[#0F2747] dark:accent-[#3B82F6] dark:focus:ring-[#3B82F6]';
const dataButtonClass =
  'min-h-[44px] rounded-sm border border-[#D7DEE8] bg-[#FFFFFF] py-2 text-xs font-semibold text-[#334155] transition-colors hover:bg-[#EEF2F6] disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#475569] dark:bg-[#1E293B] dark:text-[#E2E8F0] dark:hover:bg-[#334155] md:min-h-9';
const historyButtonClass =
  'flex min-h-8 items-center justify-between gap-2 rounded-sm border border-[#D7DEE8] bg-[#FFFFFF] px-2.5 py-1.5 text-xs font-semibold text-[#334155] transition-colors hover:bg-[#EEF2F6] focus:outline-none focus-visible:ring-1 focus-visible:ring-[#0F2747] disabled:cursor-not-allowed disabled:bg-[#F8F9FA] disabled:text-[#94A3B8] dark:border-[#475569] dark:bg-[#1E293B] dark:text-[#E2E8F0] dark:hover:bg-[#334155] dark:focus-visible:ring-[#60A5FA] dark:disabled:bg-[#111827] dark:disabled:text-[#64748B]';
const sidebarControlLabelClass =
  'text-[11px] font-medium text-[#475569] dark:text-[#CBD5E1]';
const compactNumberInputClass =
  'h-6 w-10 rounded-sm border border-[#E2E8F0] bg-transparent px-1 text-center font-mono text-[11px] font-semibold tabular-nums leading-none text-[#475569] focus:border-[#0F2747] focus:bg-[#FFFFFF] focus:outline-none focus:ring-1 focus:ring-[#0F2747] disabled:cursor-not-allowed disabled:text-[#94A3B8] dark:border-[#334155] dark:text-[#CBD5E1] dark:focus:border-[#60A5FA] dark:focus:bg-[#0F172A] dark:focus:ring-[#60A5FA] dark:disabled:text-[#64748B]';
const helpButtonClass =
  'flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm border border-transparent bg-transparent text-[9px] font-bold leading-none text-[#94A3B8] transition-colors hover:border-[#CBD5E1] hover:text-[#475569] focus:outline-none focus-visible:ring-1 focus-visible:ring-[#0F2747] dark:text-[#64748B] dark:hover:border-[#475569] dark:hover:text-[#CBD5E1] dark:focus-visible:ring-[#60A5FA]';

const joinClasses = (...classes) => classes.filter(Boolean).join(' ');

const formatSavedTime = value => {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
};

const LocalDraftStatus = ({ status = { state: 'idle' } }) => {
  const isError = status.state === 'error';
  const label =
    status.state === 'pending'
      ? 'Recovery draft found'
      : status.state === 'saving'
        ? 'Saving local draft…'
        : status.state === 'saved'
          ? `Saved locally${formatSavedTime(status.savedAt) ? ` · ${formatSavedTime(status.savedAt)}` : ''}`
          : isError
            ? status.message
            : 'Local recovery ready';

  return (
    <div
      className={joinClasses(
        'flex items-start gap-2 px-1 text-[10px] font-medium leading-relaxed',
        isError
          ? 'text-[#B91C1C] dark:text-[#FCA5A5]'
          : 'text-[#64748B] dark:text-[#94A3B8]'
      )}
      data-testid="local-draft-status"
      role={isError ? 'alert' : 'status'}
      aria-live="polite"
    >
      <span
        aria-hidden="true"
        className={joinClasses(
          'mt-1 h-1.5 w-1.5 shrink-0 rounded-full',
          isError
            ? 'bg-[#DC2626] dark:bg-[#F87171]'
            : status.state === 'saving' || status.state === 'pending'
              ? 'bg-[#D97706] dark:bg-[#FBBF24]'
              : 'bg-[#059669] dark:bg-[#34D399]'
        )}
      />
      <span>{label}</span>
    </div>
  );
};

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

const LockViewControl = ({ checked, onChange }) => (
  <label
    className={joinClasses(
      lockRowBaseClass,
      checked
        ? 'border-[#A66A00] bg-[#FFF7ED] text-[#0F2747] shadow-[inset_3px_0_0_#A66A00] dark:border-[#F59E0B] dark:bg-[#1E293B] dark:text-[#F8FAFC]'
        : 'border-[#D7DEE8] bg-[#FFFFFF] text-[#334155] hover:bg-[#EEF2F6] dark:border-[#475569] dark:bg-[#1E293B] dark:text-[#E2E8F0] dark:hover:bg-[#334155]'
    )}
    data-testid="lock-view-control"
  >
    <span className="min-w-0">
      <span className="block text-xs font-semibold">Lock View</span>
      {checked && (
        <span
          className="mt-0.5 block text-[10px] font-bold uppercase tracking-[0.12em] text-[#A66A00] dark:text-[#FBBF24]"
          data-testid="view-lock-indicator"
        >
          View locked
        </span>
      )}
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
    <div
      className="grid grid-cols-[max-content_minmax(64px,88px)_2.5rem] items-center justify-start gap-2 px-1 py-0.5"
      data-testid={`${label.toLowerCase().replace(/\s+/g, '-')}-control`}
    >
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
  const [draft, setDraft] = useState(null);
  const displayValue = draft ?? String(value);

  const reset = () => {
    setDraft(null);
  };
  const commit = rawValue => {
    const parsed = Number(String(rawValue).replace(/%/g, '').trim());
    if (!Number.isFinite(parsed)) {
      reset();
      return;
    }
    const nextValue = Math.round(Math.max(5, Math.min(260, parsed)));
    setDraft(null);
    onCommit?.(nextValue);
  };

  return (
    <span
      className={joinClasses(
        'relative box-border flex h-9 w-16 min-w-0 items-center justify-center overflow-hidden rounded-sm border border-[#CBD5E1] bg-[#FFFFFF] px-1 text-[#334155] transition-colors focus-within:border-[#0F2747] focus-within:ring-1 focus-within:ring-[#0F2747] dark:border-[#475569] dark:bg-[#0F172A] dark:text-[#E2E8F0] dark:focus-within:border-[#60A5FA] dark:focus-within:ring-[#60A5FA]',
        disabled &&
          'bg-[#F8F9FA] text-[#94A3B8] dark:bg-[#111827] dark:text-[#64748B]'
      )}
      data-testid="zoom-percent-field"
    >
      <input
        aria-label="Zoom percent"
        className="peer h-full w-full bg-transparent text-center font-mono text-xs font-semibold tabular-nums leading-none text-transparent focus:text-inherit focus:outline-none disabled:cursor-not-allowed"
        disabled={disabled}
        inputMode="numeric"
        onBlur={event => commit(event.currentTarget.value)}
        onChange={event => {
          setDraft(event.target.value);
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
      {draft === null && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex items-center justify-center font-mono text-xs font-semibold tabular-nums leading-none text-inherit peer-focus:hidden"
          data-testid="zoom-percent-value"
        >
          {value}%
        </span>
      )}
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
  modeGuidance = null,
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
  onAutoLayout,
  forceStrength = 1,
  onForceStrengthChange,
  onOpenImportMenu,
  onOpenExportMenu,
  onOpenLegendEditor,
  isLegendEditorOpen = false,
  onOpenScript,
  onApplyPreset,
  onCenterView,
  zoomPercent,
  onZoomIn,
  onZoomOut,
  onZoomCommit,
  draftStatus,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
}) => {
  const fitViewTitle = lockCanvas
    ? 'Unlock view to change the viewport'
    : 'Fit View';
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
                toolButtonClass,
                mode === tool.id
                  ? toolButtonActiveClass
                  : actionButtonDefaultClass
              )}
              aria-pressed={mode === tool.id}
              disabled={lockCanvas && tool.id === 'pan'}
              title={
                lockCanvas && tool.id === 'pan'
                  ? 'Unlock view to pan'
                  : undefined
              }
              data-active={mode === tool.id ? 'true' : 'false'}
              data-testid={`tool-button-${tool.id}`}
              onClick={() =>
                tool.id === 'draw' ? onDrawEdge() : setMode(tool.id)
              }
            >
              <span className="truncate">{tool.label}</span>
            </button>
          ))}
        </div>
        <div className="min-h-4">
          {modeGuidance && (
            <p
              className="text-[10px] font-medium leading-4 text-[#64748B] dark:text-[#94A3B8]"
              data-testid="tool-mode-guidance"
              aria-label={`${modeGuidance.modeLabel}. ${modeGuidance.accessibleAction ?? modeGuidance.action}`}
              aria-live="polite"
            >
              {modeGuidance.action}
            </p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            className={historyButtonClass}
            disabled={!canUndo}
            onClick={onUndo}
            title="Undo (Ctrl/Command+Z)"
          >
            <span>Undo</span>
            <span aria-hidden="true" className="text-sm opacity-60">
              ←
            </span>
          </button>
          <button
            type="button"
            className={historyButtonClass}
            disabled={!canRedo}
            onClick={onRedo}
            title="Redo (Ctrl/Command+Shift+Z)"
          >
            <span>Redo</span>
            <span aria-hidden="true" className="text-sm opacity-60">
              →
            </span>
          </button>
        </div>
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
        <p className="px-1 text-[10px] font-medium leading-relaxed text-[#64748B] dark:text-[#94A3B8]">
          Worked examples include explanatory frames and a teaching legend.
        </p>
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
        <p
          className="px-1 text-[10px] font-medium leading-snug text-[#64748B] dark:text-[#94A3B8]"
          data-testid="force-strength-guidance"
        >
          Applied on the next Force pass.
        </p>
      </SidebarSection>

      <SidebarSection>
        <SectionTitle>View &amp; Canvas</SectionTitle>
        <LockViewControl checked={lockCanvas} onChange={setLockCanvas} />
        <div
          className="grid grid-cols-[minmax(72px,1fr)_36px_64px_36px] items-center gap-1 py-1.5"
          data-testid="view-canvas-zoom-row"
        >
          <button
            type="button"
            className={fitViewButtonClass}
            aria-label="Fit View"
            title={fitViewTitle}
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
        {lockCanvas && (
          <p
            className="text-[10px] font-semibold leading-relaxed text-[#A66A00] dark:text-[#FBBF24]"
            data-testid="viewport-lock-helper"
          >
            Unlock view to change the viewport
          </p>
        )}
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
        <LocalDraftStatus status={draftStatus} />
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
