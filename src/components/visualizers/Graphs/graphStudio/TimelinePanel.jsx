import { useState } from 'react';

const MIN_DURATION_MS = 80;
const MAX_DURATION_MS = 8000;

const toolbarButtonClass =
  'min-h-[32px] rounded-sm border border-[#CBD5E1] bg-[#FFFFFF] px-2.5 py-1.5 text-xs font-medium text-[#334155] hover:bg-[#F8F9FA] dark:border-[#475569] dark:bg-[#1E293B] dark:text-[#E2E8F0] dark:hover:bg-[#334155] md:min-h-0';
const addButtonClass =
  'min-h-[32px] rounded-sm border border-[#0F2747] bg-[#0F2747] px-2.5 py-1.5 text-xs font-semibold text-[#FFFFFF] hover:bg-[#173A68] dark:border-[#3B82F6] dark:bg-[#1D4ED8] dark:hover:bg-[#2563EB] md:min-h-0';
const deleteButtonClass =
  'min-h-[32px] rounded-sm border border-[#CBD5E1] bg-[#F8F9FA] px-2.5 py-1.5 text-xs font-medium text-[#9A3412] hover:bg-[#F1F5F9] dark:border-[#475569] dark:bg-[#1E293B] dark:text-[#FDBA74] dark:hover:bg-[#334155] md:min-h-0';
const moveButtonClass =
  'min-w-[32px] rounded-sm border border-[#CBD5E1] bg-[#FFFFFF] p-1.5 text-[#334155] hover:bg-[#F8F9FA] disabled:cursor-not-allowed disabled:opacity-40 dark:border-[#475569] dark:bg-[#1E293B] dark:text-[#E2E8F0] dark:hover:bg-[#334155] md:min-w-0';
const playbackButtonClass =
  'flex min-h-[32px] items-center gap-1.5 rounded-sm border border-[#0F2747] bg-[#0F2747] px-2.5 py-1.5 text-xs font-semibold text-[#FFFFFF] transition-colors hover:bg-[#173A68] dark:border-[#3B82F6] dark:bg-[#1D4ED8] dark:hover:bg-[#2563EB]';

const PauseIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
    <rect x="6" y="4" width="4" height="16" />
    <rect x="14" y="4" width="4" height="16" />
  </svg>
);

const PlayIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);

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

const DurationInput = ({ durationMs, onCommit }) => {
  const normalizedDuration = Number.isFinite(Number(durationMs))
    ? Number(durationMs)
    : 600;
  const [draft, setDraft] = useState(String(normalizedDuration));

  const reset = () => setDraft(String(normalizedDuration));
  const commit = () => {
    if (!draft.trim()) {
      reset();
      return;
    }
    const parsed = Number(draft);
    if (!Number.isFinite(parsed)) {
      reset();
      return;
    }
    const nextDuration = Math.round(
      Math.max(MIN_DURATION_MS, Math.min(MAX_DURATION_MS, parsed))
    );
    setDraft(String(nextDuration));
    onCommit(nextDuration);
  };

  return (
    <input
      aria-label="Duration (ms)"
      className="h-8 w-full rounded-sm border border-[#94A3B8] bg-[#FFFFFF] px-2 text-right font-mono text-xs tabular-nums text-[#0F172A] focus:border-[#0F2747] focus:outline-none focus:ring-1 focus:ring-[#0F2747] dark:border-[#64748B] dark:bg-[#0F172A] dark:text-[#F8FAFC] dark:focus:border-[#60A5FA] dark:focus:ring-[#60A5FA]"
      data-testid="frame-duration-input"
      inputMode="numeric"
      max={MAX_DURATION_MS}
      min={MIN_DURATION_MS}
      onBlur={commit}
      onChange={event => setDraft(event.target.value)}
      onKeyDown={event => {
        if (event.key === 'Enter') {
          event.currentTarget.blur();
        } else if (event.key === 'Escape') {
          reset();
          event.currentTarget.blur();
        }
      }}
      step="20"
      type="number"
      value={draft}
    />
  );
};

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
  onPlay,
  isPlaying,
}) => {
  return (
    <div
      aria-label="Animation timeline"
      className="flex h-full flex-col bg-[#F8F9FA] text-sm outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0F2747] dark:bg-[#111827] dark:focus-visible:ring-[#60A5FA]"
      data-frame-navigation-surface="true"
      data-testid="timeline-panel"
      tabIndex="0"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#D7DEE8] bg-[#F8F9FA] px-3 py-2 dark:border-[#334155] dark:bg-[#111827]">
        <div className="flex items-center gap-2">
          <div className="font-manrope text-xs font-bold uppercase tracking-wider text-[#0F2747] dark:text-[#F8FAFC]">
            Timeline
          </div>
          <button
            type="button"
            className={playbackButtonClass}
            onClick={onPlay}
            aria-label={isPlaying ? 'Pause timeline' : 'Play timeline'}
          >
            {isPlaying ? (
              <>
                <PauseIcon />
                Pause
              </>
            ) : (
              <>
                <PlayIcon />
                Play
              </>
            )}
          </button>
          <div className="flex items-center gap-1 text-[10px] font-semibold text-[#64748B] dark:text-[#94A3B8]">
            <span className="uppercase tracking-wide">Frame</span>
            <span className="tabular-nums" data-testid="timeline-frame-counter">
              {currentFrame + 1} / {Math.max(1, steps.length)}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className={addButtonClass}
            onClick={onAddStep}
            title="Create the next keyframe from the current visual state"
          >
            + Keyframe
          </button>
          <button
            type="button"
            className={toolbarButtonClass}
            onClick={onDuplicateStep}
            title="Create an exact copy of the current keyframe"
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
            disabled={currentFrame <= 0}
            onClick={() =>
              onMoveStep(currentFrame, Math.max(0, currentFrame - 1))
            }
            title="Move keyframe left"
          >
            <ChevronLeftIcon />
          </button>
          <button
            type="button"
            className={moveButtonClass}
            disabled={currentFrame >= steps.length - 1}
            onClick={() =>
              onMoveStep(
                currentFrame,
                Math.min(steps.length - 1, currentFrame + 1)
              )
            }
            title="Move keyframe right"
          >
            <ChevronRightIcon />
          </button>
        </div>
      </div>

      <div className="min-h-[84px] flex-1 overflow-x-auto overflow-y-hidden bg-[#FFFFFF] p-2 font-inter text-[#0F172A] dark:bg-[#0F172A] dark:text-[#F8FAFC]">
        <div
          aria-label="Timeline frames"
          className="flex h-full min-w-max items-center gap-2"
          role="listbox"
        >
          {steps.map((step, index) => (
            <div
              key={`${step.id ?? 'step'}-${index}`}
              aria-current={index === currentFrame ? 'step' : undefined}
              aria-selected={index === currentFrame}
              className={`flex min-h-[72px] min-w-[124px] cursor-pointer flex-col rounded-sm border bg-[#FFFFFF] text-left outline-none focus-visible:ring-2 focus-visible:ring-[#0F2747] dark:bg-[#1E293B] dark:focus-visible:ring-[#60A5FA] md:min-w-[140px] ${
                index === currentFrame
                  ? 'border-l-4 border-[#0F2747] border-l-[#B45309] shadow-sm dark:border-[#60A5FA] dark:border-l-[#F59E0B]'
                  : 'border-[#D7DEE8] hover:border-[#94A3B8] dark:border-[#334155] dark:hover:border-[#64748B]'
              }`}
              data-current={index === currentFrame}
              data-frame-navigation-surface="true"
              data-testid="timeline-frame-card"
              onClick={() => onFrameChange(index)}
              onKeyDown={event => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onFrameChange(index);
                }
              }}
              role="option"
              tabIndex="0"
            >
              <div className="p-2">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <div
                    className={`text-xs font-bold ${
                      index === currentFrame
                        ? 'text-[#0F2747] dark:text-[#BFDBFE]'
                        : 'text-[#334155] dark:text-[#E2E8F0]'
                    }`}
                  >
                    Frame {index + 1}
                  </div>
                  <div className="font-mono text-[10px] font-semibold tabular-nums text-[#64748B] dark:text-[#CBD5E1]">
                    {step.durationMs ?? 600} ms
                  </div>
                </div>
                <div
                  className="max-w-[104px] truncate text-[10px] leading-4 text-[#475569] dark:text-[#CBD5E1] md:max-w-[120px]"
                  title={step.description || 'No description'}
                >
                  {step.description || (
                    <span className="italic opacity-50">No description</span>
                  )}
                </div>
              </div>
              <div
                className="mt-auto border-t border-[#E2E8F0] bg-[#F8F9FA] px-2 py-1 dark:border-[#475569] dark:bg-[#111827]"
                onClick={event => event.stopPropagation()}
              >
                <input
                  aria-label={`Frame ${index + 1} duration`}
                  className="h-1.5 w-full cursor-pointer appearance-none bg-[#CBD5E1] px-0 py-1 accent-[#0F2747] focus:outline-none focus:ring-1 focus:ring-[#0F2747] dark:bg-[#475569] dark:accent-[#60A5FA] dark:focus:ring-[#60A5FA]"
                  type="range"
                  min={MIN_DURATION_MS}
                  max={MAX_DURATION_MS}
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

      <div
        className="shrink-0 border-t border-[#D7DEE8] bg-[#F8F9FA] px-3 py-2 dark:border-[#334155] dark:bg-[#111827]"
        data-testid="frame-description-row"
      >
        <div className="flex flex-wrap items-end gap-2">
          <label className="min-w-[220px] flex-1">
            <span className="mb-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-[#334155] dark:text-[#CBD5E1]">
              Frame Description
              <span className="font-normal normal-case tracking-normal text-[#64748B] dark:text-[#94A3B8]">
                Selected keyframe {currentFrame + 1}
              </span>
            </span>
            <input
              aria-label="Frame Description"
              value={steps[currentFrame]?.description ?? ''}
              onChange={event =>
                onDescriptionChange(currentFrame, event.target.value)
              }
              className="h-8 w-full rounded-sm border border-[#94A3B8] bg-[#FFFFFF] px-2.5 text-xs text-[#0F172A] focus:border-[#0F2747] focus:outline-none focus:ring-1 focus:ring-[#0F2747] dark:border-[#64748B] dark:bg-[#0F172A] dark:text-[#F8FAFC] dark:focus:border-[#60A5FA] dark:focus:ring-[#60A5FA]"
              placeholder="Enter a description for this frame..."
            />
          </label>
          <label className="w-28 shrink-0">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-[#334155] dark:text-[#CBD5E1]">
              Duration (ms)
            </span>
            <DurationInput
              key={`${steps[currentFrame]?.id ?? currentFrame}-${steps[currentFrame]?.durationMs ?? 600}`}
              durationMs={steps[currentFrame]?.durationMs ?? 600}
              onCommit={value => onStepDurationChange(currentFrame, value)}
            />
          </label>
        </div>
      </div>
    </div>
  );
};

export default TimelinePanel;
