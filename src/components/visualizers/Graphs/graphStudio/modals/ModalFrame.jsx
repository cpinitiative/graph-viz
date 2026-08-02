import ModalCloseButton from './ModalCloseButton';

const joinClasses = (...classes) => classes.filter(Boolean).join(' ');

export const modalSectionClass =
  'space-y-3 border border-[#CBD5E1] bg-[#FFFFFF] p-4 dark:border-[#334155] dark:bg-[#111827]';

export const modalPrimaryButtonClass =
  'min-h-[42px] rounded-sm border border-[#0F2747] bg-[#0F2747] px-4 py-2 text-xs font-semibold text-[#FFFFFF] transition-colors hover:bg-[#173A68] focus:outline-none focus:ring-2 focus:ring-[#0F2747] focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60 dark:border-[#3B82F6] dark:bg-[#1D4ED8] dark:hover:bg-[#2563EB] dark:focus:ring-[#60A5FA] dark:focus:ring-offset-[#0F172A]';

export const modalSecondaryButtonClass =
  'min-h-[42px] rounded-sm border border-[#CBD5E1] bg-[#FFFFFF] px-4 py-2 text-xs font-semibold text-[#334155] transition-colors hover:bg-[#EEF2F6] focus:outline-none focus:ring-2 focus:ring-[#0F2747] focus:ring-offset-1 dark:border-[#475569] dark:bg-[#1E293B] dark:text-[#E2E8F0] dark:hover:bg-[#334155] dark:focus:ring-[#60A5FA] dark:focus:ring-offset-[#0F172A]';

export const modalActionButtonClass =
  'min-h-[42px] w-full rounded-sm border border-[#CBD5E1] bg-[#F8F9FA] px-3 py-2.5 text-left text-sm font-semibold text-[#1E293B] transition-colors hover:bg-[#EEF2F6] focus:outline-none focus:ring-2 focus:ring-[#0F2747] dark:border-[#475569] dark:bg-[#1E293B] dark:text-[#F8FAFC] dark:hover:bg-[#334155] dark:focus:ring-[#60A5FA]';

export const modalTextareaClass =
  'w-full resize-none rounded-sm border border-[#CBD5E1] bg-[#FFFFFF] px-3 py-2 font-mono text-sm text-[#0F172A] focus:border-[#0F2747] focus:outline-none focus:ring-1 focus:ring-[#0F2747] dark:border-[#475569] dark:bg-[#111827] dark:text-[#F8FAFC] dark:focus:border-[#60A5FA] dark:focus:ring-[#60A5FA]';

export const modalFieldLabelClass =
  'text-xs font-semibold text-[#334155] dark:text-[#E2E8F0]';

export const modalEyebrowClass =
  'text-xs font-semibold uppercase tracking-[0.14em] text-[#0F172A] dark:text-[#F8FAFC]';

export const modalBodyTextClass =
  'text-xs leading-relaxed text-[#64748B] dark:text-[#94A3B8]';

export const modalErrorClass =
  'border-[#FCA5A5] bg-[#FEE2E2] text-[#7F1D1D] dark:border-[#F87171] dark:bg-[#450A0A] dark:text-[#FEE2E2]';

const ModalFrame = ({
  open,
  testId,
  titleId,
  title,
  description,
  maxWidthClass = 'max-w-2xl',
  maxHeightClass = 'max-h-[90vh]',
  overlayClassName,
  shellClassName,
  headerClassName,
  bodyClassName,
  bodyPadding = true,
  footer,
  footerClassName,
  children,
  onClose,
  closeOnBackdrop = false,
}) => {
  if (!open) return null;

  return (
    <div
      className={joinClasses(
        'fixed inset-0 z-50 flex items-center justify-center bg-[#0F172ABF] p-4',
        overlayClassName
      )}
      data-testid={testId}
      data-modal-frame="true"
      onMouseDown={event => {
        if (closeOnBackdrop && event.target === event.currentTarget) {
          onClose?.();
        }
      }}
    >
      <div
        className={joinClasses(
          'mx-4 flex min-h-0 w-full flex-col overflow-hidden rounded-sm border border-[#94A3B8] bg-[#F8F9FA] shadow-[0_24px_64px_#0F172A33] dark:border-[#475569] dark:bg-[#0F172A]',
          maxWidthClass,
          maxHeightClass,
          shellClassName
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-modal-shell="true"
      >
        <header
          className={joinClasses(
            'flex flex-none items-start justify-between gap-4 border-b border-[#CBD5E1] bg-[#FFFFFF] px-5 py-4 dark:border-[#334155] dark:bg-[#111827] sm:px-6',
            headerClassName
          )}
        >
          <div className="min-w-0">
            <h2
              id={titleId}
              className="text-lg font-semibold text-[#0F172A] dark:text-[#F8FAFC]"
            >
              {title}
            </h2>
            {description && (
              <p className="mt-1 text-xs leading-relaxed text-[#64748B] dark:text-[#94A3B8]">
                {description}
              </p>
            )}
          </div>
          <ModalCloseButton onClick={onClose} />
        </header>

        <div
          className={joinClasses(
            'min-h-0 flex-1 overflow-auto',
            bodyPadding && 'p-5 sm:p-6',
            bodyClassName
          )}
        >
          {children}
        </div>

        {footer && (
          <footer
            className={joinClasses(
              'flex flex-none flex-col justify-end gap-2 border-t border-[#CBD5E1] bg-[#FFFFFF] p-4 dark:border-[#334155] dark:bg-[#111827] sm:flex-row sm:px-6',
              footerClassName
            )}
          >
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
};

export default ModalFrame;
