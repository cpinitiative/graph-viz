import ModalFrame, {
  modalBodyTextClass,
  modalPrimaryButtonClass,
  modalSecondaryButtonClass,
  modalSectionClass,
} from './ModalFrame';

const formatSavedAt = value => {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'an earlier session';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

const LocalDraftRecoveryModal = ({ draft, onRestore, onDiscard }) => {
  if (!draft) return null;
  const nodeCount = draft.project?.graph?.nodes?.length ?? 0;
  const frameCount = draft.project?.timeline?.steps?.length ?? 0;

  return (
    <ModalFrame
      open
      testId="local-draft-recovery-modal"
      titleId="local-draft-recovery-title"
      title="Recover local draft"
      description="Graph Studio found work saved in this browser."
      maxWidthClass="max-w-lg"
      onClose={onDiscard}
      showCloseButton={false}
      footer={
        <>
          <button
            type="button"
            className={modalSecondaryButtonClass}
            onClick={onDiscard}
          >
            Start fresh
          </button>
          <button
            type="button"
            className={modalPrimaryButtonClass}
            autoFocus
            onClick={onRestore}
          >
            Restore draft
          </button>
        </>
      }
    >
      <section className={modalSectionClass}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
              Browser recovery draft
            </div>
            <p className={`mt-1 ${modalBodyTextClass}`}>
              Saved {formatSavedAt(draft.savedAt)}
            </p>
          </div>
          <div className="shrink-0 text-right text-xs font-semibold text-[#475569] dark:text-[#CBD5E1]">
            <div>
              {nodeCount} {nodeCount === 1 ? 'node' : 'nodes'}
            </div>
            <div>
              {frameCount} {frameCount === 1 ? 'frame' : 'frames'}
            </div>
          </div>
        </div>
      </section>
      <p className={`mt-4 ${modalBodyTextClass}`}>
        Restore continues where you left off. Start fresh removes this browser
        draft and keeps the default project. Export Project remains the durable,
        shareable save.
      </p>
    </ModalFrame>
  );
};

export default LocalDraftRecoveryModal;
