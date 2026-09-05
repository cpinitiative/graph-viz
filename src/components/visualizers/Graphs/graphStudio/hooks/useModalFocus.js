import { useLayoutEffect, useRef } from 'react';
import { isEditableKeyboardTarget } from '../lib/keyboardTargets';

const focusable =
  'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])';

export const useModalFocus = (open, onClose) => {
  const ref = useRef(null);
  const closeRef = useRef(onClose);
  useLayoutEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);
  useLayoutEffect(() => {
    if (!open || !ref.current) return undefined;
    const shell = ref.current;
    const trigger = document.activeElement;
    const portal = shell.closest('[data-modal-portal]');
    const siblings = Array.from(document.body.children).filter(
      el => el !== portal && !el.contains(portal)
    );
    const previousInert = siblings.map(el => [el, el.inert]);
    siblings.forEach(el => {
      el.inert = true;
    });
    const targets = () =>
      Array.from(shell.querySelectorAll(focusable)).filter(
        el => el.getClientRects().length && !el.closest('[inert]')
      );
    (shell.querySelector('[data-autofocus]') ?? targets()[0] ?? shell).focus();
    const keydown = event => {
      if (portal?.inert) return;
      if (event.key === 'Escape' && !isEditableKeyboardTarget(event.target)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        closeRef.current?.();
      }
      if (event.key !== 'Tab') return;
      const elements = targets();
      const first = elements[0] ?? shell;
      const last = elements.at(-1) ?? shell;
      if (
        event.shiftKey &&
        (document.activeElement === first ||
          !shell.contains(document.activeElement))
      ) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last ||
          !shell.contains(document.activeElement))
      ) {
        event.preventDefault();
        first.focus();
      }
    };
    const containFocus = event => {
      if (portal?.inert) return;
      if (!shell.contains(event.target)) (targets()[0] ?? shell).focus();
    };
    document.addEventListener('keydown', keydown, true);
    document.addEventListener('focusin', containFocus);
    return () => {
      document.removeEventListener('keydown', keydown, true);
      document.removeEventListener('focusin', containFocus);
      previousInert.forEach(([el, inert]) => {
        el.inert = inert;
      });
      if (trigger?.isConnected && !trigger.closest('[inert]')) trigger.focus();
    };
  }, [open]);
  return ref;
};
