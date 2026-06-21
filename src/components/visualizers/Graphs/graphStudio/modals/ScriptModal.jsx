import { SCRIPT_EXAMPLES } from '../data/scriptExamples';
import ModalCloseButton from './ModalCloseButton';

const ScriptModal = ({
  open,
  text,
  onTextChange,
  onClose,
  onSubmit,
  defaultScript,
  error,
}) => {
  if (!open) return null;

  const selectedExample =
    SCRIPT_EXAMPLES.find(example => example.code === text) ?? null;

  const handleExampleChange = event => {
    const example = SCRIPT_EXAMPLES.find(
      item => item.id === event.target.value
    );
    if (example) onTextChange(example.code);
  };

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-surface-container-lowest/80 p-4 backdrop-blur-[20px] dark:bg-black/60"
      data-testid="script-modal"
    >
      <div className="mx-4 flex max-h-[90vh] w-full max-w-3xl flex-col rounded-md bg-surface-container-low shadow-ambient-lg dark:bg-black">
        <div className="flex items-center justify-between border-b border-outline-variant/20 p-4 dark:border-dark-outline-variant/20">
          <h3 className="text-sm font-semibold text-on-surface dark:text-dark-on-surface">
            Script Mode (Trace Recorder)
          </h3>
          <ModalCloseButton onClick={onClose} />
        </div>
        <div className="flex-1 overflow-auto p-4">
          <div className="mb-3 rounded-md border border-orange-300 bg-orange-50 px-3 py-2 text-xs leading-relaxed text-orange-950 dark:border-orange-700 dark:bg-orange-950/40 dark:text-orange-100">
            Script Mode executes local JavaScript. Only run code you trust;
            trace output is validated before timeline generation.
          </div>
          <p className="mb-3 text-xs text-on-surface dark:text-dark-on-surface">
            Write JS using `api.active(id)`, `api.visited(id)`, `api.edge(id,
            color)` or `api.push(patch)`.
          </p>
          <div className="mb-3 grid gap-2 sm:grid-cols-[180px_1fr] sm:items-center">
            <label
              className="text-xs font-semibold text-on-surface dark:text-dark-on-surface"
              htmlFor="script-example-select"
            >
              Load example
            </label>
            <select
              id="script-example-select"
              aria-label="Load script example"
              value={selectedExample?.id ?? ''}
              onChange={handleExampleChange}
              className="h-10 w-full rounded-md border border-outline-variant bg-white py-2 pl-3 pr-10 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-dark-on-surface"
            >
              <option value="">Choose an example...</option>
              {SCRIPT_EXAMPLES.map(example => (
                <option key={example.id} value={example.id}>
                  {example.name}
                </option>
              ))}
            </select>
            {selectedExample && (
              <p className="text-xs leading-relaxed text-on-surface dark:text-dark-on-surface sm:col-start-2">
                {selectedExample.description}
              </p>
            )}
          </div>
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
            placeholder={defaultScript}
            className="h-80 w-full resize-none rounded-md border border-outline-variant/30 bg-white px-3 py-2 font-mono text-sm text-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-dark-outline-variant/30 dark:bg-gray-800 dark:text-dark-on-surface"
          />
        </div>
        <div className="flex flex-col justify-end gap-2 border-t border-outline-variant/20 bg-white/50 p-4 dark:border-dark-outline-variant/20 dark:bg-gray-900 sm:flex-row">
          <button
            type="button"
            className="rounded-md bg-surface-container px-4 py-2 text-xs font-medium text-on-surface transition-colors hover:bg-surface-container-high dark:bg-dark-surface-container dark:text-dark-on-surface dark:hover:bg-dark-surface-container-high"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rounded-md bg-primary px-4 py-2 text-xs font-medium text-on-primary transition-colors hover:bg-blue-500 dark:bg-dark-primary dark:text-dark-on-primary dark:hover:bg-blue-600"
            onClick={onSubmit}
          >
            Generate timeline
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScriptModal;
