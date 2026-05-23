/* eslint-disable react/prop-types */
import React from "react";

const ModalCloseButton = ({ onClick }) => (
  <button
    type="button"
    className="text-outline hover:text-on-surface"
    onClick={onClick}
    aria-label="Close"
  >
    <svg
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
