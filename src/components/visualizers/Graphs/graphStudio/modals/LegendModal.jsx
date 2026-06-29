import { useEffect, useRef } from 'react';
import {
  CUSTOM_LEGEND_FALLBACK_COLOR,
  CUSTOM_LEGEND_KINDS,
  CUSTOM_LEGEND_POSITION_LABELS,
  CUSTOM_LEGEND_POSITIONS,
  DEFAULT_CUSTOM_LEGEND,
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
  'flex h-8 w-8 items-center justify-center rounded-sm border border-[#CBD5E1] bg-[#FFFFFF] text-xs font-bold text-[#334155] transition-colors hover:bg-[#EEF2F6] focus:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[#0F2747] disabled:cursor-not-allowed disabled:opacity-35 dark:border-[#475569] dark:bg-[#1E293B] dark:text-[#E2E8F0] dark:hover:bg-[#334155] dark:focus-visible:ring-[#60A5FA]';

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
  onClose,
}) => {
  const pendingNewEntryFocusRef = useRef(false);

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

  if (!open) return null;

  const legend = {
    ...DEFAULT_CUSTOM_LEGEND,
    ...(customLegend ?? {}),
  };
  const legendEntries = Array.isArray(legend.entries) ? legend.entries : [];

  const patchCustomLegend = patch => {
    setCustomLegend?.(prev => ({
      ...DEFAULT_CUSTOM_LEGEND,
      ...(prev ?? {}),
      ...patch,
    }));
  };

  const updateLegendEntry = (index, patch) => {
    setCustomLegend?.(prev => {
      const current = {
        ...DEFAULT_CUSTOM_LEGEND,
        ...(prev ?? {}),
      };
      const entries = Array.isArray(current.entries)
        ? [...current.entries]
        : [];
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
          {
            group: 'Nodes',
            kind: 'node',
            label: 'New entry',
            color: CUSTOM_LEGEND_FALLBACK_COLOR,
          },
          ...(Array.isArray(current.entries) ? current.entries : []),
        ],
      };
    });
  };

  const removeLegendEntry = index => {
    setCustomLegend?.(prev => {
      const current = {
        ...DEFAULT_CUSTOM_LEGEND,
        ...(prev ?? {}),
      };
      const entries = Array.isArray(current.entries)
        ? current.entries.filter((_, entryIndex) => entryIndex !== index)
        : [];
      return { ...current, entries };
    });
  };

  const moveLegendEntry = (fromIndex, toIndex) => {
    setCustomLegend?.(prev => {
      const current = {
        ...DEFAULT_CUSTOM_LEGEND,
        ...(prev ?? {}),
      };
      const entries = Array.isArray(current.entries)
        ? [...current.entries]
        : [];
      if (
        fromIndex < 0 ||
        fromIndex >= entries.length ||
        toIndex < 0 ||
        toIndex >= entries.length ||
        fromIndex === toIndex
      ) {
        return current;
      }
      const [entry] = entries.splice(fromIndex, 1);
      entries.splice(toIndex, 0, entry);
      return { ...current, entries };
    });
  };

  const resetLegendDefaults = () => {
    setCustomLegend?.(prev => ({
      ...DEFAULT_CUSTOM_LEGEND,
      enabled: Boolean(prev?.enabled),
    }));
  };

  return (
    <ModalFrame
      open={open}
      testId="custom-legend-modal"
      titleId="custom-legend-modal-title"
      title="Edit Legend"
      description="Control legend entries, section groups, swatches, and placement."
      maxWidthClass="max-w-4xl"
      onClose={onClose}
      bodyClassName="space-y-4"
      footer={
        <>
          <button
            type="button"
            className={modalSecondaryButtonClass}
            data-testid="custom-legend-reset"
            onClick={resetLegendDefaults}
          >
            Reset Default
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

        <div className="space-y-2">
          <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-y border-[#CBD5E1] bg-[#F8F9FA] py-2 dark:border-[#334155] dark:bg-[#0F172A]">
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
            {legendEntries.map((entry, index) => (
              <div
                key={`custom-legend-entry-${index}`}
                className="grid gap-2 rounded-sm border border-[#CBD5E1] bg-[#FFFFFF] p-2 dark:border-[#334155] dark:bg-[#111827]"
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
                        disabled={index === 0}
                        onClick={() => moveLegendEntry(index, index - 1)}
                        className={reorderButtonClass}
                      >
                        <MoveUpIcon />
                      </button>
                      <button
                        type="button"
                        title={`Move legend entry ${index + 1} down`}
                        aria-label={`Move legend entry ${index + 1} down`}
                        data-testid={`custom-legend-move-down-${index}`}
                        disabled={index === legendEntries.length - 1}
                        onClick={() => moveLegendEntry(index, index + 1)}
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
                        updateLegendEntry(index, {
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
                        updateLegendEntry(index, {
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
                        updateLegendEntry(index, {
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
                        updateLegendEntry(index, {
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
                    onClick={() => removeLegendEntry(index)}
                    className={dangerButtonClass}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ModalFrame>
  );
};

export default LegendModal;
