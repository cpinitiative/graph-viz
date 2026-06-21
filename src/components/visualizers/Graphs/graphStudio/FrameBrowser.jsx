'use client';

import { useEffect, useRef } from 'react';

const CloseIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const FrameBrowser = ({
  open,
  steps,
  currentFrame,
  onFrameChange,
  onClose,
}) => {
  const currentCardRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    currentCardRef.current?.scrollIntoView({ block: 'nearest' });
  }, [currentFrame, open]);

  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = event => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40"
      onClick={onClose}
      data-testid="frame-browser-backdrop"
    >
      <aside
        aria-label="Frame Browser"
        className="absolute bottom-0 right-0 top-0 flex w-[320px] max-w-[88vw] flex-col border-l border-outline-variant bg-surface shadow-xl dark:border-dark-outline-variant dark:bg-dark-surface"
        data-testid="frame-browser"
        onClick={event => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-outline-variant px-4 py-3 dark:border-dark-outline-variant">
          <div>
            <div className="font-manrope text-xs font-semibold uppercase tracking-wider text-on-surface dark:text-dark-on-surface">
              Frame Browser
            </div>
            <div className="mt-0.5 text-[11px] text-outline dark:text-dark-outline">
              {steps.length} {steps.length === 1 ? 'frame' : 'frames'}
            </div>
          </div>
          <button
            type="button"
            aria-label="Close frame browser"
            className="border border-outline-variant bg-surface-container p-1.5 text-on-surface transition-colors hover:bg-surface-container-high dark:border-dark-outline-variant dark:bg-dark-surface-container dark:text-dark-on-surface dark:hover:bg-dark-surface-container-high"
            onClick={onClose}
          >
            <CloseIcon />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          <div className="flex flex-col gap-2">
            {steps.map((step, index) => {
              const isCurrent = index === currentFrame;

              return (
                <button
                  key={`${step.id ?? 'step'}-${index}`}
                  ref={isCurrent ? currentCardRef : null}
                  type="button"
                  aria-current={isCurrent ? 'step' : undefined}
                  className={`w-full border px-3 py-2.5 text-left shadow-sm transition-colors ${
                    isCurrent
                      ? 'border-blue-500 bg-surface-container dark:bg-dark-surface-container'
                      : 'border-outline-variant bg-surface-container-low hover:bg-surface-container-high dark:border-dark-outline-variant dark:bg-dark-surface-container-low dark:hover:bg-dark-surface-container-high'
                  }`}
                  data-testid={`frame-browser-card-${index}`}
                  onClick={() => onFrameChange(index)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div
                      className={`text-xs font-bold ${
                        isCurrent
                          ? 'text-blue-500 dark:text-blue-400'
                          : 'text-on-surface dark:text-dark-on-surface'
                      }`}
                    >
                      Frame {index + 1}
                    </div>
                    <div className="flex items-center gap-2">
                      {isCurrent && (
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-blue-500 dark:text-blue-400">
                          Current
                        </span>
                      )}
                      <span className="font-mono text-[10px] text-outline dark:text-dark-outline">
                        {step.durationMs ?? 600}ms
                      </span>
                    </div>
                  </div>
                  <div
                    className={`mt-1.5 line-clamp-2 text-xs ${
                      step.description
                        ? 'text-on-surface dark:text-dark-on-surface'
                        : 'italic text-outline dark:text-dark-outline'
                    }`}
                  >
                    {step.description || 'No description'}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </aside>
    </div>
  );
};

export default FrameBrowser;
