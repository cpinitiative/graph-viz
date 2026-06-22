const joinClasses = (...classes) => classes.filter(Boolean).join(' ');

const SIZE_CLASSES = {
  compact: 'h-9 py-1.5 text-xs',
  regular: 'h-10 py-2 text-sm',
};

const NativeSelect = ({
  children,
  className,
  wrapperClassName,
  size = 'compact',
  ...props
}) => (
  <div className={joinClasses('relative min-w-0', wrapperClassName)}>
    <select
      {...props}
      className={joinClasses(
        'w-full appearance-none rounded-sm border border-[#CBD5E1] bg-[#FFFFFF] pl-3 pr-10 font-medium text-[#1E293B] transition-colors focus:border-[#0F2747] focus:outline-none focus:ring-1 focus:ring-[#0F2747] disabled:cursor-not-allowed disabled:bg-[#F1F5F9] disabled:text-[#94A3B8] dark:border-[#475569] dark:bg-[#1E293B] dark:text-[#F8FAFC] dark:focus:border-[#D6A84B] dark:focus:ring-[#D6A84B]',
        SIZE_CLASSES[size] ?? SIZE_CLASSES.compact,
        className
      )}
    >
      {children}
    </select>
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B] dark:text-[#CBD5E1]"
      viewBox="0 0 20 20"
      fill="none"
    >
      <path
        d="M6 8L10 12L14 8"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
    </svg>
  </div>
);

export default NativeSelect;
