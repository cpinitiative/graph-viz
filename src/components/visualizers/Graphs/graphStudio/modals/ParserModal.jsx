import ModalFrame, {
  modalBodyTextClass,
  modalErrorClass,
  modalEyebrowClass,
  modalPrimaryButtonClass,
  modalSecondaryButtonClass,
  modalSectionClass,
  modalTextareaClass,
} from './ModalFrame';

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
    <ModalFrame
      open={open}
      testId="parser-modal"
      titleId="parser-modal-title"
      title="Import Edge List"
      description="Paste a strict Edge List to generate a Graph Studio graph."
      onClose={onClose}
      bodyClassName="space-y-4"
      footer={
        <>
          <button
            type="button"
            className={modalSecondaryButtonClass}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className={modalPrimaryButtonClass}
            onClick={onSubmit}
          >
            Generate graph
          </button>
        </>
      }
    >
      <section className={modalSectionClass}>
        <h3 className={modalEyebrowClass}>Strict 0-based CP format</h3>
        <p className={modalBodyTextClass}>
          First line: <code>n m</code>. Then exactly <code>m</code>{' '}
          space-separated rows of <code>u v</code> or <code>u v weight</code>.
          Node IDs must be integers from <code>0</code> to <code>n - 1</code>;
          weights must be numeric.
        </p>
      </section>

      <div className="min-h-[42px]" data-testid="parser-output-area">
        <div
          className={`rounded-sm border px-3 py-2 text-xs leading-relaxed ${
            error ? modalErrorClass : 'border-transparent text-transparent'
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
        className={`${modalTextareaClass} h-64`}
        placeholder={PARSER_PLACEHOLDER}
      />
    </ModalFrame>
  );
};

export default ParserModal;
