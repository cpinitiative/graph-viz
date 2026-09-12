import { useRef, useState } from 'react';
import { normalizeNumberInput } from '../lib/numberInput.js';

// Escape must mark cancellation synchronously before blur runs. React state
// alone still exposes the previous draft to an onBlur in the same event.
export const useCommittedNumberInput = ({
  value,
  onCommit,
  min,
  max,
  step,
}) => {
  const draftRef = useRef(null);
  const [draft, setDraft] = useState(null);
  const finish = () => {
    const current = draftRef.current;
    draftRef.current = null;
    setDraft(null);
    if (
      !current ||
      current.cancelled ||
      !current.dirty ||
      current.source !== value
    )
      return;
    const next = normalizeNumberInput(current.text, { min, max, step });
    if (next !== null && next !== Number(value)) onCommit(next);
  };
  return {
    value: draft?.source === value ? draft.text : String(value),
    onFocus: () => {
      const next = {
        source: value,
        text: String(value),
        dirty: false,
        cancelled: false,
      };
      draftRef.current = next;
      setDraft(next);
    },
    onChange: event => {
      const next = {
        source: value,
        text: event.target.value,
        dirty: true,
        cancelled: false,
      };
      draftRef.current = next;
      setDraft(next);
    },
    onBlur: finish,
    onKeyDown: event => {
      if (event.key !== 'Enter' && event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      if (event.key === 'Escape' && draftRef.current)
        draftRef.current.cancelled = true;
      event.currentTarget.blur();
    },
  };
};
