import { useId, useRef, useState } from 'react';
import {
  CAPTION_FONT_SIZE_RANGE,
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
  'inline-flex min-h-[30px] min-w-[30px] items-center justify-center rounded-sm border border-[#CBD5E1] bg-[#FFFFFF] p-1 text-[#334155] hover:bg-[#F8F9FA] focus:outline-none focus:ring-2 focus:ring-[#0F2747] disabled:cursor-not-allowed disabled:opacity-40 dark:border-[#475569] dark:bg-[#1E293B] dark:text-[#E2E8F0] dark:hover:bg-[#334155] dark:focus:ring-[#60A5FA]';
const playbackButtonClass =
  'flex min-h-[30px] items-center gap-1.5 rounded-sm border border-[#0F2747] bg-[#0F2747] px-2 py-1 text-xs font-semibold text-[#FFFFFF] transition-colors hover:bg-[#173A68] dark:border-[#3B82F6] dark:bg-[#1D4ED8] dark:hover:bg-[#2563EB]';
const detailLabelClass =
  'shrink-0 text-[10px] font-bold uppercase tracking-[0.08em] text-[#334155] dark:text-[#CBD5E1]';
const detailControlLabelClass =
  'flex shrink-0 items-center gap-1.5 whitespace-nowrap text-[10px] font-bold uppercase tracking-[0.08em] text-[#334155] dark:text-[#CBD5E1]';
const scopeLabelClass =
  'shrink-0 border border-[#D7DEE8] bg-[#FFFFFF] px-1.5 py-0.5 text-[10px] font-semibold normal-case leading-none tracking-normal text-[#64748B] dark:border-[#475569] dark:bg-[#111827] dark:text-[#CBD5E1]';
const inlineActionButtonClass =
  'text-[10px] font-bold uppercase tracking-[0.04em] text-[#0F2747] underline-offset-2 hover:underline focus:outline-none focus-visible:ring-1 focus-visible:ring-[#0F2747] dark:text-[#BFDBFE] dark:focus-visible:ring-[#60A5FA]';
const frameCardBaseClass =
  'relative flex min-h-[46px] min-w-[116px] cursor-pointer flex-col overflow-hidden rounded-sm border bg-[#FFFFFF] text-left outline-none dark:bg-[#1E293B] md:min-w-[128px]';
const selectedFrameCardClass = 'border-[#0F2747] dark:border-[#60A5FA]';
const unselectedFrameCardClass =
  'border-[#D7DEE8] hover:border-[#94A3B8] hover:bg-[#F8F9FA] focus-visible:ring-1 focus-visible:ring-[#0F2747] focus-visible:ring-offset-1 focus-visible:ring-offset-[#FFFFFF] dark:border-[#334155] dark:hover:border-[#64748B] dark:hover:bg-[#233044] dark:focus-visible:ring-[#60A5FA] dark:focus-visible:ring-offset-[#0F172A]';
const HELP_TOOLTIP_WIDTH = 276;
const HELP_TOOLTIP_ESTIMATED_HEIGHT = 78;
const HELP_TOOLTIP_GUTTER = 12;
const HELP_TOOLTIP_OFFSET = 6;
const TIMELINE_HELP_TEXT =
  'Frame edits affect the current frame. Project-wide settings affect all frames. New nodes and edges appear from this frame onward.';

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
    className="block"
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
    className="block"
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

const ScopeLabel = ({ scope }) => {
  if (!scope) return null;
  return <span className={scopeLabelClass}>{scope}</span>;
};

const TimelineHelp = () => {
  const tooltipId = useId();
  const buttonRef = useRef(null);
  const [tooltipPosition, setTooltipPosition] = useState(null);

  const showTooltip = () => {
    const bounds = buttonRef.current?.getBoundingClientRect();
    if (!bounds) return;

    const maxLeft = Math.max(
      HELP_TOOLTIP_GUTTER,
      window.innerWidth - HELP_TOOLTIP_WIDTH - HELP_TOOLTIP_GUTTER
    );
    const left = Math.min(maxLeft, Math.max(HELP_TOOLTIP_GUTTER, bounds.left));
    const belowTop = bounds.bottom + HELP_TOOLTIP_OFFSET;
    const aboveTop =
      bounds.top - HELP_TOOLTIP_ESTIMATED_HEIGHT - HELP_TOOLTIP_OFFSET;
    const top =
      belowTop + HELP_TOOLTIP_ESTIMATED_HEIGHT <=
      window.innerHeight - HELP_TOOLTIP_GUTTER
        ? belowTop
        : Math.max(HELP_TOOLTIP_GUTTER, aboveTop);

    setTooltipPosition({ left, top });
  };

  const hideTooltip = () => setTooltipPosition(null);

  return (
    <span className="inline-flex items-center">
      <button
        ref={buttonRef}
        type="button"
        aria-label="Timeline temporal model help"
        aria-describedby={tooltipId}
        className="flex h-4 w-4 items-center justify-center rounded-sm border border-[#CBD5E1] bg-transparent text-[9px] font-bold leading-none text-[#64748B] transition-colors hover:border-[#94A3B8] hover:text-[#334155] focus:outline-none focus-visible:ring-1 focus-visible:ring-[#0F2747] dark:border-[#475569] dark:text-[#94A3B8] dark:hover:text-[#E2E8F0] dark:focus-visible:ring-[#60A5FA]"
        onBlur={hideTooltip}
        onFocus={showTooltip}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
      >
        ?
      </button>
      <span id={tooltipId} className="sr-only">
        {TIMELINE_HELP_TEXT}
      </span>
      {tooltipPosition && (
        <span
          role="tooltip"
          className="pointer-events-none fixed z-50 w-[276px] border border-[#CBD5E1] bg-[#FFFFFF] p-2 text-[10px] font-medium normal-case leading-relaxed tracking-normal text-[#334155] shadow-[0_8px_24px_#0F172A1F] dark:border-[#475569] dark:bg-[#0F172A] dark:text-[#E2E8F0]"
          data-testid="timeline-temporal-help-tooltip"
          style={{
            left: `${tooltipPosition.left}px`,
            top: `${tooltipPosition.top}px`,
          }}
        >
          {TIMELINE_HELP_TEXT}
        </span>
      )}
    </span>
  );
};

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
      className="h-8 w-[68px] rounded-sm border border-[#94A3B8] bg-[#FFFFFF] px-0 text-center font-mono text-xs tabular-nums leading-8 text-[#0F172A] focus:border-[#0F2747] focus:outline-none focus:ring-1 focus:ring-[#0F2747] dark:border-[#64748B] dark:bg-[#0F172A] dark:text-[#F8FAFC] dark:focus:border-[#60A5FA] dark:focus:ring-[#60A5FA]"
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

const CaptionFontSizeInput = ({ value, onCommit }) => {
  const normalizedValue = Number.isFinite(Number(value)) ? Number(value) : 12;
  const [draft, setDraft] = useState(String(normalizedValue));

  const reset = () => setDraft(String(normalizedValue));
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
    const nextValue = Math.round(
      Math.max(
        CAPTION_FONT_SIZE_RANGE.min,
        Math.min(CAPTION_FONT_SIZE_RANGE.max, parsed)
      )
    );
    setDraft(String(nextValue));
    onCommit?.(nextValue);
  };

  return (
    <input
      aria-label="Caption Font Size"
      className="h-8 w-14 rounded-sm border border-[#94A3B8] bg-[#FFFFFF] px-1 text-center font-mono text-xs tabular-nums leading-8 text-[#0F172A] focus:border-[#0F2747] focus:outline-none focus:ring-1 focus:ring-[#0F2747] dark:border-[#64748B] dark:bg-[#0F172A] dark:text-[#F8FAFC] dark:focus:border-[#60A5FA] dark:focus:ring-[#60A5FA]"
      data-testid="caption-font-size-input"
      inputMode="numeric"
      onBlur={commit}
      onChange={event => setDraft(event.target.value)}
      onFocus={() => setDraft(String(normalizedValue))}
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
  captionFontSize,
  hasCaptionVisibleOverride,
  onCaptionEnabledChange,
  onResetCaptionVisibleOverride,
  onCaptionStyleChange,
  onCaptionFontSizeChange,
  onAddStep,
  onDuplicateStep,
  onDeleteStep,
  onMoveStep,
  onPlay,
  isPlaying,
}) => {
  const frameRefs = useRef([]);
  const moveFrameFocus = (index, delta) => {
    const nextIndex = Math.max(0, Math.min(steps.length - 1, index + delta));
    onFrameChange(nextIndex);
    window.requestAnimationFrame(() => {
      frameRefs.current[nextIndex]?.focus();
    });
  };

  return (
    <div
      aria-label="Animation timeline"
      className="flex h-full min-h-[208px] min-w-0 flex-col bg-[#F8F9FA] text-sm outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0F2747] dark:bg-[#111827] dark:focus-visible:ring-[#60A5FA]"
      data-frame-navigation-surface="true"
      data-testid="timeline-panel"
      tabIndex="0"
    >
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-1.5 border-b border-[#D7DEE8] bg-[#F8F9FA] px-2.5 py-1.5 dark:border-[#334155] dark:bg-[#111827]">
        <div className="flex min-w-0 items-center gap-2">
          <div className="font-manrope text-xs font-bold uppercase tracking-wider text-[#0F2747] dark:text-[#F8FAFC]">
            Timeline
          </div>
          <TimelineHelp />
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
            title="+ Keyframe creates a new frame from the current visual state"
          >
            + Keyframe
          </button>
          <button
            type="button"
            className={toolbarButtonClass}
            onClick={onDuplicateStep}
            title="Duplicate copies this frame exactly, including overrides"
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
              ref={element => {
                frameRefs.current[index] = element;
              }}
              aria-current={index === currentFrame ? 'step' : undefined}
              aria-selected={index === currentFrame}
              className={`${frameCardBaseClass} ${
                index === currentFrame
                  ? selectedFrameCardClass
                  : unselectedFrameCardClass
              }`}
              data-current={index === currentFrame}
              data-frame-navigation-surface="true"
              data-testid="timeline-frame-card"
              onClick={event => {
                event.currentTarget.focus();
                onFrameChange(index);
              }}
              onKeyDown={event => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onFrameChange(index);
                } else if (
                  event.key === 'ArrowLeft' ||
                  event.key === 'ArrowRight'
                ) {
                  event.preventDefault();
                  event.stopPropagation();
                  moveFrameFocus(index, event.key === 'ArrowLeft' ? -1 : 1);
                }
              }}
              role="option"
              tabIndex="0"
            >
              {index === currentFrame && (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute bottom-0 left-0 top-0 w-[2px] bg-[#B45309] dark:bg-[#60A5FA]"
                  data-testid="timeline-frame-selected-accent"
                />
              )}
              <div className="py-1 pl-3 pr-2">
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
          <label className="grid min-w-0 grid-cols-1 gap-1.5 sm:grid-cols-[116px_minmax(0,1fr)] sm:items-center sm:gap-3">
            <span className="flex items-center gap-2">
              <span className={detailLabelClass}>Description</span>
              <ScopeLabel scope="Frame" />
            </span>
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
          <div className="grid min-w-0 grid-cols-1 gap-1.5 lg:grid-cols-[116px_minmax(0,1fr)] lg:items-center lg:gap-3">
            <div className={detailLabelClass}>Timing &amp; Caption</div>
            <div
              className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2"
              data-testid="frame-detail-controls"
            >
              <div className="flex shrink-0 items-center gap-2">
                <label className={detailControlLabelClass}>
                  <span>Duration</span>
                  <ScopeLabel scope="Frame" />
                  <DurationInput
                    key={`${steps[currentFrame]?.id ?? currentFrame}-${steps[currentFrame]?.durationMs ?? 600}`}
                    durationMs={steps[currentFrame]?.durationMs ?? 600}
                    onCommit={value =>
                      onStepDurationChange(currentFrame, value)
                    }
                  />
                </label>
              </div>
              <div className="h-5 w-px bg-[#D7DEE8] dark:bg-[#334155]" />
              <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
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
                  <ScopeLabel scope="Frame" />
                </label>
                {hasCaptionVisibleOverride && (
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="text-[10px] font-semibold text-[#7C2D12] dark:text-[#FDBA74]">
                      Current frame override
                    </span>
                    <button
                      type="button"
                      className={inlineActionButtonClass}
                      onClick={onResetCaptionVisibleOverride}
                    >
                      Reset override
                    </button>
                  </span>
                )}
                <label className={detailControlLabelClass}>
                  <span>Style</span>
                  <ScopeLabel scope="Project" />
                  <NativeSelect
                    aria-label="Caption Style"
                    data-testid="caption-style-select"
                    onChange={event =>
                      onCaptionStyleChange?.(event.target.value)
                    }
                    size="dense"
                    value={captionStyle}
                    wrapperClassName="w-[108px]"
                  >
                    {CAPTION_STYLE_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </NativeSelect>
                </label>
                <label className={detailControlLabelClass}>
                  <span>Caption Font Size</span>
                  <ScopeLabel scope="Project" />
                  <CaptionFontSizeInput
                    key={captionFontSize}
                    value={captionFontSize}
                    onCommit={onCaptionFontSizeChange}
                  />
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
