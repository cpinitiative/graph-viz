import ModalFrame, {
  modalBodyTextClass,
  modalErrorClass,
  modalPrimaryButtonClass,
  modalSecondaryButtonClass,
  modalTextareaClass,
} from './ModalFrame';

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
    <ModalFrame
      open={open}
      testId="project-json-paste-modal"
      titleId="project-json-paste-title"
      title="Import Project JSON"
      description="Paste Graph Studio project JSON content."
      onClose={onClose}
      bodyClassName="space-y-3"
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
            data-testid="project-json-paste-submit"
            onClick={onSubmit}
          >
            Import Project
          </button>
        </>
      }
    >
      <p className={modalBodyTextClass}>
        Paste <code>.graphviz.json</code> project content here.
      </p>
      {error && (
        <div
          className={`rounded-sm border px-3 py-2 text-xs leading-relaxed ${modalErrorClass}`}
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
        className={`${modalTextareaClass} h-64`}
        placeholder='{"format":"graph-viz-project","version":1,...}'
      />
    </ModalFrame>
  );
};

export default ProjectJsonPasteModal;
