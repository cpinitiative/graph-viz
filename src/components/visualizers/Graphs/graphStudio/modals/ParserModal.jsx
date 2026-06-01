/* eslint-disable react/prop-types */
import ModalCloseButton from "./ModalCloseButton";

const PARSER_PLACEHOLDER = "5 6\n0 1 2\n1 2 4\n2 3 1\n3 4 3\n0 4 8\n1 4 6";

const ParserModal = ({ open, text, onTextChange, onClose, onSubmit }) => {
  if (!open) return null;

  return (
    <div className="absolute inset-0 bg-surface-container-lowest/80 backdrop-blur-[20px] flex items-center justify-center z-50 p-4 dark:bg-black/60">
      <div className="w-full max-w-2xl bg-surface-container-low rounded-md shadow-ambient-lg flex flex-col max-h-[90vh] dark:bg-black mx-4">
        <div className="p-4 flex justify-between items-center">
          <h3 className="text-sm font-semibold text-on-surface dark:text-dark-on-surface">
            Text-to-Graph Parser
          </h3>
          <ModalCloseButton onClick={onClose} />
        </div>
        <div className="p-4 flex-1 overflow-auto">
          <p className="text-xs text-on-surface mb-3 dark:text-dark-on-surface">
            Supports competitive programming input: first line `N M`, then `u v
            w` rows.
          </p>
          <textarea
            value={text}
            onChange={(event) => onTextChange(event.target.value)}
            className="w-full h-64 bg-white rounded-md text-sm text-on-surface p-3 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none dark:bg-gray-900 dark:text-dark-on-surface"
            placeholder={PARSER_PLACEHOLDER}
          />
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
