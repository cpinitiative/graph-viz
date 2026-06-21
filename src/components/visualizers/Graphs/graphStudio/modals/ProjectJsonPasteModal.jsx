import ModalCloseButton from './ModalCloseButton';

const ProjectJsonPasteModal = ({
  open,
  text,
  error,
  onTextChange,
  onClose,
  onSubmit,
}) => {
  if (!open) return null;

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-surface-container-lowest/80 p-4 backdrop-blur-[20px] dark:bg-black/60"
      data-testid="project-json-paste-modal"
    >
      <div className="mx-4 flex max-h-[90vh] w-full max-w-2xl flex-col rounded-md bg-surface-container-low shadow-ambient-lg dark:bg-black">
        <div className="flex items-center justify-between p-4">
          <h3 className="text-sm font-semibold text-on-surface dark:text-dark-on-surface">
            Import Project JSON
          </h3>
          <ModalCloseButton onClick={onClose} />
        </div>
        <div className="flex-1 overflow-auto p-4">
          <p className="mb-3 text-xs text-on-surface dark:text-dark-on-surface">
            Paste `.graphviz.json` project content here.
          </p>
          {error && (
            <div
              className="mb-3 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-xs leading-relaxed text-red-950 dark:border-red-700 dark:bg-red-950/40 dark:text-red-100"
              role="alert"
            >
              {error}
            </div>
          )}
          <textarea
            value={text}
            onChange={event => onTextChange(event.target.value)}
            data-testid="project-json-paste-textarea"
            aria-label="Project JSON"
            className="h-64 w-full resize-none rounded-md bg-white p-3 font-mono text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-900 dark:text-dark-on-surface"
            placeholder='{"format":"graph-viz-project","version":1,...}'
          />
        </div>
        <div className="flex flex-col justify-end gap-2 bg-white/50 p-4 dark:bg-gray-900 sm:flex-row">
          <button
            type="button"
            className="rounded-md bg-surface-container px-4 py-2 text-xs font-medium text-on-surface transition-colors hover:bg-surface-container-high dark:bg-gray-800 dark:text-dark-on-surface dark:hover:bg-dark-surface-container-high"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rounded-md bg-primary px-4 py-2 text-xs font-medium text-on-primary transition-colors hover:bg-blue-500 dark:bg-dark-primary dark:text-dark-on-primary dark:hover:bg-blue-600"
            data-testid="project-json-paste-submit"
            onClick={onSubmit}
          >
            Import Project
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProjectJsonPasteModal;
