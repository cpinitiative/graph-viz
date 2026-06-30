import ModalFrame, {
  modalBodyTextClass,
  modalPrimaryButtonClass,
  modalSecondaryButtonClass,
} from './ModalFrame';

const ExportVideoModal = ({ open, onClose, onExport }) => {
  if (!open) return null;

  return (
    <ModalFrame
      open={open}
      titleId="export-video-title"
      title="Export MP4 Video"
      maxWidthClass="max-w-md"
      onClose={onClose}
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
            onClick={onExport}
          >
            Export
          </button>
        </>
      }
    >
      <p className={modalBodyTextClass}>
        This will generate a static video of the timeline steps. Enabled frame
        captions use their canvas position.
      </p>
    </ModalFrame>
  );
};

export default ExportVideoModal;
