import { useEffect, useRef } from 'react';
import ModalCloseButton from './ModalCloseButton';

const sectionClass =
  'space-y-3 border border-outline-variant/30 bg-white p-4 dark:border-dark-outline-variant/30 dark:bg-gray-900';
const actionClass =
  'min-h-[44px] w-full rounded-md bg-surface-container px-4 py-3 text-left text-sm font-medium text-on-surface transition-colors hover:bg-surface-container-high dark:bg-gray-800 dark:text-dark-on-surface dark:hover:bg-dark-surface-container-high';

const ImportModal = ({
  open,
  onClose,
  onOpenParser,
  onImportProjectFile,
  onOpenProjectJsonPaste,
}) => {
  const projectImportInputRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = event => {
      if (event.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, open]);

  if (!open) return null;

  const openNextModal = callback => {
    onClose?.();
    callback?.();
  };

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-surface-container-lowest/80 p-4 backdrop-blur-[20px] dark:bg-black/60"
      data-testid="import-menu-modal"
      onMouseDown={event => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <div
        className="mx-4 flex max-h-[90vh] w-full max-w-xl flex-col rounded-md bg-surface-container-low shadow-ambient-lg dark:bg-black"
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-menu-title"
      >
        <div className="flex items-center justify-between border-b border-outline-variant/20 p-5 dark:border-dark-outline-variant/20">
          <div>
            <h2
              id="import-menu-title"
              className="text-base font-semibold text-on-surface dark:text-dark-on-surface"
            >
              Import
            </h2>
            <p className="mt-1 text-xs text-outline dark:text-dark-outline">
              Bring project data or an edge list into the current workspace.
            </p>
          </div>
          <ModalCloseButton onClick={onClose} />
        </div>

        <div className="space-y-4 overflow-auto p-5">
          <section className={sectionClass}>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-on-surface dark:text-dark-on-surface">
                Project
              </h3>
              <p className="mt-1 text-xs text-outline dark:text-dark-outline">
                Load a complete Graph Viz project without changing its schema.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                className={actionClass}
                data-testid="project-import-button"
                onClick={() => projectImportInputRef.current?.click()}
              >
                Upload Project File
              </button>
              <button
                type="button"
                className={actionClass}
                data-testid="project-paste-json-button"
                onClick={() => openNextModal(onOpenProjectJsonPaste)}
              >
                Paste Project JSON
              </button>
            </div>
            <input
              ref={projectImportInputRef}
              type="file"
              accept=".json,.graphviz.json,application/json"
              aria-label="Import Project JSON"
              data-testid="project-import-input"
              className="sr-only"
              onChange={event => {
                const file = event.target.files?.[0];
                if (file) {
                  onClose?.();
                  onImportProjectFile?.(file);
                }
                event.target.value = '';
              }}
            />
          </section>

          <section className={sectionClass}>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-on-surface dark:text-dark-on-surface">
                Edge List
              </h3>
              <p className="mt-1 text-xs text-outline dark:text-dark-outline">
                Paste competitive-programming style node and edge data.
              </p>
            </div>
            <button
              type="button"
              className={actionClass}
              onClick={() => openNextModal(onOpenParser)}
            >
              Paste / Import Edge List
            </button>
          </section>
        </div>

        <div className="flex justify-end border-t border-outline-variant/20 bg-white/50 p-4 dark:border-dark-outline-variant/20 dark:bg-gray-900">
          <button
            type="button"
            className="rounded-md bg-surface-container px-4 py-2 text-xs font-medium text-on-surface transition-colors hover:bg-surface-container-high dark:bg-gray-800 dark:text-dark-on-surface dark:hover:bg-dark-surface-container-high"
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImportModal;
