import { useEffect, useRef } from 'react';
import { isEditableKeyboardTarget } from '../lib/keyboardTargets';
import ModalCloseButton from './ModalCloseButton';

const sectionClass =
  'space-y-3 border border-[#CBD5E1] bg-[#FFFFFF] p-4 dark:border-[#334155] dark:bg-[#111827]';
const actionClass =
  'min-h-[42px] w-full rounded-sm border border-[#CBD5E1] bg-[#F8F9FA] px-3 py-2.5 text-left text-sm font-semibold text-[#1E293B] transition-colors hover:bg-[#EEF2F6] focus:outline-none focus:ring-2 focus:ring-[#0F2747] dark:border-[#475569] dark:bg-[#1E293B] dark:text-[#F8FAFC] dark:hover:bg-[#334155] dark:focus:ring-[#60A5FA]';
const secondaryActionClass =
  'rounded-sm border border-[#CBD5E1] bg-[#FFFFFF] px-4 py-2 text-xs font-semibold text-[#334155] transition-colors hover:bg-[#EEF2F6] focus:outline-none focus:ring-2 focus:ring-[#0F2747] dark:border-[#475569] dark:bg-[#1E293B] dark:text-[#E2E8F0] dark:hover:bg-[#334155] dark:focus:ring-[#60A5FA]';

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
      if (event.key === 'Escape' && !isEditableKeyboardTarget(event.target)) {
        onClose?.();
      }
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/75 p-4"
      data-testid="import-menu-modal"
      onMouseDown={event => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <div
        className="mx-4 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden border border-[#94A3B8] bg-[#F8F9FA] shadow-2xl dark:border-[#475569] dark:bg-[#0F172A]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-menu-title"
      >
        <div className="flex items-start justify-between border-b border-[#CBD5E1] bg-[#FFFFFF] px-5 py-4 dark:border-[#334155] dark:bg-[#111827]">
          <div>
            <h2
              id="import-menu-title"
              className="text-lg font-semibold text-[#0F172A] dark:text-[#F8FAFC]"
            >
              Import
            </h2>
            <p className="mt-1 text-xs text-[#64748B] dark:text-[#94A3B8]">
              Bring project data or an edge list into the current workspace.
            </p>
          </div>
          <ModalCloseButton onClick={onClose} />
        </div>

        <div className="space-y-4 overflow-auto p-5">
          <section className={sectionClass}>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0F172A] dark:text-[#F8FAFC]">
                Project Data
              </h3>
              <p className="mt-1 text-xs text-[#64748B] dark:text-[#94A3B8]">
                Load a complete Graph Studio project without changing its
                schema.
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
              <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0F172A] dark:text-[#F8FAFC]">
                Edge List
              </h3>
              <p className="mt-1 text-xs text-[#64748B] dark:text-[#94A3B8]">
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

        <div className="flex justify-end border-t border-[#CBD5E1] bg-[#FFFFFF] p-4 dark:border-[#334155] dark:bg-[#111827]">
          <button
            type="button"
            className={secondaryActionClass}
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
