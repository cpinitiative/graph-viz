import {
  PROJECT_LIMITS,
  requireLimit,
  requireTextBudget,
} from './projectLimits.js';

const CELL_STYLES = {
  '#': { label: 'Wall #', color: '#334155' },
  '.': { label: 'Open cell .', color: '#F1F5F9' },
  A: { label: 'Start A', color: '#2563EB' },
  B: { label: 'Destination B', color: '#059669' },
  M: { label: 'Monster M', color: '#DC2626' },
};
const cellId = (row, column) => `r${row + 1}c${column + 1}`;
const stateId = mark =>
  `grid-${mark === '#' ? 'wall' : mark === '.' ? 'floor' : mark.toLowerCase()}`;

export const parseAsciiGridText = text => {
  const source = String(text ?? '').replace(/^\uFEFF/, '');
  requireTextBudget(source, 'ASCII grid');
  const rawLines = source.split(/\r?\n/);
  let firstRow = 0;
  let endRow = rawLines.length;
  while (firstRow < endRow && !rawLines[firstRow].trim()) firstRow += 1;
  while (endRow > firstRow && !rawLines[endRow - 1].trim()) endRow -= 1;
  const lines = rawLines.slice(firstRow, endRow);
  if (!lines.length)
    throw new Error(
      'Paste a grid using #, ., A, B, and M. A rows columns header is optional.'
    );

  let declaredRows = null;
  let declaredColumns = null;
  if (/^\s*[+-]?\d+\s+[+-]?\d+\s*$/.test(lines[0])) {
    [declaredRows, declaredColumns] = lines
      .shift()
      .trim()
      .split(/\s+/)
      .map(Number);
    if (
      ![declaredRows, declaredColumns].every(
        value => Number.isSafeInteger(value) && value >= 1
      )
    ) {
      throw new Error('Grid rows and columns must be positive integers.');
    }
    requireLimit(
      declaredRows * declaredColumns,
      PROJECT_LIMITS.nodes,
      'Grid cell count (including walls)'
    );
    if (lines.length !== declaredRows)
      throw new Error(
        `Header declares ${declaredRows} grid rows but found ${lines.length}.`
      );
  }
  const rows = lines.length;
  const columns = declaredColumns ?? lines[0].length;
  requireLimit(
    rows * columns,
    PROJECT_LIMITS.nodes,
    'Grid cell count (including walls)'
  );
  let starts = 0;
  let destinations = 0;
  lines.forEach((line, row) => {
    if (line.length !== columns)
      throw new Error(
        `Grid row ${row + 1} has ${line.length} cells; expected ${columns}. Keep all rows the same width.`
      );
    const invalidColumn = [...line].findIndex(
      mark => !Object.hasOwn(CELL_STYLES, mark)
    );
    if (invalidColumn >= 0)
      throw new Error(
        `Grid row ${row + 1}, column ${invalidColumn + 1}: use only #, ., A, B, or M; spaces are not cells.`
      );
    starts += [...line].filter(mark => mark === 'A').length;
    destinations += [...line].filter(mark => mark === 'B').length;
  });
  if (starts > 1) throw new Error('A grid can have at most one start A.');
  if (destinations > 1)
    throw new Error('A grid can have at most one destination B.');

  // Validate the full map before allocating graph objects or replacing a project.
  const nodes = [];
  const edges = [];
  const usedMarks = new Set();
  lines.forEach((line, row) => {
    [...line].forEach((mark, column) => {
      usedMarks.add(mark);
      nodes.push({
        id: cellId(row, column),
        label: mark,
        shape: 'square',
        annotationPlacement: 'below',
        x: 96 + column * 72,
        y: 96 + row * 72,
        color: CELL_STYLES[mark].color,
        stateId: stateId(mark),
        visible: true,
      });
      if (mark === '#') return;
      for (const [nextRow, nextColumn] of [
        [row, column + 1],
        [row + 1, column],
      ]) {
        if (
          nextRow >= rows ||
          nextColumn >= columns ||
          lines[nextRow][nextColumn] === '#'
        )
          continue;
        edges.push({
          id: `grid-${cellId(row, column)}-${cellId(nextRow, nextColumn)}`,
          from: cellId(row, column),
          to: cellId(nextRow, nextColumn),
          label: '',
          directed: false,
          color: '#94A3B8',
          visible: true,
        });
        requireLimit(edges.length, PROJECT_LIMITS.edges, 'Grid edge count');
      }
    });
  });
  const usedStyles = Object.entries(CELL_STYLES).filter(([mark]) =>
    usedMarks.has(mark)
  );
  return {
    graph: { nodes, edges },
    meta: `${rows} × ${columns} grid / ${nodes.length} cells / ${edges.length} open-cell connections`,
    settings: {
      edgeRouting: 'straight',
      snapEnabled: false,
      showGrid: false,
      globalSettings: { nodeSize: 24, nodeLabelFontSize: 14 },
      visualStates: usedStyles.map(([mark, style]) => ({
        id: stateId(mark),
        kind: 'node',
        label: style.label,
        color: style.color,
        pinned: false,
      })),
      customLegend: {
        enabled: true,
        mode: 'smart',
        title: 'Grid cells',
        layout: 'compact',
        position: 'top-left',
      },
    },
  };
};
