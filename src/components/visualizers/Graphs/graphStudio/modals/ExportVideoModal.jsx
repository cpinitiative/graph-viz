import ModalCloseButton from './ModalCloseButton';

const LABEL_POSITIONS = [
  { value: 'top-left', label: 'Top Left' },
  { value: 'top-center', label: 'Top Center' },
  { value: 'top-right', label: 'Top Right' },
  { value: 'bottom-left', label: 'Bottom Left' },
  { value: 'bottom-center', label: 'Bottom Center' },
  { value: 'bottom-right', label: 'Bottom Right' },
];

const ExportVideoModal = ({
  open,
  labelPos,
  onLabelPosChange,
  onClose,
  onExport,
}) => {
  if (!open) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-surface-container-lowest/80 p-4 backdrop-blur-[20px] dark:bg-black/60">
      <div className="mx-4 flex w-full max-w-md flex-col rounded-md bg-surface-container-low shadow-ambient-lg dark:bg-black">
        <div className="flex items-center justify-between p-4">
          <h3 className="text-sm font-semibold text-on-surface dark:text-dark-on-surface">
            Export MP4 Video
          </h3>
          <ModalCloseButton onClick={onClose} />
        </div>
        <div className="p-4">
          <p className="mb-4 text-xs text-on-surface dark:text-dark-on-surface">
            This will generate a static video of the timeline steps.
          </p>
          <div className="space-y-2">
            <label className="block text-xs font-medium text-on-surface dark:text-dark-on-surface">
              Label Position
            </label>
            <select
              value={labelPos}
              onChange={event => onLabelPosChange(event.target.value)}
              className="w-full rounded-md bg-white px-3 py-2.5 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-dark-on-surface"
            >
              {LABEL_POSITIONS.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex flex-col justify-end gap-2 rounded-b-xl bg-white/50 p-4 dark:bg-gray-900 sm:flex-row">
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
            onClick={onExport}
          >
            Export
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportVideoModal;
