import { useEffect, useRef } from 'react';
import {
  CUSTOM_LEGEND_FALLBACK_COLOR,
  CUSTOM_LEGEND_KINDS,
  CUSTOM_LEGEND_POSITION_LABELS,
  CUSTOM_LEGEND_POSITIONS,
  DEFAULT_CUSTOM_LEGEND,
  LEGEND_MODES,
} from '../lib/customLegend';
import NativeSelect from '../NativeSelect';
import ModalFrame, {
  modalPrimaryButtonClass,
  modalSecondaryButtonClass,
} from './ModalFrame';

const CUSTOM_LEGEND_KIND_LABELS = {
  node: 'Node',
  edge: 'Edge',
};

const inputClass =
  'h-10 w-full rounded-sm border border-[#CBD5E1] bg-[#FFFFFF] px-3 py-2 text-sm text-[#1E293B] focus:border-[#0F2747] focus:outline-none focus:ring-1 focus:ring-[#0F2747] dark:border-[#475569] dark:bg-[#1E293B] dark:text-[#F8FAFC] dark:focus:border-[#3B82F6] dark:focus:ring-[#3B82F6]';
const entryInputClass =
  'h-8 w-full rounded-sm border border-[#CBD5E1] bg-[#FFFFFF] px-2 py-1 text-xs text-[#1E293B] focus:border-[#0F2747] focus:outline-none focus:ring-1 focus:ring-[#0F2747] dark:border-[#475569] dark:bg-[#1E293B] dark:text-[#F8FAFC] dark:focus:border-[#3B82F6] dark:focus:ring-[#3B82F6]';
const fieldLabelClass =
  'text-[10px] font-semibold uppercase tracking-[0.12em] text-[#475569] dark:text-[#CBD5E1]';
const dataButtonClass =
  'min-h-8 rounded-sm border border-[#CBD5E1] bg-[#FFFFFF] px-3 py-2 text-xs font-semibold text-[#334155] transition-colors hover:bg-[#EEF2F6] focus:outline-none focus-visible:ring-1 focus-visible:ring-[#0F2747] dark:border-[#475569] dark:bg-[#1E293B] dark:text-[#E2E8F0] dark:hover:bg-[#334155] dark:focus-visible:ring-[#60A5FA]';
const dangerButtonClass =
  'min-h-8 rounded-sm border border-[#B91C1C] bg-transparent px-2 text-xs font-semibold text-[#B91C1C] transition-colors hover:bg-[#B91C1C] hover:text-[#FFFFFF] focus:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[#B91C1C] dark:border-[#F87171] dark:text-[#FCA5A5] dark:hover:bg-[#DC2626] dark:hover:text-[#FFFFFF] dark:focus-visible:ring-[#F87171]';
const reorderButtonClass =
  'flex h-8 w-8 items-center justify-center rounded-sm border border-[#CBD5E1] bg-[#FFFFFF] text-xs font-bold text-[#334155] transition-colors hover:bg-[#EEF2F6] focus:outline-none focus-visible:ring-1 focus-visible:ring-[#0F2747] disabled:cursor-not-allowed disabled:border-[#E2E8F0] disabled:bg-[#F1F5F9] disabled:text-[#94A3B8] disabled:hover:bg-[#F1F5F9] dark:border-[#475569] dark:bg-[#1E293B] dark:text-[#E2E8F0] dark:hover:bg-[#334155] dark:focus-visible:ring-[#60A5FA] dark:disabled:border-[#334155] dark:disabled:bg-[#111827] dark:disabled:text-[#64748B] dark:disabled:hover:bg-[#111827]';

const LEGEND_ENTRY_ID_FIELD = '__legendEntryEditorId';
const legendEntryIdCache = new WeakMap();
let legendEntryIdCounter = 0;

const createLegendEntryId = index => `legend-entry-${index.toString(36)}`;

const getNextLegendEntryId = () => {
  legendEntryIdCounter += 1;
  return createLegendEntryId(legendEntryIdCounter);
};

const getLegendEntryId = entry => {
  if (entry && typeof entry === 'object') {
    if (typeof entry[LEGEND_ENTRY_ID_FIELD] === 'string') {
      return entry[LEGEND_ENTRY_ID_FIELD];
    }
    const cachedId = legendEntryIdCache.get(entry);
    if (cachedId) return cachedId;
    const nextId = getNextLegendEntryId();
    legendEntryIdCache.set(entry, nextId);
    return nextId;
  }
  return getNextLegendEntryId();
};

const withLegendEntryId = (entry, entryId = getLegendEntryId(entry)) => ({
  ...(entry ?? {}),
  [LEGEND_ENTRY_ID_FIELD]: entryId,
});

const getLegendEntriesWithIds = entries =>
  Array.isArray(entries) ? entries.map(entry => withLegendEntryId(entry)) : [];

const findLegendEntryIndexById = (entries, entryId) =>
  entries.findIndex(entry => getLegendEntryId(entry) === entryId);

const MoveUpIcon = () => (
  <svg
    aria-hidden="true"
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 19V5" />
    <path d="M5 12l7-7 7 7" />
  </svg>
);

const MoveDownIcon = () => (
  <svg
    aria-hidden="true"
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 5v14" />
    <path d="M19 12l-7 7-7-7" />
  </svg>
);

const LegendModal = ({
  open,
  customLegend = DEFAULT_CUSTOM_LEGEND,
  setCustomLegend,
  resolvedLegend,
  visualStates = [],
  onAddVisualState,
  onUpdateVisualState,
  onMoveVisualState,
  onRemoveVisualState,
  onClose,
}) => {
  const pendingNewEntryFocusRef = useRef(false);
  const pendingReorderFocusRef = useRef(null);

  const legend = {
    ...DEFAULT_CUSTOM_LEGEND,
    ...(customLegend ?? {}),
  };
  const legendEntries = Array.isArray(legend.entries) ? legend.entries : [];

  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = event => {
      if (event.key === 'Escape') onClose?.();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, open]);

  useEffect(() => {
    if (!open || !pendingNewEntryFocusRef.current) return undefined;
    const frame = window.requestAnimationFrame(() => {
      pendingNewEntryFocusRef.current = false;
      document
        .querySelector('[data-testid="custom-legend-entry-label-0"]')
        ?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [customLegend, open]);

  useEffect(() => {
    if (!open || !pendingReorderFocusRef.current) return undefined;
    const frame = window.requestAnimationFrame(() => {
      const pendingFocus = pendingReorderFocusRef.current;
      pendingReorderFocusRef.current = null;
      if (!pendingFocus) return;

      const entryElement = document.querySelector(
        `[data-legend-entry-id="${pendingFocus.entryId}"]`
      );
      const preferredButton = entryElement?.querySelector(
        `[data-legend-reorder-action="${pendingFocus.action}"]:not(:disabled)`
      );
      const fallbackAction = pendingFocus.action === 'down' ? 'up' : 'down';
      const fallbackButton = entryElement?.querySelector(
        `[data-legend-reorder-action="${fallbackAction}"]:not(:disabled)`
      );
      const fallbackInput = entryElement?.querySelector(
        'input:not(:disabled), select:not(:disabled), button:not(:disabled)'
      );
      (preferredButton ?? fallbackButton ?? fallbackInput)?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [customLegend, open]);

  if (!open) return null;

  const legendEntryRows = legendEntries.map((entry, index) => ({
    entry,
    index,
    entryId: getLegendEntryId(entry),
  }));

  const patchCustomLegend = patch => {
    setCustomLegend?.(prev => ({
      ...DEFAULT_CUSTOM_LEGEND,
      ...(prev ?? {}),
      ...patch,
    }));
  };

  const updateLegendEntry = (entryId, patch) => {
    setCustomLegend?.(prev => {
      const current = {
        ...DEFAULT_CUSTOM_LEGEND,
        ...(prev ?? {}),
      };
      const entries = getLegendEntriesWithIds(current.entries);
      const index = findLegendEntryIndexById(entries, entryId);
      if (index < 0) return current;
      entries[index] = {
        group: '',
        kind: 'node',
        label: '',
        color: CUSTOM_LEGEND_FALLBACK_COLOR,
        ...(entries[index] ?? {}),
        ...patch,
      };
      return { ...current, entries };
    });
  };

  const addLegendEntry = () => {
    pendingNewEntryFocusRef.current = true;
    setCustomLegend?.(prev => {
      const current = {
        ...DEFAULT_CUSTOM_LEGEND,
        ...(prev ?? {}),
      };
      return {
        ...current,
        entries: [
          withLegendEntryId({
            group: 'Nodes',
            kind: 'node',
            label: 'New entry',
            color: CUSTOM_LEGEND_FALLBACK_COLOR,
          }),
          ...(Array.isArray(current.entries) ? current.entries : []),
        ],
      };
    });
  };

  const removeLegendEntry = entryId => {
    setCustomLegend?.(prev => {
      const current = {
        ...DEFAULT_CUSTOM_LEGEND,
        ...(prev ?? {}),
      };
      const entries = getLegendEntriesWithIds(current.entries).filter(
        entry => getLegendEntryId(entry) !== entryId
      );
      return { ...current, entries };
    });
  };

  const moveLegendEntry = (entryId, delta, action) => {
    const fromIndex = findLegendEntryIndexById(legendEntries, entryId);
    const toIndex = fromIndex + delta;
    if (
      fromIndex < 0 ||
      toIndex < 0 ||
      toIndex >= legendEntries.length ||
      fromIndex === toIndex
    ) {
      return;
    }

    pendingReorderFocusRef.current = { entryId, action };

    setCustomLegend?.(prev => {
      const current = {
        ...DEFAULT_CUSTOM_LEGEND,
        ...(prev ?? {}),
      };
      const entries = getLegendEntriesWithIds(current.entries);
      const currentFromIndex = findLegendEntryIndexById(entries, entryId);
      const currentToIndex = currentFromIndex + delta;
      if (
        currentFromIndex < 0 ||
        currentFromIndex >= entries.length ||
        currentToIndex < 0 ||
        currentToIndex >= entries.length ||
        currentFromIndex === currentToIndex
      ) {
        return current;
      }
      const [entry] = entries.splice(currentFromIndex, 1);
      entries.splice(currentToIndex, 0, entry);
      return { ...current, entries };
    });
  };

  const resetLegendPosition = () => {
    setCustomLegend?.(prev => ({
      ...DEFAULT_CUSTOM_LEGEND,
      ...(prev ?? {}),
      position: DEFAULT_CUSTOM_LEGEND.position,
    }));
  };

  const setLegendMode = mode => {
    if (!LEGEND_MODES.includes(mode)) return;
    if (mode === 'custom') {
      const smartEntries = resolvedLegend?.entries ?? [];
      const sourceEntries = smartEntries.length ? smartEntries : legendEntries;
      patchCustomLegend({
        mode,
        entries: sourceEntries.map(entry => ({
          group: entry.group,
          kind: entry.kind,
          label: entry.label,
          color: entry.color,
        })),
      });
      return;
    }
    patchCustomLegend({ mode });
  };

  return (
    <ModalFrame
      open={open}
      testId="custom-legend-modal"
      titleId="custom-legend-modal-title"
      title="Edit Legend"
      description="Define reusable visual states and keep their legend in sync."
      maxWidthClass="max-w-4xl"
      onClose={onClose}
      bodyClassName="graphstudio-scroll-panel space-y-4"
      footer={
        <>
          <button
            type="button"
            className={modalSecondaryButtonClass}
            data-testid="custom-legend-reset"
            onClick={resetLegendPosition}
          >
            Reset to Auto
          </button>
          <button
            type="button"
            className={modalPrimaryButtonClass}
            onClick={onClose}
          >
            Done
          </button>
        </>
      }
    >
      <div
        id="custom-legend-editor"
        data-testid="custom-legend-editor"
        className="space-y-4"
      >
        <label className="flex min-h-10 cursor-pointer items-center justify-between gap-3 rounded-sm border border-[#CBD5E1] bg-[#FFFFFF] px-3 text-xs font-semibold text-[#334155] dark:border-[#475569] dark:bg-[#1E293B] dark:text-[#E2E8F0]">
          <span>Enabled</span>
          <input
            type="checkbox"
            checked={Boolean(legend.enabled)}
            aria-label="Enable Legend"
            onChange={event =>
              patchCustomLegend({ enabled: event.target.checked })
            }
            className="h-5 w-5 rounded-sm accent-[#0F2747] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0F2747] dark:accent-[#60A5FA] dark:focus-visible:ring-[#60A5FA]"
          />
        </label>

        <div className="grid gap-3 rounded-sm border border-[#CBD5E1] bg-[#F8F9FA] p-3 dark:border-[#334155] dark:bg-[#0F172A] sm:grid-cols-[180px_minmax(0,1fr)] sm:items-center">
          <label className="space-y-1.5" htmlFor="legend-content-mode">
            <span className={fieldLabelClass}>Legend content</span>
            <NativeSelect
              id="legend-content-mode"
              value={legend.mode ?? DEFAULT_CUSTOM_LEGEND.mode}
              aria-label="Legend content mode"
              data-testid="custom-legend-mode-select"
              onChange={event => setLegendMode(event.target.value)}
              size="dense"
            >
              <option value="smart">Smart</option>
              <option value="custom">Custom</option>
            </NativeSelect>
          </label>
          <p className="text-xs leading-relaxed text-[#475569] dark:text-[#CBD5E1]">
            {legend.mode === 'custom'
              ? 'Custom entries are independent from graph styling.'
              : 'Smart entries come from states used anywhere in the project, so labels and colors cannot drift.'}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px]">
          <label className="space-y-1.5" htmlFor="custom-legend-title">
            <span className={fieldLabelClass}>Title</span>
            <input
              id="custom-legend-title"
              type="text"
              value={legend.title}
              aria-label="Legend Title"
              data-testid="custom-legend-title-input"
              onChange={event =>
                patchCustomLegend({ title: event.target.value })
              }
              className={inputClass}
            />
          </label>
          <label className="space-y-1.5" htmlFor="custom-legend-position">
            <span className={fieldLabelClass}>Position</span>
            <NativeSelect
              id="custom-legend-position"
              value={legend.position}
              aria-label="Legend Position"
              data-testid="custom-legend-position-select"
              onChange={event =>
                patchCustomLegend({ position: event.target.value })
              }
              size="regular"
            >
              {CUSTOM_LEGEND_POSITIONS.map(position => (
                <option key={position} value={position}>
                  {CUSTOM_LEGEND_POSITION_LABELS[position]}
                </option>
              ))}
            </NativeSelect>
          </label>
        </div>
        {legend.position === 'custom' && (
          <p className="text-[10px] text-[#64748B] dark:text-[#94A3B8]">
            Drag the legend on the canvas to place it.
          </p>
        )}

        {legend.mode === 'smart' && (
          <div className="space-y-3" data-testid="smart-visual-state-editor">
            <div className="flex flex-wrap items-center justify-between gap-3 border-y border-[#CBD5E1] bg-[#F8F9FA] py-2 dark:border-[#334155] dark:bg-[#0F172A]">
              <div>
                <div className={fieldLabelClass}>Visual states</div>
                <p className="mt-1 text-[10px] text-[#64748B] dark:text-[#94A3B8]">
                  Used states appear automatically. Pin a state to explain it
                  even before it appears.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className={dataButtonClass}
                  onClick={() => onAddVisualState?.('node')}
                >
                  Add node state
                </button>
                <button
                  type="button"
                  className={dataButtonClass}
                  onClick={() => onAddVisualState?.('edge')}
                >
                  Add edge state
                </button>
              </div>
            </div>
            <div className="space-y-2">
              {visualStates.map((state, index) => {
                const isUsed = (resolvedLegend?.entries ?? []).some(
                  entry => entry.stateId === state.id && entry.used !== false
                );
                return (
                  <div
                    key={state.id}
                    className="grid gap-2 rounded-sm border border-[#CBD5E1] bg-[#FFFFFF] p-2 dark:border-[#334155] dark:bg-[#111827] md:grid-cols-[72px_82px_minmax(160px,1fr)_72px_92px_72px] md:items-end"
                    data-visual-state-id={state.id}
                  >
                    <div className="space-y-1">
                      <span className={fieldLabelClass}>Order</span>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          title={`Move ${state.label} up`}
                          aria-label={`Move ${state.label} up`}
                          disabled={index === 0}
                          onClick={() => onMoveVisualState?.(state.id, -1)}
                          className={reorderButtonClass}
                        >
                          <MoveUpIcon />
                        </button>
                        <button
                          type="button"
                          title={`Move ${state.label} down`}
                          aria-label={`Move ${state.label} down`}
                          disabled={index === visualStates.length - 1}
                          onClick={() => onMoveVisualState?.(state.id, 1)}
                          className={reorderButtonClass}
                        >
                          <MoveDownIcon />
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <span className={fieldLabelClass}>Type</span>
                      <div className="flex h-8 items-center rounded-sm border border-[#CBD5E1] bg-[#F8F9FA] px-2 text-xs font-semibold text-[#475569] dark:border-[#475569] dark:bg-[#1E293B] dark:text-[#CBD5E1]">
                        {CUSTOM_LEGEND_KIND_LABELS[state.kind]}
                      </div>
                    </div>
                    <label className="space-y-1">
                      <span className={fieldLabelClass}>
                        Meaning · {isUsed ? 'Used' : 'Unused'}
                      </span>
                      <input
                        type="text"
                        value={state.label}
                        aria-label={`${state.kind} state label`}
                        onChange={event =>
                          onUpdateVisualState?.(state.id, {
                            label: event.target.value,
                          })
                        }
                        onBlur={event => {
                          if (!event.target.value.trim()) {
                            onUpdateVisualState?.(state.id, {
                              label: `Untitled ${state.kind} state`,
                            });
                          }
                        }}
                        className={entryInputClass}
                      />
                    </label>
                    <label className="space-y-1">
                      <span className={fieldLabelClass}>Color</span>
                      <input
                        type="color"
                        value={state.color}
                        aria-label={`${state.label} color`}
                        onChange={event =>
                          onUpdateVisualState?.(state.id, {
                            color: event.target.value,
                          })
                        }
                        className="h-8 w-full rounded-sm border border-[#CBD5E1] bg-[#FFFFFF] p-1 dark:border-[#475569] dark:bg-[#1E293B]"
                      />
                    </label>
                    <label className="flex h-8 cursor-pointer items-center justify-between gap-2 rounded-sm border border-[#CBD5E1] px-2 text-[10px] font-semibold text-[#475569] dark:border-[#475569] dark:text-[#CBD5E1]">
                      <span>Pinned</span>
                      <input
                        type="checkbox"
                        checked={state.pinned}
                        aria-label={`Pin ${state.label} in legend`}
                        onChange={event =>
                          onUpdateVisualState?.(state.id, {
                            pinned: event.target.checked,
                          })
                        }
                        className="h-4 w-4 accent-[#0F2747] dark:accent-[#60A5FA]"
                      />
                    </label>
                    <button
                      type="button"
                      title={`Delete ${state.label}`}
                      aria-label={`Delete ${state.label}`}
                      onClick={() => onRemoveVisualState?.(state.id)}
                      className={dangerButtonClass}
                    >
                      Delete
                    </button>
                  </div>
                );
              })}
              {visualStates.length === 0 && (
                <div className="rounded-sm border border-dashed border-[#CBD5E1] p-4 text-center text-xs text-[#64748B] dark:border-[#475569] dark:text-[#94A3B8]">
                  Add a state, then apply it from a node or edge inspector.
                </div>
              )}
            </div>
          </div>
        )}

        {legend.mode !== 'smart' && (
          <div className="space-y-2">
            <div
              className="flex items-center justify-between gap-3 border-y border-[#CBD5E1] bg-[#F8F9FA] py-2 dark:border-[#334155] dark:bg-[#0F172A]"
              data-testid="custom-legend-entries-header"
            >
              <div className={fieldLabelClass}>Entries</div>
              <button
                type="button"
                className={dataButtonClass}
                data-testid="custom-legend-add-entry"
                onClick={addLegendEntry}
              >
                Add Entry
              </button>
            </div>

            <div className="space-y-2">
              {legendEntryRows.map(({ entry, index, entryId }) => (
                <div
                  key={entryId}
                  className="grid gap-2 rounded-sm border border-[#CBD5E1] bg-[#FFFFFF] p-2 dark:border-[#334155] dark:bg-[#111827]"
                  data-legend-entry-id={entryId}
                >
                  <div className="grid gap-2 md:grid-cols-[72px_minmax(108px,0.75fr)_minmax(160px,1fr)_104px_64px_72px] md:items-end">
                    <div className="space-y-1">
                      <span className={fieldLabelClass}>Order</span>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          title={`Move legend entry ${index + 1} up`}
                          aria-label={`Move legend entry ${index + 1} up`}
                          data-testid={`custom-legend-move-up-${index}`}
                          data-legend-reorder-action="up"
                          disabled={index === 0}
                          onClick={() => moveLegendEntry(entryId, -1, 'up')}
                          className={reorderButtonClass}
                        >
                          <MoveUpIcon />
                        </button>
                        <button
                          type="button"
                          title={`Move legend entry ${index + 1} down`}
                          aria-label={`Move legend entry ${index + 1} down`}
                          data-testid={`custom-legend-move-down-${index}`}
                          data-legend-reorder-action="down"
                          disabled={index === legendEntryRows.length - 1}
                          onClick={() => moveLegendEntry(entryId, 1, 'down')}
                          className={reorderButtonClass}
                        >
                          <MoveDownIcon />
                        </button>
                      </div>
                    </div>
                    <label
                      className="space-y-1"
                      htmlFor={`custom-legend-entry-group-${index}`}
                    >
                      <span className={fieldLabelClass}>Group</span>
                      <input
                        id={`custom-legend-entry-group-${index}`}
                        type="text"
                        value={entry.group ?? ''}
                        aria-label={`Legend Entry ${index + 1} Group`}
                        data-testid={`custom-legend-entry-group-${index}`}
                        onChange={event =>
                          updateLegendEntry(entryId, {
                            group: event.target.value,
                          })
                        }
                        className={entryInputClass}
                      />
                    </label>
                    <label
                      className="space-y-1"
                      htmlFor={`custom-legend-entry-label-${index}`}
                    >
                      <span className={fieldLabelClass}>Label</span>
                      <input
                        id={`custom-legend-entry-label-${index}`}
                        type="text"
                        value={entry.label ?? ''}
                        aria-label={`Legend Entry ${index + 1} Label`}
                        data-testid={`custom-legend-entry-label-${index}`}
                        onChange={event =>
                          updateLegendEntry(entryId, {
                            label: event.target.value,
                          })
                        }
                        className={entryInputClass}
                      />
                    </label>
                    <label
                      className="space-y-1"
                      htmlFor={`custom-legend-entry-kind-${index}`}
                    >
                      <span className={fieldLabelClass}>Kind</span>
                      <NativeSelect
                        id={`custom-legend-entry-kind-${index}`}
                        value={entry.kind ?? 'node'}
                        aria-label={`Legend Entry ${index + 1} Kind`}
                        data-testid={`custom-legend-entry-kind-${index}`}
                        onChange={event =>
                          updateLegendEntry(entryId, {
                            kind: event.target.value,
                          })
                        }
                        size="dense"
                      >
                        {CUSTOM_LEGEND_KINDS.map(kind => (
                          <option key={kind} value={kind}>
                            {CUSTOM_LEGEND_KIND_LABELS[kind]}
                          </option>
                        ))}
                      </NativeSelect>
                    </label>
                    <label
                      className="space-y-1"
                      htmlFor={`custom-legend-entry-color-${index}`}
                    >
                      <span className={fieldLabelClass}>Color</span>
                      <input
                        id={`custom-legend-entry-color-${index}`}
                        type="color"
                        value={entry.color ?? CUSTOM_LEGEND_FALLBACK_COLOR}
                        aria-label={`Legend Entry ${index + 1} Color`}
                        data-testid={`custom-legend-entry-color-${index}`}
                        onChange={event =>
                          updateLegendEntry(entryId, {
                            color: event.target.value,
                          })
                        }
                        className="h-8 w-full rounded-sm border border-[#CBD5E1] bg-[#FFFFFF] p-1 dark:border-[#475569] dark:bg-[#1E293B]"
                      />
                    </label>
                    <button
                      type="button"
                      title={`Delete legend entry ${index + 1}`}
                      aria-label={`Delete legend entry ${index + 1}`}
                      data-testid={`custom-legend-remove-entry-${index}`}
                      onClick={() => removeLegendEntry(entryId)}
                      className={dangerButtonClass}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </ModalFrame>
  );
};

export default LegendModal;
