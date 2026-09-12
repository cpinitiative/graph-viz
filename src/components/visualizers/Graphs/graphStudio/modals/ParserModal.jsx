import { useState } from 'react';
import { PROJECT_LIMITS } from '../lib/projectLimits';
import ModalFrame, {
  modalBodyTextClass,
  modalErrorClass,
  modalEyebrowClass,
  modalFieldLabelClass,
  modalPrimaryButtonClass,
  modalSecondaryButtonClass,
  modalSectionClass,
  modalTextareaClass,
} from './ModalFrame';

const PARSER_PLACEHOLDER = '5 6\n0 1 2\n1 2 4\n2 3 1\n3 4 3\n0 4 8\n1 4 6';
const GRID_PLACEHOLDER =
  '5 8\n########\n#.A#...#\n#.##.#B#\n#......#\n########';
const selectClass =
  'mt-1 min-h-[42px] w-full rounded-sm border border-[#CBD5E1] bg-white px-3 py-2 text-sm text-[#0F172A] focus:border-[#0F2747] focus:outline-none focus:ring-1 focus:ring-[#0F2747] dark:border-[#475569] dark:bg-[#111827] dark:text-[#F8FAFC]';

const ParserModal = ({
  open,
  text,
  error = '',
  mode = 'edge-list',
  onModeChange,
  onTextChange,
  onClose,
  onSubmit,
}) => {
  const [indexBase, setIndexBase] = useState(0);
  const [edgeValues, setEdgeValues] = useState('weight');
  if (!open) return null;
  const isGrid = mode === 'grid';
  const updateOption = callback => {
    callback();
    onTextChange(text);
  };

  return (
    <ModalFrame
      open={open}
      testId="parser-modal"
      titleId="parser-modal-title"
      title={isGrid ? 'Import ASCII Grid' : 'Import Edge List'}
      description="Generate an editable graph from contest input. You can undo the import to recover the current project."
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
            onClick={() => onSubmit({ indexBase, edgeValues })}
          >
            Generate graph
          </button>
        </>
      }
    >
      <label className={`block ${modalFieldLabelClass}`}>
        Input format
        <select
          value={mode}
          onChange={event => onModeChange?.(event.target.value)}
          className={selectClass}
        >
          <option value="edge-list">Edge list</option>
          <option value="grid">ASCII grid</option>
        </select>
      </label>
      <section className={modalSectionClass}>
        {isGrid ? (
          <>
            <h3 className={modalEyebrowClass}>One cell per character</h3>
            <p id="parser-format-help" className={modalBodyTextClass}>
              Use <code>#</code> walls, <code>.</code> open cells,{' '}
              <code>A</code> start,
              <code> B</code> destination, and <code>M</code> monsters. All rows
              must have the same width. An optional first line gives{' '}
              <code>rows columns</code>. Up to{' '}
              {PROJECT_LIMITS.nodes.toLocaleString('en-US')} cells, including
              walls.
            </p>
          </>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className={modalFieldLabelClass}>
                Vertex IDs
                <select
                  value={indexBase}
                  onChange={event =>
                    updateOption(() => setIndexBase(Number(event.target.value)))
                  }
                  className={selectClass}
                >
                  <option value={0}>Zero-based: 0 to n − 1</option>
                  <option value={1}>One-based: 1 to n</option>
                </select>
              </label>
              <label className={modalFieldLabelClass}>
                Edge values
                <select
                  value={edgeValues}
                  onChange={event =>
                    updateOption(() => setEdgeValues(event.target.value))
                  }
                  className={selectClass}
                >
                  <option value="weight">Numeric weights</option>
                  <option value="label">Text labels</option>
                </select>
              </label>
            </div>
            <p id="parser-format-help" className={modalBodyTextClass}>
              First line: <code>n m</code>. Then exactly <code>m</code> rows of{' '}
              <code>u v</code> or{' '}
              <code>u v {edgeValues === 'weight' ? 'weight' : 'label'}</code>.
              {edgeValues === 'weight'
                ? ' Weights must be numeric.'
                : ' Letters or words after the two IDs become the edge label.'}{' '}
              Vertex IDs range from {indexBase === 0 ? '0 to n − 1' : '1 to n'}.{' '}
              Edges are undirected; direction can be edited after import.
            </p>
          </>
        )}
      </section>

      <div className="min-h-[42px]" data-testid="parser-output-area">
        <div
          className={`rounded-sm border px-3 py-2 text-xs leading-relaxed ${
            error ? modalErrorClass : 'border-transparent text-transparent'
          }`}
          role={error ? 'alert' : undefined}
          aria-live="polite"
          data-testid="parser-error-banner"
          id="parser-error-banner"
        >
          {error || 'No parser errors'}
        </div>
      </div>

      <textarea
        aria-label={isGrid ? 'ASCII grid input' : 'Edge list input'}
        aria-describedby={`parser-format-help${error ? ' parser-error-banner' : ''}`}
        aria-invalid={Boolean(error)}
        value={text}
        onChange={event => onTextChange(event.target.value)}
        className={`${modalTextareaClass} h-64`}
        placeholder={isGrid ? GRID_PLACEHOLDER : PARSER_PLACEHOLDER}
      />
    </ModalFrame>
  );
};

export default ParserModal;
