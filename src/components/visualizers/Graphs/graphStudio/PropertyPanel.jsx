import { useId, useState } from 'react';
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
const panelEyebrowClass =
  'font-manrope text-[11px] font-bold uppercase tracking-[0.14em] text-[#0F2747] dark:text-[#F8FAFC]';
const panelContextClass =
  'font-manrope text-sm font-bold text-[#0F2747] dark:text-[#F8FAFC]';
const sectionTitleClass =
  'font-manrope text-xs font-bold text-[#0F2747] dark:text-[#F8FAFC]';
const bodyTextClass = 'text-xs text-[#334155] dark:text-[#E2E8F0]';
const fieldLabelClass =
  'text-[10px] font-semibold uppercase tracking-[0.08em] text-[#64748B] dark:text-[#94A3B8]';
const sectionDescriptionClass =
  'mt-0.5 text-[10px] font-medium leading-relaxed text-[#64748B] dark:text-[#94A3B8]';
const overrideIndicatorClass =
  'text-[10px] font-semibold text-[#7C2D12] dark:text-[#FDBA74]';
const inlineActionButtonClass =
  'inline-flex min-h-6 items-center rounded-sm border border-[#CBD5E1] bg-[#FFFFFF] px-2 py-1 text-[10px] font-semibold normal-case leading-none tracking-normal text-[#334155] transition-colors hover:bg-[#EEF2F6] focus:outline-none focus-visible:ring-1 focus-visible:ring-[#0F2747] dark:border-[#475569] dark:bg-[#1E293B] dark:text-[#CBD5E1] dark:hover:bg-[#334155] dark:focus-visible:ring-[#60A5FA]';
const compactNumberInputClass =
  'h-7 w-12 rounded-sm border border-[#E2E8F0] bg-[#F8FAFC] px-1.5 text-right font-mono text-xs font-semibold tabular-nums text-[#475569] focus:border-[#0F2747] focus:bg-[#FFFFFF] focus:outline-none focus:ring-1 focus:ring-[#0F2747] disabled:cursor-not-allowed disabled:bg-[#F8F9FA] disabled:text-[#94A3B8] dark:border-[#334155] dark:bg-[#111827] dark:text-[#CBD5E1] dark:focus:border-[#60A5FA] dark:focus:bg-[#0F172A] dark:focus:ring-[#60A5FA] dark:disabled:bg-[#111827] dark:disabled:text-[#64748B]';
const inputClass =
  'h-10 w-full rounded-sm border border-[#CBD5E1] bg-[#FFFFFF] px-3 py-2 text-xs font-medium text-[#1E293B] transition-colors focus:border-[#0F2747] focus:outline-none focus:ring-1 focus:ring-[#0F2747] dark:border-[#475569] dark:bg-[#1E293B] dark:text-[#F8FAFC] dark:focus:border-[#3B82F6] dark:focus:ring-[#3B82F6]';
const inspectorButtonFocusClass =
  'focus:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[#0F2747] dark:focus-visible:ring-[#60A5FA]';
const actionButtonClass = `min-h-[44px] w-full rounded-sm border border-[#D7DEE8] bg-[#FFFFFF] px-3 py-2.5 text-left text-xs font-semibold text-[#334155] transition-colors hover:bg-[#EEF2F6] dark:border-[#475569] dark:bg-[#1E293B] dark:text-[#E2E8F0] dark:hover:bg-[#334155] md:min-h-9 md:py-2 ${inspectorButtonFocusClass}`;
const visibilityActionButtonClass = `min-h-8 rounded-sm border border-[#CBD5E1] bg-[#FFFFFF] px-2 py-1.5 text-center text-[10px] font-semibold text-[#334155] transition-colors hover:bg-[#EEF2F6] dark:border-[#475569] dark:bg-[#1E293B] dark:text-[#CBD5E1] dark:hover:bg-[#334155] ${inspectorButtonFocusClass}`;
const headerActionButtonClass =
  '-m-2 flex h-9 w-9 shrink-0 items-center justify-center text-[#64748B] transition-colors hover:bg-[#F1F5F9] hover:text-[#0F172A] focus:outline-none focus-visible:ring-1 focus-visible:ring-[#0F2747] focus-visible:ring-offset-1 dark:text-[#94A3B8] dark:hover:bg-[#1E293B] dark:hover:text-[#F8FAFC] dark:focus-visible:ring-[#60A5FA] dark:focus-visible:ring-offset-[#111827]';
const deleteButtonClass =
  'mt-1 min-h-[44px] w-full rounded-sm border border-[#B91C1C] bg-transparent px-3 py-2.5 text-left text-xs font-bold text-[#B91C1C] transition-colors hover:border-[#B91C1C] hover:bg-[#B91C1C] hover:text-[#FFFFFF] focus:outline-none focus-visible:border-[#B91C1C] focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[#B91C1C] active:bg-[#991B1B] active:text-[#FFFFFF] disabled:cursor-not-allowed disabled:border-[#FCA5A5] disabled:text-[#FCA5A5] dark:border-[#F87171] dark:bg-transparent dark:text-[#FCA5A5] dark:hover:border-[#DC2626] dark:hover:bg-[#DC2626] dark:hover:text-[#FFFFFF] dark:focus-visible:border-[#F87171] dark:focus-visible:ring-[#F87171] dark:active:bg-[#B91C1C] md:min-h-9 md:py-2';
const listButtonClass = `min-h-[44px] w-full whitespace-normal break-words rounded-sm border border-[#D7DEE8] bg-[#FFFFFF] px-2.5 py-2 text-left text-xs leading-relaxed text-[#334155] transition-colors hover:bg-[#EEF2F6] dark:border-[#475569] dark:bg-[#1E293B] dark:text-[#E2E8F0] dark:hover:bg-[#334155] md:min-h-9 md:py-1.5 ${inspectorButtonFocusClass}`;
const toggleRowClass =
  'flex min-h-[44px] cursor-pointer items-center justify-between rounded-sm border border-[#D7DEE8] bg-[#FFFFFF] px-3 py-2 transition-colors hover:bg-[#EEF2F6] dark:border-[#475569] dark:bg-[#1E293B] dark:hover:bg-[#334155] md:min-h-9';
const checkboxClass =
  'h-4 w-4 rounded-sm accent-[#0F2747] focus:ring-[#0F2747] dark:accent-[#3B82F6] dark:focus:ring-[#3B82F6]';

const joinClasses = (...classes) => classes.filter(Boolean).join(' ');

const FieldMeta = ({ hasOverride, onResetOverride, onApplyToAll }) => {
  if (!hasOverride) return null;

  return (
    <div className="mt-2 flex min-h-6 flex-wrap items-center justify-between gap-2">
      <span className={overrideIndicatorClass}>Different on this frame</span>
      <span className="ml-auto flex flex-wrap items-center justify-end gap-1.5">
        {onResetOverride && (
          <button
            type="button"
            className={inlineActionButtonClass}
            onClick={onResetOverride}
          >
            Use project value
          </button>
        )}
        {onApplyToAll && (
          <button
            type="button"
            className={inlineActionButtonClass}
            onClick={onApplyToAll}
          >
            Use on every frame
          </button>
        )}
      </span>
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

const PanelShell = ({ title, inspectorType, headerAction, children }) => (
  <div
    className={panelClass}
    data-testid="property-panel"
    data-inspector-type={inspectorType}
  >
    <div className="border-b border-[#D7DEE8] pb-3 dark:border-[#334155]">
      <div className={panelEyebrowClass}>INSPECTOR</div>
      <div className="mt-1 flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
          <div className={`${panelContextClass} min-w-0`}>{title}</div>
        </div>
        {headerAction}
      </div>
    </div>
    {children}
  </div>
);

const Section = ({ title, description, help, children }) => (
  <section className="space-y-3">
    <div>
      <div className="flex items-baseline gap-2">
        <div className={sectionTitleClass}>{title}</div>
        {help}
      </div>
      {description && (
        <div className={sectionDescriptionClass}>{description}</div>
      )}
    </div>
    {children}
  </section>
);

const Field = ({
  label,
  hasOverride,
  onResetOverride,
  onApplyToAll,
  children,
}) => (
  <div className="block space-y-1.5">
    <div className="flex min-w-0 items-center justify-between gap-2">
      <span className={`${fieldLabelClass} min-w-0 truncate`}>{label}</span>
    </div>
    {children}
    <FieldMeta
      hasOverride={hasOverride}
      onResetOverride={onResetOverride}
      onApplyToAll={onApplyToAll}
    />
  </div>
);

const TextInput = ({ value, onChange, placeholder, ariaLabel }) => (
  <input
    aria-label={ariaLabel}
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
  hasOverride,
  onResetOverride,
  onApplyToAll,
  onChange,
}) => (
  <Field
    label={label}
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
      <TextInput
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        ariaLabel={label}
      />
    </div>
  </Field>
);

const ToggleRow = ({
  label,
  checked,
  hasOverride,
  onResetOverride,
  onApplyToAll,
  onChange,
}) => (
  <div className="space-y-1">
    <label className={toggleRowClass}>
      <span className={`${fieldLabelClass} min-w-0 truncate`}>{label}</span>
      <span className="flex shrink-0 items-center">
        <input
          type="checkbox"
          checked={checked}
          onChange={event => onChange(event.target.checked)}
          className={checkboxClass}
        />
      </span>
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

const DeleteButton = ({ children, onClick, title, ariaLabel }) => (
  <button
    type="button"
    className={deleteButtonClass}
    aria-label={ariaLabel}
    title={title}
    onClick={onClick}
  >
    {children}
  </button>
);

const PresenceNotice = ({ children }) => (
  <div
    className="border border-[#CBD5E1] bg-[#FFFFFF] px-3 py-2 text-xs font-semibold leading-snug text-[#0F2747] dark:border-[#475569] dark:bg-[#1E293B] dark:text-[#E2E8F0]"
    data-testid="presence-status-notice"
  >
    {children}
  </div>
);

const VisibilityControl = ({
  visible,
  frameNumber,
  selectedCount = 0,
  notShownCount = 0,
  hasOverride = false,
  onResetOverride,
  onSetVisibilityForFrame,
  onSetVisibilityFromFrame,
  onSetVisibilityForAll,
}) => {
  const [changeScope, setChangeScope] = useState('frame');
  const isSelection = selectedCount > 0;
  const shownCount = Math.max(0, selectedCount - notShownCount);
  const currentState = isSelection
    ? `${shownCount} of ${selectedCount} shown on Frame ${frameNumber}`
    : `${visible ? 'Shown' : 'Hidden'} on Frame ${frameNumber}`;
  const scopePhrase =
    changeScope === 'following'
      ? 'on this and following frames'
      : changeScope === 'all'
        ? 'on every frame'
        : 'on this frame';
  const applyVisibility = nextVisible => {
    if (changeScope === 'following') {
      onSetVisibilityFromFrame?.(nextVisible);
    } else if (changeScope === 'all') {
      onSetVisibilityForAll?.(nextVisible);
    } else {
      onSetVisibilityForFrame?.(nextVisible);
    }
  };
  const actionLabel = action =>
    `${action}${isSelection ? ' selected nodes' : ''} ${scopePhrase}`;

  return (
    <div className="space-y-2" data-testid="visibility-control">
      <div className="flex min-w-0 items-center justify-between gap-2">
        <span className={`${fieldLabelClass} min-w-0 truncate`}>
          Visibility
        </span>
        <span className="text-[10px] font-medium text-[#64748B] dark:text-[#94A3B8]">
          {currentState}
        </span>
      </div>
      <label className="block space-y-1.5">
        <span className="text-[10px] font-medium text-[#64748B] dark:text-[#94A3B8]">
          Change applies to
        </span>
        <NativeSelect
          aria-label="Visibility change scope"
          value={changeScope}
          onChange={event => setChangeScope(event.target.value)}
          size="dense"
        >
          <option value="frame">This frame</option>
          <option value="following">This and following frames</option>
          {onSetVisibilityForAll && <option value="all">Every frame</option>}
        </NativeSelect>
      </label>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          className={visibilityActionButtonClass}
          aria-label={actionLabel('Hide')}
          title={actionLabel('Hide')}
          onClick={() => applyVisibility(false)}
        >
          Hide
        </button>
        <button
          type="button"
          className={visibilityActionButtonClass}
          aria-label={actionLabel('Show')}
          title={actionLabel('Show')}
          onClick={() => applyVisibility(true)}
        >
          Show
        </button>
      </div>
      <FieldMeta hasOverride={hasOverride} onResetOverride={onResetOverride} />
    </div>
  );
};

const RangeControl = ({
  label,
  value,
  min,
  max,
  step,
  onChange,
  disabled = false,
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
  notShownCount = 0,
  frameNumber,
  onApplyToSelection,
  onSetVisibilityForFrame,
  onSetVisibilityFromFrame,
  onDeleteSelection,
  onClearSelection,
}) => (
  <PanelShell
    title="Selection"
    inspectorType="selection"
    headerAction={
      <ClearSelectionButton
        label="Clear selection"
        onClick={onClearSelection}
      />
    }
  >
    <Section
      title={`Appearance on Frame ${frameNumber}`}
      description="Changes in this section affect only this frame."
    >
      <p className={bodyTextClass}>{selectedCount} nodes selected</p>
      <VisibilityControl
        frameNumber={frameNumber}
        selectedCount={selectedCount}
        notShownCount={notShownCount}
        onSetVisibilityForFrame={onSetVisibilityForFrame}
        onSetVisibilityFromFrame={onSetVisibilityFromFrame}
      />
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
        <DeleteButton
          ariaLabel="Delete selected nodes from project"
          title="Remove selected nodes and their connected edges from the entire project."
          onClick={onDeleteSelection}
        >
          Delete from project
        </DeleteButton>
      </div>
    </Section>
  </PanelShell>
);

const NodeInspector = ({
  selectedNode,
  connectedEdges,
  currentFrame = 0,
  frameOverrides = {},
  onUpdateNode,
  onResetOverride,
  onApplyToAllFrames,
  onSetVisibilityForFrame,
  onSetVisibilityFromFrame,
  onSelectEdge,
  onDeleteSelection,
  onClearSelection,
}) => {
  const nodeColor = selectedNode.color ?? '';
  const nodeStatus = String(selectedNode.status ?? 'default');
  const nodeVisible = selectedNode.visible !== false;
  const frameNumber = currentFrame + 1;
  const connectedEdgeCount = connectedEdges.length;
  const deleteTitle = connectedEdgeCount
    ? `Remove this node and its ${connectedEdgeCount} connected ${
        connectedEdgeCount === 1 ? 'edge' : 'edges'
      } from the entire project.`
    : 'Remove this node from the entire project.';
  const deleteAriaLabel = connectedEdgeCount
    ? `Delete node and ${connectedEdgeCount} connected ${
        connectedEdgeCount === 1 ? 'edge' : 'edges'
      } from project`
    : 'Delete node from project';

  return (
    <PanelShell
      title="Node properties"
      inspectorType="node"
      headerAction={
        <ClearSelectionButton
          label="Clear node selection"
          onClick={onClearSelection}
        />
      }
    >
      <Section title="Project details" description="Shared by every frame.">
        <Field label="Label">
          <TextInput
            value={selectedNode.label ?? ''}
            onChange={value => onUpdateNode({ label: value })}
            ariaLabel="Label"
          />
        </Field>
        <Field label="Position">
          <div className="border border-[#D7DEE8] bg-[#FFFFFF] px-3 py-2 font-mono text-xs font-semibold tabular-nums text-[#475569] dark:border-[#475569] dark:bg-[#1E293B] dark:text-[#CBD5E1]">
            X {Math.round(selectedNode.x)} / Y {Math.round(selectedNode.y)}
          </div>
        </Field>
      </Section>

      <Section
        title={`Appearance on Frame ${frameNumber}`}
        description="Changes in this section affect only this frame."
      >
        {!nodeVisible && (
          <PresenceNotice>
            Node {selectedNode.id} is hidden on Frame {frameNumber}
          </PresenceNotice>
        )}
        <Field
          label="Status / Style"
          hasOverride={frameOverrides.status}
          onResetOverride={() => onResetOverride?.('status')}
          onApplyToAll={() => onApplyToAllFrames?.({ status: nodeStatus })}
        >
          <NativeSelect
            aria-label="Status / Style"
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
          hasOverride={frameOverrides.color}
          onResetOverride={() => onResetOverride?.('color')}
          onApplyToAll={() => onApplyToAllFrames?.({ color: nodeColor })}
          onChange={value => onUpdateNode({ color: value })}
        />
        <VisibilityControl
          visible={nodeVisible}
          frameNumber={frameNumber}
          hasOverride={frameOverrides.visible}
          onResetOverride={() => onResetOverride?.('visible')}
          onSetVisibilityForFrame={onSetVisibilityForFrame}
          onSetVisibilityFromFrame={onSetVisibilityFromFrame}
          onSetVisibilityForAll={visible => onApplyToAllFrames?.({ visible })}
        />
      </Section>

      <Section title={`Connected edges (${connectedEdgeCount})`}>
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

      <DeleteButton
        ariaLabel={deleteAriaLabel}
        title={deleteTitle}
        onClick={onDeleteSelection}
      >
        Delete from project
      </DeleteButton>
    </PanelShell>
  );
};

const EdgeInspector = ({
  selectedEdge,
  connectedNodes,
  currentFrame = 0,
  frameOverrides = {},
  onUpdateEdge,
  onResetOverride,
  onApplyToAllFrames,
  onSetVisibilityForFrame,
  onSetVisibilityFromFrame,
  onSelectNode,
  onDeleteSelection,
  onClearSelection,
}) => {
  const edgeColor = selectedEdge.color ?? '#64748b';
  const edgeVisible = selectedEdge.visible !== false;
  const frameNumber = currentFrame + 1;
  const notShownEndpointNodes = connectedNodes.filter(
    node => node?.visible === false
  );
  const endpointLabel =
    notShownEndpointNodes.length === 1
      ? `Node ${notShownEndpointNodes[0].id}`
      : 'an endpoint';
  const edgePresenceNotice = !edgeVisible
    ? `Edge ${selectedEdge.id} is hidden on Frame ${frameNumber}`
    : notShownEndpointNodes.length > 0
      ? `Edge ${selectedEdge.id} is hidden because ${endpointLabel} is hidden on Frame ${frameNumber}`
      : '';

  return (
    <PanelShell
      title="Edge properties"
      inspectorType="edge"
      headerAction={
        <ClearSelectionButton
          label="Clear edge selection"
          onClick={onClearSelection}
        />
      }
    >
      <Section title="Project details" description="Shared by every frame.">
        <Field label="Weight / Label">
          <TextInput
            value={selectedEdge.label ?? ''}
            onChange={value => onUpdateEdge({ label: value })}
            placeholder="e.g. 7"
            ariaLabel="Weight / Label"
          />
        </Field>
        <ToggleRow
          label="Directed"
          checked={Boolean(selectedEdge.directed)}
          onChange={checked => onUpdateEdge({ directed: checked })}
        />
      </Section>

      <Section
        title={`Appearance on Frame ${frameNumber}`}
        description="Changes in this section affect only this frame."
      >
        {edgePresenceNotice && (
          <PresenceNotice>{edgePresenceNotice}</PresenceNotice>
        )}
        <ColorField
          label="Color"
          value={edgeColor}
          fallback="#64748b"
          placeholder="#64748b"
          hasOverride={frameOverrides.color}
          onResetOverride={() => onResetOverride?.('color')}
          onApplyToAll={() => onApplyToAllFrames?.({ color: edgeColor })}
          onChange={value => onUpdateEdge({ color: value })}
        />
        <VisibilityControl
          visible={edgeVisible}
          frameNumber={frameNumber}
          hasOverride={frameOverrides.visible}
          onResetOverride={() => onResetOverride?.('visible')}
          onSetVisibilityForFrame={onSetVisibilityForFrame}
          onSetVisibilityFromFrame={onSetVisibilityFromFrame}
          onSetVisibilityForAll={visible => onApplyToAllFrames?.({ visible })}
        />
      </Section>

      <Section title="Connected nodes">
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

      <DeleteButton
        ariaLabel="Delete edge from project"
        title="Remove this edge from the entire project."
        onClick={onDeleteSelection}
      >
        Delete from project
      </DeleteButton>
    </PanelShell>
  );
};

const GlobalSettingsPanel = ({
  globalSettings,
  edgeRouting,
  onEdgeRoutingChange,
  onUpdateGlobal,
}) => {
  const isCurvedRouting = edgeRouting === EDGE_ROUTING.bezier;

  return (
    <PanelShell title="Canvas settings" inspectorType="canvas">
      <div className="space-y-3">
        <Field label="Edge routing">
          <NativeSelect
            value={edgeRouting}
            aria-label="Edge routing"
            onChange={event => onEdgeRoutingChange?.(event.target.value)}
          >
            <option value={EDGE_ROUTING.straight}>Straight</option>
            <option value={EDGE_ROUTING.bezier}>Curved</option>
          </NativeSelect>
        </Field>
        {isCurvedRouting && (
          <RangeControl
            label="Curve Amount"
            value={globalSettings.edgeCurvature}
            min="0"
            max="120"
            step="5"
            onChange={edgeCurvature => onUpdateGlobal({ edgeCurvature })}
          />
        )}
        <RangeControl
          label="Node size"
          value={globalSettings.nodeSize ?? 22}
          min="12"
          max="44"
          step="1"
          onChange={nodeSize => onUpdateGlobal({ nodeSize })}
        />
        <NumberControl
          label="Node Label Size"
          value={
            globalSettings.nodeLabelFontSize ??
            getDefaultNodeLabelFontSize(globalSettings.nodeSize)
          }
          min={NODE_LABEL_FONT_SIZE_RANGE.min}
          max={NODE_LABEL_FONT_SIZE_RANGE.max}
          step="1"
          testId="node-label-font-size-input"
          onChange={nodeLabelFontSize => onUpdateGlobal({ nodeLabelFontSize })}
        />
        <RangeControl
          label="Edge width"
          value={globalSettings.edgeWidth ?? 2.2}
          min="1"
          max="8"
          step="0.2"
          onChange={edgeWidth => onUpdateGlobal({ edgeWidth })}
        />
        <NumberControl
          label="Edge Label Size"
          value={
            globalSettings.edgeLabelFontSize ??
            getDefaultEdgeLabelFontSize(globalSettings.edgeWidth)
          }
          min={EDGE_LABEL_FONT_SIZE_RANGE.min}
          max={EDGE_LABEL_FONT_SIZE_RANGE.max}
          step="1"
          testId="edge-label-font-size-input"
          onChange={edgeLabelFontSize => onUpdateGlobal({ edgeLabelFontSize })}
        />
      </div>
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
  currentFrame = 0,
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
  onSetNodeVisibilityForFrame,
  onSetNodeVisibilityFromFrame,
  onSetEdgeVisibilityForFrame,
  onSetEdgeVisibilityFromFrame,
  multiSelectionNotShownCount,
  onSetSelectionVisibilityForFrame,
  onSetSelectionVisibilityFromFrame,
  onSelectEdge,
  onSelectNode,
  onApplyToSelection,
  onDeleteSelection,
  onClearSelection,
  onUpdateGlobal,
  onEdgeRoutingChange,
}) => {
  if (multiSelection.length > 1) {
    return (
      <MultiSelectionPanel
        selectedCount={multiSelection.length}
        notShownCount={multiSelectionNotShownCount}
        frameNumber={currentFrame + 1}
        onApplyToSelection={onApplyToSelection}
        onSetVisibilityForFrame={onSetSelectionVisibilityForFrame}
        onSetVisibilityFromFrame={onSetSelectionVisibilityFromFrame}
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
        currentFrame={currentFrame}
        frameOverrides={nodeFrameOverrides}
        onUpdateNode={onUpdateNode}
        onResetOverride={onResetNodeOverride}
        onApplyToAllFrames={onApplyNodeToAllFrames}
        onSetVisibilityForFrame={onSetNodeVisibilityForFrame}
        onSetVisibilityFromFrame={onSetNodeVisibilityFromFrame}
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
        currentFrame={currentFrame}
        frameOverrides={edgeFrameOverrides}
        onUpdateEdge={onUpdateEdge}
        onResetOverride={onResetEdgeOverride}
        onApplyToAllFrames={onApplyEdgeToAllFrames}
        onSetVisibilityForFrame={onSetEdgeVisibilityForFrame}
        onSetVisibilityFromFrame={onSetEdgeVisibilityFromFrame}
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
      onEdgeRoutingChange={onEdgeRoutingChange}
    />
  );
};

export default PropertyPanel;
