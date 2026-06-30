const ModalCloseButton = ({ onClick }) => (
  <button
    type="button"
    className="-m-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border border-transparent text-[#64748B] transition-colors hover:border-[#CBD5E1] hover:bg-[#F1F5F9] hover:text-[#0F172A] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0F2747] dark:text-[#94A3B8] dark:hover:border-[#475569] dark:hover:bg-[#1E293B] dark:hover:text-[#F8FAFC] dark:focus-visible:ring-[#60A5FA]"
    onClick={onClick}
    aria-label="Close"
  >
    <svg
      className="block"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  </button>
);

export default ModalCloseButton;
