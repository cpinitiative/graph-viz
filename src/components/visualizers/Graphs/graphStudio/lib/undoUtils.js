export const HISTORY_LIMIT = 120;

const NON_TEXT_INPUT_TYPES = new Set([
  'button',
  'checkbox',
  'color',
  'file',
  'hidden',
  'image',
  'radio',
  'range',
  'reset',
  'submit',
]);

export const cloneJson = value => JSON.parse(JSON.stringify(value));

export const snapshotTimelineState = ({ baseGraph, steps, settings }) => ({
  baseGraph: cloneJson(baseGraph ?? { nodes: [], edges: [] }),
  steps: cloneJson(steps ?? []),
  settings: cloneJson(settings ?? {}),
});

export const isTextEditingUndoTarget = target => {
  if (target?.isContentEditable) return true;

  const tagName = String(target?.tagName ?? '').toLowerCase();
  if (tagName === 'textarea') return true;
  if (tagName !== 'input') return false;

  const inputType = String(target?.type ?? 'text').toLowerCase();
  return !NON_TEXT_INPUT_TYPES.has(inputType);
};
