import { useEffect, useRef } from 'react';
import { LEGACY_ORIGIN } from '../../../../../siteDomain';
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
      description="Load a project, paste a contest edge list, or build a graph from an ASCII grid."
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
      <p className={modalBodyTextClass}>
        Missing a project saved at the old address?{' '}
        <a
          className="font-semibold underline focus-visible:outline focus-visible:outline-2"
          href={LEGACY_ORIGIN}
          target="_blank"
          rel="noopener noreferrer"
        >
          Recover a saved project from graph-viz.usaco.guide
        </a>
      </p>
      <section className={modalSectionClass}>
        <div>
          <h3 className={modalEyebrowClass}>Project Data</h3>
          <p className={`mt-1 ${modalBodyTextClass}`}>
            Restore the graph, frames, and visual settings from a saved Graph
            Studio project.
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
            First line n m, then m edges. Choose zero-based or one-based IDs and
            numeric weights or text labels.
          </p>
        </div>
        <button
          type="button"
          className={modalActionButtonClass}
          onClick={() => openNextModal(() => onOpenParser?.('edge-list'))}
        >
          Paste / Import Edge List
        </button>
      </section>

      <section className={modalSectionClass}>
        <div>
          <h3 className={modalEyebrowClass}>ASCII Grid</h3>
          <p className={`mt-1 ${modalBodyTextClass}`}>
            Paste a maze such as a CSES sample using #, ., A, B, and M. A rows
            columns header is optional. Walls and cell positions are preserved;
            open neighbours are connected.
          </p>
        </div>
        <button
          type="button"
          className={modalActionButtonClass}
          data-testid="grid-import-button"
          onClick={() => openNextModal(() => onOpenParser?.('grid'))}
        >
          Paste / Import ASCII Grid
        </button>
      </section>
    </ModalFrame>
  );
};

export default ImportModal;
