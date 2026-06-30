import { useEffect } from 'react';
import { SCRIPT_EXAMPLES } from '../data/scriptExamples';
import { isEditableKeyboardTarget } from '../lib/keyboardTargets';
import NativeSelect from '../NativeSelect';
import ModalFrame, {
  modalBodyTextClass,
  modalErrorClass,
  modalFieldLabelClass,
  modalPrimaryButtonClass,
  modalSecondaryButtonClass,
  modalSectionClass,
  modalTextareaClass,
} from './ModalFrame';

const ScriptModal = ({
  open,
  text,
  onTextChange,
  onClose,
  onSubmit,
  defaultScript,
  error,
  isRunning = false,
}) => {
  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = event => {
      if (event.key !== 'Escape' || isEditableKeyboardTarget(event.target)) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      onClose?.();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, open]);

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
    <ModalFrame
      open={open}
      testId="script-modal"
      titleId="script-modal-title"
      title="Script Mode (Trace Recorder)"
      description="Generate timeline frames from local JavaScript trace commands."
      maxWidthClass="max-w-3xl"
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
            disabled={isRunning}
            aria-busy={isRunning}
            onClick={onSubmit}
          >
            {isRunning ? 'Generating...' : 'Generate timeline'}
          </button>
        </>
      }
    >
      <div className="border border-[#FDBA74] bg-[#FFF7ED] px-3 py-2 text-xs leading-relaxed text-[#7C2D12] dark:border-[#C2410C] dark:bg-[#431407] dark:text-[#FED7AA]">
        Script Mode executes local JavaScript. Only run code you trust; trace
        output is validated before timeline generation.
      </div>
      <p className={modalBodyTextClass}>
        Write JS using <code>api.active(id)</code>, <code>api.visited(id)</code>
        , <code>api.edge(id, color)</code> or <code>api.push(patch)</code>.
      </p>
      <section className={modalSectionClass}>
        <div className="grid gap-2 sm:grid-cols-[180px_minmax(0,1fr)] sm:items-center">
          <label
            className={modalFieldLabelClass}
            htmlFor="script-example-select"
          >
            Load example
          </label>
          <NativeSelect
            id="script-example-select"
            aria-label="Load script example"
            value={selectedExample?.id ?? ''}
            onChange={handleExampleChange}
            size="regular"
          >
            <option value="">Load script example...</option>
            {SCRIPT_EXAMPLES.map(example => (
              <option key={example.id} value={example.id}>
                {example.name}
              </option>
            ))}
          </NativeSelect>
          {selectedExample && (
            <p className={`${modalBodyTextClass} sm:col-start-2`}>
              {selectedExample.description}
            </p>
          )}
        </div>
      </section>
      <div className="min-h-[44px]" data-testid="script-output-area">
        <div
          className={`rounded-sm border px-3 py-2 text-xs leading-relaxed transition-colors ${
            error ? modalErrorClass : 'border-transparent text-transparent'
          }`}
          role={error ? 'alert' : undefined}
          aria-live="polite"
          data-testid="script-error-banner"
        >
          {error || 'No script errors'}
        </div>
      </div>
      <textarea
        value={text}
        onChange={event => onTextChange(event.target.value)}
        placeholder={defaultScript}
        className={`${modalTextareaClass} h-80`}
      />
    </ModalFrame>
  );
};

export default ScriptModal;
