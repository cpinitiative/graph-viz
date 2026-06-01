/* eslint-disable react/prop-types */
import ModalCloseButton from "./ModalCloseButton";

const LABEL_POSITIONS = [
  { value: "top-left", label: "Top Left" },
  { value: "top-center", label: "Top Center" },
  { value: "top-right", label: "Top Right" },
  { value: "bottom-left", label: "Bottom Left" },
  { value: "bottom-center", label: "Bottom Center" },
  { value: "bottom-right", label: "Bottom Right" },
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
    <div className="absolute inset-0 bg-surface-container-lowest/80 backdrop-blur-[20px] flex items-center justify-center z-50 p-4 dark:bg-black/60">
      <div className="w-full max-w-md bg-surface-container-low rounded-md shadow-ambient-lg flex flex-col dark:bg-black mx-4">
        <div className="p-4 flex justify-between items-center">
          <h3 className="text-sm font-semibold text-on-surface dark:text-dark-on-surface">
            Export MP4 Video
          </h3>
          <ModalCloseButton onClick={onClose} />
        </div>
        <div className="p-4">
          <p className="text-xs text-on-surface mb-4 dark:text-dark-on-surface">
            This will generate a static video of the timeline steps.
          </p>
          <div className="space-y-2">
            <label className="block text-xs font-medium text-on-surface dark:text-dark-on-surface">
              Label Position
            </label>
            <select
              value={labelPos}
              onChange={(event) => onLabelPosChange(event.target.value)}
              className="w-full bg-white rounded-md text-sm text-on-surface py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-dark-on-surface"
            >
              {LABEL_POSITIONS.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="p-4 flex justify-end gap-2 bg-white/50 rounded-b-xl dark:bg-gray-900 flex-col sm:flex-row">
          <button
            type="button"
            className="py-2 px-4 bg-surface-container hover:bg-surface-container-high rounded-md text-xs font-medium text-on-surface transition-colors dark:bg-gray-800 dark:hover:bg-dark-surface-container-high dark:text-dark-on-surface"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="py-2 px-4 bg-primary text-on-primary hover:bg-blue-500 rounded-md text-xs font-medium transition-colors dark:bg-dark-primary dark:text-dark-on-primary dark:hover:bg-blue-600"
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
