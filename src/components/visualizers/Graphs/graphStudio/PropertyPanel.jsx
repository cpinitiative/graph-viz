import { useId, useRef, useState } from 'react';
import NativeSelect from './NativeSelect';
import { EDGE_ROUTING } from './constants';
import {
  EDGE_LABEL_FONT_SIZE_RANGE,
  getDefaultEdgeLabelFontSize,
  getDefaultNodeLabelFontSize,
  NODE_LABEL_FONT_SIZE_RANGE,
} from './lib/fontSizing';

const NODE_STATUS_OPTIONS = [
  ['default', 'Default'],
  ['active', 'Active'],
  ['queued', 'Queued'],
  ['visited', 'Visited'],
  ['discarded', 'Discarded'],
];

const panelClass =
  'graphstudio-scroll-panel h-full space-y-5 overflow-y-auto bg-[#F8F9FA] p-4 text-sm dark:bg-[#111827]';
const sectionTitleClass =
  'font-manrope text-[11px] font-bold uppercase tracking-[0.14em] text-[#0F2747] dark:text-[#F8FAFC]';
const bodyTextClass = 'text-xs text-[#334155] dark:text-[#E2E8F0]';
const fieldLabelClass =
  'text-[10px] font-semibold uppercase tracking-[0.08em] text-[#64748B] dark:text-[#94A3B8]';
const scopeLabelClass =
  'shrink-0 text-[10px] font-semibold uppercase tracking-[0.06em] text-[#B45309] dark:text-[#FBBF24]';
const overrideIndicatorClass =
  'text-[10px] font-semibold text-[#B45309] dark:text-[#FBBF24]';
const inlineActionButtonClass =
  'text-[10px] font-bold uppercase tracking-[0.04em] text-[#0F2747] underline-offset-2 hover:underline focus:outline-none focus-visible:ring-1 focus-visible:ring-[#0F2747] dark:text-[#BFDBFE] dark:focus-visible:ring-[#60A5FA]';
const compactNumberInputClass =
  'h-7 w-12 rounded-sm border border-[#E2E8F0] bg-[#F8FAFC] px-1.5 text-right font-mono text-xs font-semibold tabular-nums text-[#475569] focus:border-[#0F2747] focus:bg-[#FFFFFF] focus:outline-none focus:ring-1 focus:ring-[#0F2747] disabled:cursor-not-allowed disabled:bg-[#F8F9FA] disabled:text-[#94A3B8] dark:border-[#334155] dark:bg-[#111827] dark:text-[#CBD5E1] dark:focus:border-[#60A5FA] dark:focus:bg-[#0F172A] dark:focus:ring-[#60A5FA] dark:disabled:bg-[#111827] dark:disabled:text-[#64748B]';
const inputClass =
  'h-10 w-full rounded-sm border border-[#CBD5E1] bg-[#FFFFFF] px-3 py-2 text-xs font-medium text-[#1E293B] transition-colors focus:border-[#0F2747] focus:outline-none focus:ring-1 focus:ring-[#0F2747] dark:border-[#475569] dark:bg-[#1E293B] dark:text-[#F8FAFC] dark:focus:border-[#3B82F6] dark:focus:ring-[#3B82F6]';
const inspectorButtonFocusClass =
  'focus:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[#0F2747] dark:focus-visible:ring-[#60A5FA]';
const actionButtonClass = `min-h-[44px] w-full rounded-sm border border-[#D7DEE8] bg-[#FFFFFF] px-3 py-2.5 text-left text-xs font-semibold text-[#334155] transition-colors hover:bg-[#EEF2F6] dark:border-[#475569] dark:bg-[#1E293B] dark:text-[#E2E8F0] dark:hover:bg-[#334155] md:min-h-9 md:py-2 ${inspectorButtonFocusClass}`;
const headerActionButtonClass =
  '-m-2 flex h-9 w-9 shrink-0 items-center justify-center text-[#64748B] transition-colors hover:bg-[#F1F5F9] hover:text-[#0F172A] focus:outline-none focus-visible:ring-1 focus-visible:ring-[#0F2747] focus-visible:ring-offset-1 dark:text-[#94A3B8] dark:hover:bg-[#1E293B] dark:hover:text-[#F8FAFC] dark:focus-visible:ring-[#60A5FA] dark:focus-visible:ring-offset-[#111827]';
const deleteButtonClass =
  'mt-1 min-h-[44px] w-full rounded-sm border border-[#B91C1C] bg-transparent px-3 py-2.5 text-left text-xs font-bold text-[#B91C1C] transition-colors hover:border-[#B91C1C] hover:bg-[#B91C1C] hover:text-[#FFFFFF] focus:outline-none focus-visible:border-[#B91C1C] focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[#B91C1C] active:bg-[#991B1B] active:text-[#FFFFFF] disabled:cursor-not-allowed disabled:border-[#FCA5A5] disabled:text-[#FCA5A5] dark:border-[#F87171] dark:bg-transparent dark:text-[#FCA5A5] dark:hover:border-[#DC2626] dark:hover:bg-[#DC2626] dark:hover:text-[#FFFFFF] dark:focus-visible:border-[#F87171] dark:focus-visible:ring-[#F87171] dark:active:bg-[#B91C1C] md:min-h-9 md:py-2';
const listButtonClass = `min-h-[44px] w-full whitespace-normal break-words rounded-sm border border-[#D7DEE8] bg-[#FFFFFF] px-2.5 py-2 text-left text-xs leading-relaxed text-[#334155] transition-colors hover:bg-[#EEF2F6] dark:border-[#475569] dark:bg-[#1E293B] dark:text-[#E2E8F0] dark:hover:bg-[#334155] md:min-h-9 md:py-1.5 ${inspectorButtonFocusClass}`;
const toggleRowClass =
  'flex min-h-[44px] cursor-pointer items-center justify-between rounded-sm border border-[#D7DEE8] bg-[#FFFFFF] px-3 py-2 transition-colors hover:bg-[#EEF2F6] dark:border-[#475569] dark:bg-[#1E293B] dark:hover:bg-[#334155] md:min-h-9';
const checkboxClass =
  'h-4 w-4 rounded-sm accent-[#0F2747] focus:ring-[#0F2747] dark:accent-[#3B82F6] dark:focus:ring-[#3B82F6]';
const TOOLTIP_WIDTH = 244;
const TOOLTIP_ESTIMATED_HEIGHT = 40;
const TOOLTIP_GUTTER = 12;
const TOOLTIP_OFFSET = 6;

const joinClasses = (...classes) => classes.filter(Boolean).join(' ');

const ScopeLabel = ({ scope }) => {
  if (!scope) return null;
  return <span className={scopeLabelClass}>{scope}</span>;
};

const FieldMeta = ({ hasOverride, onResetOverride, onApplyToAll }) => {
  if (!hasOverride && !onApplyToAll) return null;

  return (
    <div className="mt-1 flex min-h-4 flex-wrap items-center gap-x-2 gap-y-1">
      {hasOverride && (
        <span className={overrideIndicatorClass}>Current frame override</span>
      )}
      {hasOverride && onResetOverride && (
        <button
          type="button"
          className={inlineActionButtonClass}
          onClick={onResetOverride}
        >
          Reset override
        </button>
      )}
      {onApplyToAll && (
        <button
          type="button"
          className={inlineActionButtonClass}
          onClick={onApplyToAll}
        >
          Apply to all frames
        </button>
      )}
    </div>
  );
};

const ClearSelectionButton = ({ label, onClick }) => {
  if (!onClick) return null;

  return (
    <button
      type="button"
      className={headerActionButtonClass}
      aria-label={label}
      data-testid="inspector-clear-selection"
      onClick={onClick}
    >
      <svg
        aria-hidden="true"
        className="block"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    </button>
  );
};

const InfoHelp = ({ label, text }) => {
  const tooltipId = useId();
  const buttonRef = useRef(null);
  const [tooltipPosition, setTooltipPosition] = useState(null);

  const showTooltip = () => {
    const bounds = buttonRef.current?.getBoundingClientRect();
    if (!bounds) return;

    const panelBounds = buttonRef.current
      ?.closest('[data-testid="property-panel"]')
      ?.getBoundingClientRect();
    const viewportMinLeft = TOOLTIP_GUTTER;
    const viewportMaxLeft = Math.max(
      TOOLTIP_GUTTER,
      window.innerWidth - TOOLTIP_WIDTH - TOOLTIP_GUTTER
    );
    const panelMinLeft = panelBounds
      ? Math.max(viewportMinLeft, panelBounds.left + TOOLTIP_GUTTER)
      : viewportMinLeft;
    const panelMaxLeft = panelBounds
      ? Math.min(
          viewportMaxLeft,
          panelBounds.right - TOOLTIP_WIDTH - TOOLTIP_GUTTER
        )
      : viewportMaxLeft;
    const preferredLeft = bounds.left - TOOLTIP_WIDTH + bounds.width;
    const fallbackLeft = panelBounds
      ? panelBounds.right - TOOLTIP_WIDTH - TOOLTIP_GUTTER
      : viewportMaxLeft;
    const left = Math.min(
      viewportMaxLeft,
      Math.max(
        viewportMinLeft,
        panelMaxLeft >= panelMinLeft
          ? Math.min(panelMaxLeft, Math.max(panelMinLeft, preferredLeft))
          : Math.min(fallbackLeft, viewportMaxLeft)
      )
    );
    const belowTop = bounds.bottom + TOOLTIP_OFFSET;
    const aboveTop = bounds.top - TOOLTIP_ESTIMATED_HEIGHT - TOOLTIP_OFFSET;
    const top =
      belowTop + TOOLTIP_ESTIMATED_HEIGHT <= window.innerHeight - TOOLTIP_GUTTER
        ? belowTop
        : Math.max(TOOLTIP_GUTTER, aboveTop);

    setTooltipPosition({ left, top });
  };

  const hideTooltip = () => setTooltipPosition(null);

  return (
    <span className="inline-flex items-center">
      <button
        ref={buttonRef}
        type="button"
        className="flex h-4 w-4 items-center justify-center rounded-sm border border-[#CBD5E1] bg-transparent text-[9px] font-bold leading-none text-[#64748B] transition-colors hover:border-[#94A3B8] hover:text-[#334155] focus:outline-none focus-visible:ring-1 focus-visible:ring-[#0F2747] dark:border-[#475569] dark:text-[#94A3B8] dark:hover:text-[#E2E8F0] dark:focus-visible:ring-[#60A5FA]"
        aria-label={label}
        aria-describedby={tooltipId}
        onBlur={hideTooltip}
        onFocus={showTooltip}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
      >
        ?
      </button>
      <span id={tooltipId} className="sr-only">
        {text}
      </span>
      {tooltipPosition && (
        <span
          role="tooltip"
          className="pointer-events-none fixed z-50 w-[244px] whitespace-nowrap border border-[#CBD5E1] bg-[#FFFFFF] p-2 text-[10px] font-medium normal-case leading-relaxed tracking-normal text-[#334155] shadow-[0_8px_24px_#0F172A1F] dark:border-[#475569] dark:bg-[#0F172A] dark:text-[#E2E8F0]"
          data-testid="inspector-info-tooltip"
          style={{
            left: `${tooltipPosition.left}px`,
            top: `${tooltipPosition.top}px`,
          }}
        >
          {text}
        </span>
      )}
    </span>
  );
};

const PanelShell = ({ title, inspectorType, headerAction, children }) => (
  <div
    className={panelClass}
    data-testid="property-panel"
    data-inspector-type={inspectorType}
  >
    <div className="flex items-center justify-between gap-3 border-b border-[#D7DEE8] pb-3 dark:border-[#334155]">
      <div className={sectionTitleClass}>{title}</div>
      {headerAction}
    </div>
    {children}
  </div>
);

const Section = ({ title, help, children }) => (
  <section className="space-y-3 border-b border-[#D7DEE8] pb-5 last:border-b-0 dark:border-[#334155]">
    <div className="flex items-center gap-2">
      <div className={sectionTitleClass}>{title}</div>
      {help}
    </div>
    {children}
  </section>
);

const Field = ({
  label,
  scope,
  hasOverride,
  onResetOverride,
  onApplyToAll,
  children,
}) => (
  <div className="block space-y-1.5">
    <div className="flex items-center justify-between gap-2">
      <span className={fieldLabelClass}>{label}</span>
      <ScopeLabel scope={scope} />
    </div>
    {children}
    <FieldMeta
      hasOverride={hasOverride}
      onResetOverride={onResetOverride}
      onApplyToAll={onApplyToAll}
    />
  </div>
);

const TextInput = ({ value, onChange, placeholder }) => (
  <input
    className={inputClass}
    value={value}
    onChange={event => onChange(event.target.value)}
    placeholder={placeholder}
  />
);

const ColorField = ({
  label,
  value,
  fallback,
  placeholder,
  scope,
  hasOverride,
  onResetOverride,
  onApplyToAll,
  onChange,
}) => (
  <Field
    label={label}
    scope={scope}
    hasOverride={hasOverride}
    onResetOverride={onResetOverride}
    onApplyToAll={onApplyToAll}
  >
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={value.startsWith('#') ? value : fallback}
        onChange={event => onChange(event.target.value)}
        className="h-10 w-10 cursor-pointer rounded bg-transparent p-0 md:h-8 md:w-8"
      />
      <TextInput value={value} onChange={onChange} placeholder={placeholder} />
    </div>
  </Field>
);

const ToggleRow = ({
  label,
  checked,
  scope,
  hasOverride,
  onResetOverride,
  onApplyToAll,
  onChange,
}) => (
  <div className="space-y-1">
    <label className={toggleRowClass}>
      <span className="flex min-w-0 items-center gap-2">
        <span className={fieldLabelClass}>{label}</span>
        <ScopeLabel scope={scope} />
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={event => onChange(event.target.checked)}
        className={checkboxClass}
      />
    </label>
    <FieldMeta
      hasOverride={hasOverride}
      onResetOverride={onResetOverride}
      onApplyToAll={onApplyToAll}
    />
  </div>
);

const ActionButton = ({ children, className, ...props }) => (
  <button
    type="button"
    className={joinClasses(actionButtonClass, className)}
    {...props}
  >
    {children}
  </button>
);

const DeleteButton = ({ children, onClick }) => (
  <button type="button" className={deleteButtonClass} onClick={onClick}>
    {children}
  </button>
);

const RangeControl = ({
  label,
  value,
  min,
  max,
  step,
  onChange,
  disabled = false,
  help,
  scope,
}) => {
  const labelId = useId();
  const [draftValue, setDraftValue] = useState('');
  const [isEditing, setIsEditing] = useState(false);
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
    onChange(nextValue);
  };

  return (
    <div className="space-y-1">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
        <span className="flex min-w-0 items-center gap-2">
          <span id={labelId} className={`${fieldLabelClass} truncate`}>
            {label}
          </span>
          <ScopeLabel scope={scope} />
          {help}
        </span>
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
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        aria-labelledby={labelId}
        onChange={event => onChange(Number(event.target.value))}
        className={joinClasses(
          'h-1.5 w-full accent-[#0F2747] dark:accent-[#60A5FA]',
          disabled &&
            'cursor-not-allowed accent-[#94A3B8] dark:accent-[#64748B]'
        )}
      />
    </div>
  );
};

const NumberControl = ({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  suffix,
  testId,
  scope,
}) => {
  const labelId = useId();
  const [draftValue, setDraftValue] = useState('');
  const [isEditing, setIsEditing] = useState(false);
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
    onChange(nextValue);
  };

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
      <span className="flex min-w-0 items-center gap-2">
        <span id={labelId} className={`${fieldLabelClass} truncate`}>
          {label}
        </span>
        <ScopeLabel scope={scope} />
      </span>
      <span className="flex items-center gap-1">
        <input
          aria-labelledby={labelId}
          className={compactNumberInputClass}
          data-testid={testId}
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
        {suffix && (
          <span className="w-4 text-left text-[10px] font-semibold text-[#64748B] dark:text-[#94A3B8]">
            {suffix}
          </span>
        )}
      </span>
    </div>
  );
};

const LinkedList = ({ items, emptyLabel, renderItem, onSelect }) => {
  if (!items?.length) {
    return (
      <div className="text-xs italic text-[#64748B] dark:text-[#94A3B8]">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {items.map(item => (
        <button
          key={item.id}
          type="button"
          className={listButtonClass}
          onClick={() => onSelect?.(item.id)}
        >
          {renderItem(item)}
        </button>
      ))}
    </div>
  );
};

const MultiSelectionPanel = ({
  selectedCount,
  onApplyToSelection,
  onDeleteSelection,
  onClearSelection,
}) => (
  <PanelShell
    title="Selection Inspector"
    inspectorType="selection"
    headerAction={
      <ClearSelectionButton
        label="Clear selection"
        onClick={onClearSelection}
      />
    }
  >
    <Section title="Selected Nodes">
      <p className={bodyTextClass}>{selectedCount} items selected</p>
      <div className="space-y-2">
        <ActionButton onClick={() => onApplyToSelection({ status: 'visited' })}>
          Set visited
        </ActionButton>
        <ActionButton onClick={() => onApplyToSelection({ status: 'active' })}>
          Set active
        </ActionButton>
        <ActionButton onClick={() => onApplyToSelection({ color: '#22c55e' })}>
          Color green
        </ActionButton>
        <DeleteButton onClick={onDeleteSelection}>
          Delete from project
        </DeleteButton>
      </div>
    </Section>
  </PanelShell>
);

const NodeInspector = ({
  selectedNode,
  connectedEdges,
  frameOverrides = {},
  onUpdateNode,
  onResetOverride,
  onApplyToAllFrames,
  onSelectEdge,
  onDeleteSelection,
  onClearSelection,
}) => {
  const nodeColor = selectedNode.color ?? '';
  const nodeStatus = String(selectedNode.status ?? 'default');
  const nodeVisible = selectedNode.visible !== false;

  return (
    <PanelShell
      title="Node Properties"
      inspectorType="node"
      headerAction={
        <ClearSelectionButton
          label="Clear node selection"
          onClick={onClearSelection}
        />
      }
    >
      <Section title="Node Details">
        <div className="space-y-4">
          <Field label="Label" scope="All frames">
            <TextInput
              value={selectedNode.label ?? ''}
              onChange={value => onUpdateNode({ label: value })}
            />
          </Field>
          <Field label="Position" scope="All frames">
            <div className="border border-[#D7DEE8] bg-[#FFFFFF] px-3 py-2 font-mono text-xs font-semibold tabular-nums text-[#475569] dark:border-[#475569] dark:bg-[#1E293B] dark:text-[#CBD5E1]">
              X {Math.round(selectedNode.x)} / Y {Math.round(selectedNode.y)}
            </div>
          </Field>
          <Field
            label="Status / Style"
            scope="Current frame"
            hasOverride={frameOverrides.status}
            onResetOverride={() => onResetOverride?.('status')}
            onApplyToAll={() => onApplyToAllFrames?.({ status: nodeStatus })}
          >
            <NativeSelect
              value={nodeStatus}
              onChange={event => onUpdateNode({ status: event.target.value })}
            >
              {NODE_STATUS_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <ColorField
            label="Color"
            value={nodeColor}
            fallback="#3b82f6"
            placeholder="#22c55e or blank"
            scope="Current frame"
            hasOverride={frameOverrides.color}
            onResetOverride={() => onResetOverride?.('color')}
            onApplyToAll={() => onApplyToAllFrames?.({ color: nodeColor })}
            onChange={value => onUpdateNode({ color: value })}
          />
          <ToggleRow
            label="Visible"
            checked={nodeVisible}
            scope="Current frame"
            hasOverride={frameOverrides.visible}
            onResetOverride={() => onResetOverride?.('visible')}
            onApplyToAll={() => onApplyToAllFrames?.({ visible: nodeVisible })}
            onChange={checked => onUpdateNode({ visible: checked })}
          />
        </div>
      </Section>

      <Section title="Connected Edges">
        <LinkedList
          items={connectedEdges}
          emptyLabel="No connected edges"
          onSelect={onSelectEdge}
          renderItem={edge => {
            const label = edge.label ? ` • w:${edge.label}` : '';
            const direction = edge.directed ? '→' : '—';
            return (
              <>
                {edge.id}: {edge.from} {direction} {edge.to}
                {label}
              </>
            );
          }}
        />
      </Section>

      <DeleteButton onClick={onDeleteSelection}>
        Delete from project
      </DeleteButton>
    </PanelShell>
  );
};

const EdgeInspector = ({
  selectedEdge,
  connectedNodes,
  frameOverrides = {},
  onUpdateEdge,
  onResetOverride,
  onApplyToAllFrames,
  onSelectNode,
  onDeleteSelection,
  onClearSelection,
}) => {
  const edgeColor = selectedEdge.color ?? '#64748b';
  const edgeVisible = selectedEdge.visible !== false;

  return (
    <PanelShell
      title="Edge Properties"
      inspectorType="edge"
      headerAction={
        <ClearSelectionButton
          label="Clear edge selection"
          onClick={onClearSelection}
        />
      }
    >
      <Section title="Edge Details">
        <div className="space-y-4">
          <Field label="Weight / Label" scope="All frames">
            <TextInput
              value={selectedEdge.label ?? ''}
              onChange={value => onUpdateEdge({ label: value })}
              placeholder="e.g. 7"
            />
          </Field>
          <ToggleRow
            label="Directed"
            checked={Boolean(selectedEdge.directed)}
            scope="All frames"
            onChange={checked => onUpdateEdge({ directed: checked })}
          />
          <ColorField
            label="Color"
            value={edgeColor}
            fallback="#64748b"
            placeholder="#64748b"
            scope="Current frame"
            hasOverride={frameOverrides.color}
            onResetOverride={() => onResetOverride?.('color')}
            onApplyToAll={() => onApplyToAllFrames?.({ color: edgeColor })}
            onChange={value => onUpdateEdge({ color: value })}
          />
          <ToggleRow
            label="Visible"
            checked={edgeVisible}
            scope="Current frame"
            hasOverride={frameOverrides.visible}
            onResetOverride={() => onResetOverride?.('visible')}
            onApplyToAll={() => onApplyToAllFrames?.({ visible: edgeVisible })}
            onChange={checked => onUpdateEdge({ visible: checked })}
          />
        </div>
      </Section>

      <Section title="Connected Nodes">
        <LinkedList
          items={connectedNodes}
          emptyLabel="No connected nodes"
          onSelect={onSelectNode}
          renderItem={node => (
            <>
              {node.label ?? node.id} (id: {node.id})
            </>
          )}
        />
      </Section>

      <DeleteButton onClick={onDeleteSelection}>
        Delete from project
      </DeleteButton>
    </PanelShell>
  );
};

const GlobalSettingsPanel = ({
  globalSettings,
  edgeRouting,
  onUpdateGlobal,
}) => {
  const curveAmountEnabled = edgeRouting === EDGE_ROUTING.bezier;

  return (
    <PanelShell title="Canvas Inspector" inspectorType="canvas">
      <Section title="Canvas Settings">
        <div className="space-y-3">
          <Field label="Routing" scope="Project-wide">
            <div className="border border-[#D7DEE8] bg-[#FFFFFF] px-3 py-2 text-xs font-semibold text-[#475569] dark:border-[#475569] dark:bg-[#1E293B] dark:text-[#CBD5E1]">
              {edgeRouting === EDGE_ROUTING.bezier ? 'Curved' : 'Straight'}
            </div>
          </Field>
          <RangeControl
            label="Gravity (force)"
            scope="Project-wide"
            value={globalSettings.forceStrength}
            min="0.2"
            max="2"
            step="0.1"
            onChange={forceStrength => onUpdateGlobal({ forceStrength })}
          />
          <RangeControl
            label="Curve Amount"
            scope="Project-wide"
            value={globalSettings.edgeCurvature}
            min="0"
            max="120"
            step="5"
            disabled={!curveAmountEnabled}
            help={
              <InfoHelp
                label="Curve Amount help"
                text="Only affects Curved edge routing"
              />
            }
            onChange={edgeCurvature => onUpdateGlobal({ edgeCurvature })}
          />
          <RangeControl
            label="Node size"
            scope="Project-wide"
            value={globalSettings.nodeSize ?? 22}
            min="12"
            max="44"
            step="1"
            onChange={nodeSize => onUpdateGlobal({ nodeSize })}
          />
          <NumberControl
            label="Node Label Size"
            scope="Project-wide"
            value={
              globalSettings.nodeLabelFontSize ??
              getDefaultNodeLabelFontSize(globalSettings.nodeSize)
            }
            min={NODE_LABEL_FONT_SIZE_RANGE.min}
            max={NODE_LABEL_FONT_SIZE_RANGE.max}
            step="1"
            testId="node-label-font-size-input"
            onChange={nodeLabelFontSize =>
              onUpdateGlobal({ nodeLabelFontSize })
            }
          />
          <RangeControl
            label="Edge width"
            scope="Project-wide"
            value={globalSettings.edgeWidth ?? 2.2}
            min="1"
            max="8"
            step="0.2"
            onChange={edgeWidth => onUpdateGlobal({ edgeWidth })}
          />
          <NumberControl
            label="Edge Label Size"
            scope="Project-wide"
            value={
              globalSettings.edgeLabelFontSize ??
              getDefaultEdgeLabelFontSize(globalSettings.edgeWidth)
            }
            min={EDGE_LABEL_FONT_SIZE_RANGE.min}
            max={EDGE_LABEL_FONT_SIZE_RANGE.max}
            step="1"
            testId="edge-label-font-size-input"
            onChange={edgeLabelFontSize =>
              onUpdateGlobal({ edgeLabelFontSize })
            }
          />
        </div>
      </Section>
      <div className="border border-[#D7DEE8] bg-[#FFFFFF] p-3 dark:border-[#475569] dark:bg-[#1E293B]">
        <div className="text-center text-xs text-[#475569] dark:text-[#CBD5E1]">
          Select a node or edge to open its inspector.
        </div>
      </div>
    </PanelShell>
  );
};

const PropertyPanel = ({
  selectedNode,
  selectedEdge,
  connectedEdges,
  connectedNodes,
  multiSelection,
  globalSettings,
  edgeRouting,
  nodeFrameOverrides,
  edgeFrameOverrides,
  onUpdateNode,
  onUpdateEdge,
  onResetNodeOverride,
  onResetEdgeOverride,
  onApplyNodeToAllFrames,
  onApplyEdgeToAllFrames,
  onSelectEdge,
  onSelectNode,
  onApplyToSelection,
  onDeleteSelection,
  onClearSelection,
  onUpdateGlobal,
}) => {
  if (multiSelection.length > 1) {
    return (
      <MultiSelectionPanel
        selectedCount={multiSelection.length}
        onApplyToSelection={onApplyToSelection}
        onDeleteSelection={onDeleteSelection}
        onClearSelection={onClearSelection}
      />
    );
  }

  if (selectedNode) {
    return (
      <NodeInspector
        selectedNode={selectedNode}
        connectedEdges={connectedEdges}
        frameOverrides={nodeFrameOverrides}
        onUpdateNode={onUpdateNode}
        onResetOverride={onResetNodeOverride}
        onApplyToAllFrames={onApplyNodeToAllFrames}
        onSelectEdge={onSelectEdge}
        onDeleteSelection={onDeleteSelection}
        onClearSelection={onClearSelection}
      />
    );
  }

  if (selectedEdge) {
    return (
      <EdgeInspector
        selectedEdge={selectedEdge}
        connectedNodes={connectedNodes}
        frameOverrides={edgeFrameOverrides}
        onUpdateEdge={onUpdateEdge}
        onResetOverride={onResetEdgeOverride}
        onApplyToAllFrames={onApplyEdgeToAllFrames}
        onSelectNode={onSelectNode}
        onDeleteSelection={onDeleteSelection}
        onClearSelection={onClearSelection}
      />
    );
  }

  return (
    <GlobalSettingsPanel
      globalSettings={globalSettings}
      edgeRouting={edgeRouting}
      onUpdateGlobal={onUpdateGlobal}
    />
  );
};

export default PropertyPanel;
