const toolbarButtonClass =
  'min-h-[32px] rounded-md bg-surface-container px-2.5 py-1.5 text-xs text-on-surface transition-colors hover:bg-surface-container-high dark:bg-dark-surface-container dark:text-dark-on-surface dark:hover:bg-dark-surface-container-high md:min-h-0';
const deleteButtonClass =
  'min-h-[32px] rounded-md bg-surface-container-high px-2.5 py-1.5 text-xs text-primary transition-colors hover:bg-surface-container-highest dark:bg-dark-surface-container-high dark:text-dark-primary dark:hover:bg-dark-surface-container-highest md:min-h-0';
const moveButtonClass =
  'min-w-[32px] rounded-md bg-surface-container p-1.5 text-on-surface transition-colors hover:bg-surface-container-high dark:bg-dark-surface-container dark:text-dark-on-surface dark:hover:bg-dark-surface-container-high md:min-w-0';

const ChevronLeftIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M15 18l-6-6 6-6" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M9 18l6-6-6-6" />
  </svg>
);

const TimelinePanel = ({
  steps,
  currentFrame,
  onFrameChange,
  onStepDurationChange,
  onDescriptionChange,
  onAddStep,
  onDuplicateStep,
  onDeleteStep,
  onMoveStep,
  onOpenFrameBrowser,
}) => {
  return (
    <div
      className="flex h-full flex-col bg-surface-container-low text-sm dark:bg-dark-surface-container-low"
      data-testid="timeline-panel"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 bg-surface-container-low px-3 py-2 dark:bg-dark-surface-container-low">
        <div className="font-manrope text-xs font-semibold uppercase tracking-wider text-on-surface dark:text-dark-on-surface">
          Timeline
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className={toolbarButtonClass}
            data-testid="open-frame-browser"
            onClick={onOpenFrameBrowser}
          >
            Frames
          </button>
          <button
            type="button"
            className={toolbarButtonClass}
            onClick={onAddStep}
          >
            + Keyframe
          </button>
          <button
            type="button"
            className={toolbarButtonClass}
            onClick={onDuplicateStep}
          >
            Duplicate
          </button>
          <button
            type="button"
            className={deleteButtonClass}
            onClick={onDeleteStep}
          >
            Delete
          </button>
          <div className="mx-1 h-4 w-px bg-surface-container-high dark:bg-dark-surface-container-high" />
          <button
            type="button"
            className={moveButtonClass}
            onClick={() =>
              onMoveStep(currentFrame, Math.max(0, currentFrame - 1))
            }
            title="Move Left"
          >
            <ChevronLeftIcon />
          </button>
          <button
            type="button"
            className={moveButtonClass}
            onClick={() =>
              onMoveStep(
                currentFrame,
                Math.min(steps.length - 1, currentFrame + 1)
              )
            }
            title="Move Right"
          >
            <ChevronRightIcon />
          </button>
        </div>
      </div>

      <div className="min-h-[112px] flex-1 overflow-x-auto overflow-y-hidden bg-surface p-2 font-inter text-on-surface dark:bg-dark-surface dark:text-dark-on-surface">
        <div className="flex h-full min-w-max items-center gap-2">
          {steps.map((step, index) => (
            <div
              key={`${step.id ?? 'step'}-${index}`}
              className={`flex min-w-[112px] cursor-pointer flex-col rounded-md transition-all md:min-w-[128px] ${index === currentFrame ? 'border-2 border-blue-500 bg-surface-container shadow-ambient dark:bg-dark-surface-container' : 'bg-surface-container-low hover:bg-surface-container-high dark:bg-dark-surface-container-low dark:hover:bg-dark-surface-container-high'}`}
              onClick={() => onFrameChange(index)}
            >
              <div className="p-2">
                <div className="mb-1 flex items-center justify-between">
                  <div
                    className={`text-xs font-bold ${index === currentFrame ? 'text-blue-400' : 'text-on-surface dark:text-dark-on-surface'}`}
                  >
                    Frame {index + 1}
                  </div>
                  <div className="font-mono text-[10px] text-outline dark:text-dark-outline">
                    {step.durationMs ?? 600}ms
                  </div>
                </div>
                <div
                  className="max-w-[92px] truncate text-[10px] text-on-surface dark:text-dark-on-surface md:max-w-[108px]"
                  title={step.description || 'No description'}
                >
                  {step.description || (
                    <span className="italic opacity-50">No description</span>
                  )}
                </div>
              </div>
              <div
                className="rounded-b-lg bg-black/20 px-2 py-1.5 dark:bg-white/10"
                onClick={event => event.stopPropagation()}
              >
                <input
                  className="h-1.5 w-full cursor-pointer appearance-none border-b border-outline-variant/20 bg-surface-container-high px-0 py-1 accent-blue-500 transition-colors focus:border-b-primary focus:outline-none focus:ring-0 dark:border-dark-outline-variant/20"
                  type="range"
                  min="80"
                  max="2400"
                  step="20"
                  value={step.durationMs ?? 600}
                  onChange={event =>
                    onStepDurationChange(index, Number(event.target.value))
                  }
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-surface-container-low p-3 dark:bg-dark-surface-container-low">
        <div className="flex items-center gap-3">
          <div className="whitespace-nowrap text-xs font-semibold text-on-surface dark:text-dark-on-surface">
            Frame Description:
          </div>
          <input
            value={steps[currentFrame]?.description ?? ''}
            onChange={event =>
              onDescriptionChange(currentFrame, event.target.value)
            }
            className="flex-1 rounded-md bg-white px-2.5 py-1.5 text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-dark-on-surface"
            placeholder="Enter a description for this frame..."
          />
        </div>
      </div>
    </div>
  );
};

export default TimelinePanel;
