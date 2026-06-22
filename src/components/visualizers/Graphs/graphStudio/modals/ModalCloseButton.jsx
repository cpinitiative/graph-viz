const ModalCloseButton = ({ onClick }) => (
  <button
    type="button"
    className="-m-2 flex h-9 w-9 shrink-0 items-center justify-center text-outline transition-colors hover:bg-[#F1F5F9] hover:text-on-surface dark:text-dark-outline dark:hover:bg-[#1E293B] dark:hover:text-dark-on-surface"
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
