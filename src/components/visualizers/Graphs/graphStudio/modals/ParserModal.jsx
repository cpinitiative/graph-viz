import ModalCloseButton from './ModalCloseButton';

const PARSER_PLACEHOLDER = '5 6\n0 1 2\n1 2 4\n2 3 1\n3 4 3\n0 4 8\n1 4 6';

const ParserModal = ({
  open,
  text,
  error = '',
  onTextChange,
  onClose,
  onSubmit,
}) => {
  if (!open) return null;

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-surface-container-lowest/80 p-4 backdrop-blur-[20px] dark:bg-black/60"
      data-testid="parser-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="parser-modal-title"
    >
      <div className="mx-4 flex max-h-[90vh] w-full max-w-2xl flex-col rounded-md bg-surface-container-low shadow-ambient-lg dark:bg-black">
        <div className="flex items-center justify-between border-b border-outline-variant/20 p-4 dark:border-dark-outline-variant/20">
          <h3
            id="parser-modal-title"
            className="text-sm font-semibold text-on-surface dark:text-dark-on-surface"
          >
            Text-to-Graph Parser
          </h3>
          <ModalCloseButton onClick={onClose} />
        </div>
        <div className="flex-1 overflow-auto p-4">
          <p className="mb-3 text-xs text-on-surface dark:text-dark-on-surface">
            Strict 0-based CP format: first line `n m`, then exactly `m`
            space-separated rows of `u v` or `u v weight`. Node IDs must be
            integers from `0` to `n - 1`; weights must be numeric.
          </p>
          <div className="mb-3 min-h-[42px]" data-testid="parser-output-area">
            <div
              className={`rounded-sm border px-3 py-2 text-xs leading-relaxed ${
                error
                  ? 'border-[#FCA5A5] bg-[#FEE2E2] text-[#7F1D1D] dark:border-[#F87171] dark:bg-[#450A0A] dark:text-[#FEE2E2]'
                  : 'border-transparent bg-transparent text-transparent'
              }`}
              role={error ? 'alert' : undefined}
              aria-live="polite"
              data-testid="parser-error-banner"
            >
              {error || 'No parser errors'}
            </div>
          </div>
          <textarea
            value={text}
            onChange={event => onTextChange(event.target.value)}
            className="h-64 w-full resize-none rounded-md border border-outline-variant/30 bg-white px-3 py-2 font-mono text-sm text-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-dark-outline-variant/30 dark:bg-gray-900 dark:text-dark-on-surface"
            placeholder={PARSER_PLACEHOLDER}
          />
        </div>
        <div className="flex flex-col justify-end gap-2 border-t border-outline-variant/20 bg-white/50 p-4 dark:border-dark-outline-variant/20 dark:bg-gray-900 sm:flex-row">
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
            onClick={onSubmit}
          >
            Generate graph
          </button>
        </div>
      </div>
    </div>
  );
};

export default ParserModal;
