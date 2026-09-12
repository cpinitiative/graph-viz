import { getNodeShapeBounds } from './nodeGeometry.js';

export const NODE_ARRANGEMENTS = Object.freeze([
  'left',
  'center-x',
  'right',
  'top',
  'center-y',
  'bottom',
  'distribute-x',
  'distribute-y',
]);

export const getNodeArrangementPatches = (
  nodes,
  selectedIds,
  operation,
  nodeRadius,
  labelFontSize
) => {
  if (!NODE_ARRANGEMENTS.includes(operation)) return {};
  const ids = new Set((selectedIds ?? []).map(String));
  const selected = (nodes ?? []).filter(node => ids.has(String(node.id)));
  if (selected.length < (operation.startsWith('distribute-') ? 3 : 2))
    return {};
  if (operation.startsWith('distribute-')) {
    const axis = operation.endsWith('x') ? 'x' : 'y';
    const ordered = selected
      .map((node, index) => ({ node, index }))
      .sort((a, b) => a.node[axis] - b.node[axis] || a.index - b.index);
    const first = ordered[0].node[axis];
    const span = ordered.at(-1).node[axis] - first;
    return Object.fromEntries(
      ordered.map(({ node }, index) => [
        String(node.id),
        { [axis]: first + (span * index) / (ordered.length - 1) },
      ])
    );
  }
  const bounds = selected.map(node =>
    getNodeShapeBounds(node, nodeRadius, labelFontSize)
  );
  const left = Math.min(...bounds.map(box => box.x));
  const right = Math.max(...bounds.map(box => box.x + box.width));
  const top = Math.min(...bounds.map(box => box.y));
  const bottom = Math.max(...bounds.map(box => box.y + box.height));
  return Object.fromEntries(
    selected.map((node, index) => {
      const box = bounds[index];
      const patch =
        operation === 'left'
          ? { x: left + box.width / 2 }
          : operation === 'right'
            ? { x: right - box.width / 2 }
            : operation === 'center-x'
              ? { x: (left + right) / 2 }
              : operation === 'top'
                ? { y: top + box.height / 2 }
                : operation === 'bottom'
                  ? { y: bottom - box.height / 2 }
                  : { y: (top + bottom) / 2 };
      return [String(node.id), patch];
    })
  );
};
