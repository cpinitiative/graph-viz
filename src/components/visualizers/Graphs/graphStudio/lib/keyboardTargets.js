export const isEditableKeyboardTarget = target => {
  const tagName = String(target?.tagName ?? '').toLowerCase();
  const editableAncestor = target?.closest?.('[contenteditable]');

  return (
    tagName === 'input' ||
    tagName === 'textarea' ||
    tagName === 'select' ||
    target?.isContentEditable ||
    (editableAncestor &&
      editableAncestor.getAttribute('contenteditable') !== 'false')
  );
};

export const hasOpenModal = () =>
  Boolean(document.querySelector('[aria-modal="true"], [role="dialog"]'));
