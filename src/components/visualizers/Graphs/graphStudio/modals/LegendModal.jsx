import { useEffect } from 'react';
import {
  CUSTOM_LEGEND_FALLBACK_COLOR,
  CUSTOM_LEGEND_KINDS,
  CUSTOM_LEGEND_POSITION_LABELS,
  CUSTOM_LEGEND_POSITIONS,
  DEFAULT_CUSTOM_LEGEND,
} from '../lib/customLegend';
import ModalCloseButton from './ModalCloseButton';

const CUSTOM_LEGEND_KIND_LABELS = {
  node: 'Node',
  edge: 'Edge',
};

const inputClass =
  'w-full rounded border border-outline-variant/30 bg-white px-3 py-2 text-xs text-on-surface focus:border-primary focus:outline-none focus:ring-0 dark:border-dark-outline-variant/30 dark:bg-gray-800 dark:text-dark-on-surface';
const fieldLabelClass =
  'text-[10px] font-semibold uppercase text-outline dark:text-dark-outline';
const dataButtonClass =
  'rounded bg-surface-container px-3 py-2 text-xs font-medium text-on-surface transition-colors hover:bg-surface-container-high dark:bg-dark-surface-container dark:text-dark-on-surface dark:hover:bg-dark-surface-container-high';

const LegendModal = ({
  open,
  customLegend = DEFAULT_CUSTOM_LEGEND,
  setCustomLegend,
  onClose,
}) => {
  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = event => {
      if (event.key === 'Escape') onClose?.();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, open]);

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
    setCustomLegend?.(prev => {
      const current = {
        ...DEFAULT_CUSTOM_LEGEND,
        ...(prev ?? {}),
      };
      return {
        ...current,
        entries: [
          ...(Array.isArray(current.entries) ? current.entries : []),
          {
            group: 'Nodes',
            kind: 'node',
            label: 'New entry',
            color: CUSTOM_LEGEND_FALLBACK_COLOR,
          },
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

  const resetLegendDefaults = () => {
    setCustomLegend?.(prev => ({
      ...DEFAULT_CUSTOM_LEGEND,
      enabled: Boolean(prev?.enabled),
    }));
  };

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-surface-container-lowest/80 p-4 dark:bg-black/60"
      data-testid="custom-legend-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="custom-legend-modal-title"
    >
      <div className="mx-4 flex max-h-[90vh] w-full max-w-4xl flex-col rounded-md bg-surface-container-low shadow-ambient-lg dark:bg-black">
        <div className="flex items-center justify-between border-b border-outline-variant/20 p-4 dark:border-dark-outline-variant/20">
          <h3
            id="custom-legend-modal-title"
            className="text-sm font-semibold text-on-surface dark:text-dark-on-surface"
          >
            Edit Legend
          </h3>
          <ModalCloseButton onClick={onClose} />
        </div>

        <div
          id="custom-legend-editor"
          data-testid="custom-legend-editor"
          className="flex-1 space-y-4 overflow-auto p-4"
        >
          <label className="flex min-h-10 cursor-pointer items-center justify-between gap-3 rounded bg-surface-container px-3 text-xs text-on-surface dark:bg-dark-surface-container dark:text-dark-on-surface">
            <span>Enabled</span>
            <input
              type="checkbox"
              checked={Boolean(legend.enabled)}
              aria-label="Enable Legend"
              onChange={event =>
                patchCustomLegend({ enabled: event.target.checked })
              }
              className="h-5 w-5 rounded bg-surface-container-high text-blue-800 focus:ring-blue-800 focus:ring-offset-slate-800"
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
              <select
                id="custom-legend-position"
                value={legend.position}
                aria-label="Legend Position"
                data-testid="custom-legend-position-select"
                onChange={event =>
                  patchCustomLegend({ position: event.target.value })
                }
                className={inputClass}
              >
                {CUSTOM_LEGEND_POSITIONS.map(position => (
                  <option key={position} value={position}>
                    {CUSTOM_LEGEND_POSITION_LABELS[position]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {legend.position === 'custom' && (
            <p className="text-[10px] text-outline dark:text-dark-outline">
              Drag the legend on the canvas to place it.
            </p>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
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
                  className="grid gap-2 rounded border border-outline-variant/20 bg-surface-container-lowest p-3 dark:border-dark-outline-variant/20 dark:bg-dark-surface"
                >
                  <div className="grid gap-2 md:grid-cols-[minmax(120px,0.8fr)_minmax(180px,1fr)_120px_80px_44px] md:items-end">
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
                        className={inputClass}
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
                        className={inputClass}
                      />
                    </label>
                    <label
                      className="space-y-1"
                      htmlFor={`custom-legend-entry-kind-${index}`}
                    >
                      <span className={fieldLabelClass}>Kind</span>
                      <select
                        id={`custom-legend-entry-kind-${index}`}
                        value={entry.kind ?? 'node'}
                        aria-label={`Legend Entry ${index + 1} Kind`}
                        data-testid={`custom-legend-entry-kind-${index}`}
                        onChange={event =>
                          updateLegendEntry(index, {
                            kind: event.target.value,
                          })
                        }
                        className={inputClass}
                      >
                        {CUSTOM_LEGEND_KINDS.map(kind => (
                          <option key={kind} value={kind}>
                            {CUSTOM_LEGEND_KIND_LABELS[kind]}
                          </option>
                        ))}
                      </select>
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
                        className="h-9 w-full rounded border border-outline-variant/30 bg-white p-0.5 dark:border-dark-outline-variant/30 dark:bg-gray-800"
                      />
                    </label>
                    <button
                      type="button"
                      title={`Remove Legend Entry ${index + 1}`}
                      aria-label={`Remove Legend Entry ${index + 1}`}
                      data-testid={`custom-legend-remove-entry-${index}`}
                      onClick={() => removeLegendEntry(index)}
                      className="min-h-9 rounded bg-surface-container px-3 text-xs font-semibold text-on-surface hover:bg-surface-container-high dark:bg-dark-surface-container dark:text-dark-on-surface dark:hover:bg-dark-surface-container-high"
                    >
                      X
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-end gap-2 border-t border-outline-variant/20 bg-white/50 p-4 dark:border-dark-outline-variant/20 dark:bg-gray-900 sm:flex-row">
          <button
            type="button"
            className={dataButtonClass}
            data-testid="custom-legend-reset"
            onClick={resetLegendDefaults}
          >
            Reset Default
          </button>
          <button
            type="button"
            className="rounded-md bg-primary px-4 py-2 text-xs font-medium text-on-primary transition-colors hover:bg-blue-500 dark:bg-dark-primary dark:text-dark-on-primary dark:hover:bg-blue-600"
            onClick={onClose}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default LegendModal;
