import { useState } from 'react';
import {
  CAPTION_SIZE_OPTIONS,
  CAPTION_STYLE_OPTIONS,
} from './lib/captionOverlay';
import NativeSelect from './NativeSelect';

const MIN_DURATION_MS = 80;
const MAX_DURATION_MS = 8000;

const toolbarButtonClass =
  'min-h-[30px] rounded-sm border border-[#CBD5E1] bg-[#FFFFFF] px-2 py-1 text-xs font-medium text-[#334155] hover:bg-[#F8F9FA] dark:border-[#475569] dark:bg-[#1E293B] dark:text-[#E2E8F0] dark:hover:bg-[#334155]';
const addButtonClass =
  'min-h-[30px] rounded-sm border border-[#0F2747] bg-[#0F2747] px-2 py-1 text-xs font-semibold text-[#FFFFFF] hover:bg-[#173A68] dark:border-[#3B82F6] dark:bg-[#1D4ED8] dark:hover:bg-[#2563EB]';
const deleteButtonClass =
  'min-h-[30px] rounded-sm border border-[#B91C1C] bg-transparent px-2 py-1 text-xs font-semibold text-[#B91C1C] transition-colors hover:bg-[#B91C1C] hover:text-[#FFFFFF] focus:bg-[#B91C1C] focus:text-[#FFFFFF] focus:outline-none focus:ring-2 focus:ring-[#B91C1C] focus:ring-offset-1 active:bg-[#991B1B] active:text-[#FFFFFF] disabled:cursor-not-allowed disabled:border-[#FCA5A5] disabled:text-[#FCA5A5] dark:border-[#F87171] dark:text-[#FCA5A5] dark:hover:bg-[#DC2626] dark:hover:text-[#FFFFFF] dark:focus:bg-[#DC2626] dark:focus:text-[#FFFFFF] dark:focus:ring-[#F87171] dark:focus:ring-offset-[#111827] dark:active:bg-[#B91C1C]';
const moveButtonClass =
  'min-h-[30px] min-w-[30px] rounded-sm border border-[#CBD5E1] bg-[#FFFFFF] p-1 text-[#334155] hover:bg-[#F8F9FA] disabled:cursor-not-allowed disabled:opacity-40 dark:border-[#475569] dark:bg-[#1E293B] dark:text-[#E2E8F0] dark:hover:bg-[#334155]';
const playbackButtonClass =
  'flex min-h-[30px] items-center gap-1.5 rounded-sm border border-[#0F2747] bg-[#0F2747] px-2 py-1 text-xs font-semibold text-[#FFFFFF] transition-colors hover:bg-[#173A68] dark:border-[#3B82F6] dark:bg-[#1D4ED8] dark:hover:bg-[#2563EB]';
const detailLabelClass =
  'shrink-0 text-[10px] font-bold uppercase tracking-wide text-[#334155] dark:text-[#CBD5E1]';
const detailControlLabelClass =
  'flex shrink-0 items-center gap-1.5 whitespace-nowrap text-[10px] font-bold uppercase tracking-wide text-[#334155] dark:text-[#CBD5E1]';

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
      className="h-8 w-[72px] rounded-sm border border-[#94A3B8] bg-[#FFFFFF] px-2 text-center font-mono text-xs tabular-nums text-[#0F172A] focus:border-[#0F2747] focus:outline-none focus:ring-1 focus:ring-[#0F2747] dark:border-[#64748B] dark:bg-[#0F172A] dark:text-[#F8FAFC] dark:focus:border-[#60A5FA] dark:focus:ring-[#60A5FA]"
      data-testid="frame-duration-input"
      inputMode="numeric"
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
      pattern="[0-9]*"
      type="text"
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
  captionEnabled,
  captionStyle,
  captionSize,
  onCaptionEnabledChange,
  onCaptionStyleChange,
  onCaptionSizeChange,
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
      className="flex h-full min-h-[208px] min-w-0 flex-col bg-[#F8F9FA] text-sm outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0F2747] dark:bg-[#111827] dark:focus-visible:ring-[#60A5FA]"
      data-frame-navigation-surface="true"
      data-testid="timeline-panel"
      tabIndex="0"
    >
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-1.5 border-b border-[#D7DEE8] bg-[#F8F9FA] px-2.5 py-1.5 dark:border-[#334155] dark:bg-[#111827]">
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
        <div className="flex flex-wrap items-center gap-1.5">
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

      <div className="min-h-[58px] min-w-0 flex-1 overflow-x-auto overflow-y-hidden bg-[#FFFFFF] p-1 font-inter text-[#0F172A] dark:bg-[#0F172A] dark:text-[#F8FAFC]">
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
              className={`flex min-h-[46px] min-w-[116px] cursor-pointer flex-col rounded-sm border bg-[#FFFFFF] text-left outline-none focus-visible:ring-2 focus-visible:ring-[#0F2747] dark:bg-[#1E293B] dark:focus-visible:ring-[#60A5FA] md:min-w-[128px] ${
                index === currentFrame
                  ? 'border-l-4 border-[#0F2747] border-l-[#B45309] shadow-sm dark:border-[#60A5FA] dark:border-l-[#60A5FA]'
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
              <div className="px-2 py-1">
                <div className="mb-0.5 flex items-center justify-between gap-2">
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
                  className="leading-3.5 max-w-[96px] truncate text-[10px] text-[#475569] dark:text-[#CBD5E1] md:max-w-[108px]"
                  title={step.description || 'No description'}
                >
                  {step.description || (
                    <span className="italic opacity-50">No description</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div
        className="flex-none border-t border-[#D7DEE8] bg-[#F8F9FA] px-2.5 py-2 dark:border-[#334155] dark:bg-[#111827]"
        data-testid="frame-description-row"
      >
        <div className="grid min-w-0 gap-2">
          <label className="grid min-w-0 grid-cols-1 gap-1.5 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center sm:gap-2">
            <span className={detailLabelClass}>Description</span>
            <input
              aria-label="Frame Description"
              value={steps[currentFrame]?.description ?? ''}
              onChange={event =>
                onDescriptionChange(currentFrame, event.target.value)
              }
              className="h-8 min-w-0 rounded-sm border border-[#94A3B8] bg-[#FFFFFF] px-2 text-xs text-[#0F172A] focus:border-[#0F2747] focus:outline-none focus:ring-1 focus:ring-[#0F2747] dark:border-[#64748B] dark:bg-[#0F172A] dark:text-[#F8FAFC] dark:focus:border-[#60A5FA] dark:focus:ring-[#60A5FA]"
              placeholder="Enter a description for this frame..."
            />
          </label>
          <div className="grid min-w-0 grid-cols-1 gap-1.5 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-center lg:gap-2">
            <div className={detailLabelClass}>Timing &amp; Caption</div>
            <div
              className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2"
              data-testid="frame-detail-controls"
            >
              <label className={detailControlLabelClass}>
                <span>Duration</span>
                <DurationInput
                  key={`${steps[currentFrame]?.id ?? currentFrame}-${steps[currentFrame]?.durationMs ?? 600}`}
                  durationMs={steps[currentFrame]?.durationMs ?? 600}
                  onCommit={value => onStepDurationChange(currentFrame, value)}
                />
              </label>
              <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 border-[#D7DEE8] dark:border-[#334155] lg:border-l lg:pl-3">
                <label className="flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap text-[10px] font-semibold text-[#334155] dark:text-[#CBD5E1]">
                  <input
                    aria-label="Show caption"
                    checked={Boolean(captionEnabled)}
                    className="h-3.5 w-3.5 accent-[#B45309] dark:accent-[#60A5FA]"
                    data-testid="frame-caption-toggle"
                    onChange={event =>
                      onCaptionEnabledChange?.(event.target.checked)
                    }
                    type="checkbox"
                  />
                  <span>Show caption</span>
                </label>
                <label className={detailControlLabelClass}>
                  <span>Style</span>
                  <NativeSelect
                    aria-label="Caption Style"
                    data-testid="caption-style-select"
                    onChange={event =>
                      onCaptionStyleChange?.(event.target.value)
                    }
                    size="dense"
                    value={captionStyle}
                    wrapperClassName="w-[132px]"
                  >
                    {CAPTION_STYLE_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </NativeSelect>
                </label>
                <label className={detailControlLabelClass}>
                  <span>Size</span>
                  <NativeSelect
                    aria-label="Caption Size"
                    data-testid="caption-size-select"
                    onChange={event =>
                      onCaptionSizeChange?.(event.target.value)
                    }
                    size="dense"
                    value={captionSize}
                    wrapperClassName="w-[124px]"
                  >
                    {CAPTION_SIZE_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </NativeSelect>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimelinePanel;
