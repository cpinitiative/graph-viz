import { useEffect, useRef } from 'react';
import { isEditableKeyboardTarget } from '../lib/keyboardTargets';
import ModalFrame, {
  modalActionButtonClass,
  modalBodyTextClass,
  modalEyebrowClass,
  modalSecondaryButtonClass,
  modalSectionClass,
} from './ModalFrame';

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
    <ModalFrame
      open={open}
      testId="import-menu-modal"
      titleId="import-menu-title"
      title="Import"
      description="Bring project data or an Edge List into the current Graph Studio workspace."
      onClose={onClose}
      closeOnBackdrop
      bodyClassName="space-y-4"
      footer={
        <button
          type="button"
          className={modalSecondaryButtonClass}
          onClick={onClose}
        >
          Cancel
        </button>
      }
    >
      <section className={modalSectionClass}>
        <div>
          <h3 className={modalEyebrowClass}>Project Data</h3>
          <p className={`mt-1 ${modalBodyTextClass}`}>
            Load a complete Graph Studio project without changing its schema.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            className={modalActionButtonClass}
            data-testid="project-import-button"
            onClick={() => projectImportInputRef.current?.click()}
          >
            Upload Project File
          </button>
          <button
            type="button"
            className={modalActionButtonClass}
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

      <section className={modalSectionClass}>
        <div>
          <h3 className={modalEyebrowClass}>Edge List</h3>
          <p className={`mt-1 ${modalBodyTextClass}`}>
            Strict 0-based format: first line n m, then exactly m rows of u v or
            u v weight. Spaces only.
          </p>
        </div>
        <button
          type="button"
          className={modalActionButtonClass}
          onClick={() => openNextModal(onOpenParser)}
        >
          Paste / Import Edge List
        </button>
      </section>
    </ModalFrame>
  );
};

export default ImportModal;
