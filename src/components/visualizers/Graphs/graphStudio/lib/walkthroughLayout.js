// A compact key uses the space its labels need, instead of equal-width columns.
// Keep these measurements deterministic in the editor and SVG exports.
export const getCompactLegendLayout = (title, entries, maxWidth) => {
  const padding = 14;
  const gap = 16;
  const available = Math.max(1, maxWidth - padding * 2);
  const titleWidth = Math.min(available, title.length * 7.7);
  const widths = entries.map(entry =>
    Math.min(available, 32 + entry.label.length * 6.6)
  );
  const inlineWidth =
    titleWidth +
    24 +
    widths.reduce((sum, width) => sum + width, 0) +
    Math.max(0, widths.length - 1) * gap;
  const inline = inlineWidth <= available;
  const rows = [];
  let row = [];
  let rowWidth = 0;
  widths.forEach((width, index) => {
    if (row.length && rowWidth + gap + width > available) {
      rows.push({ entries: row, width: rowWidth });
      row = [];
      rowWidth = 0;
    }
    row.push({ index, x: rowWidth + (row.length ? gap : 0) });
    rowWidth += (row.length > 1 ? gap : 0) + width;
  });
  if (row.length) rows.push({ entries: row, width: rowWidth });
  const width = Math.min(
    maxWidth,
    (inline
      ? inlineWidth
      : Math.max(titleWidth, ...rows.map(item => item.width))) +
      padding * 2
  );
  const positions = [];
  rows.forEach((item, rowIndex) =>
    item.entries.forEach(entry => {
      positions[entry.index] = {
        x:
          (inline ? padding + titleWidth + 24 : (width - item.width) / 2) +
          entry.x,
        y: inline ? 21 : 45 + rowIndex * 24,
      };
    })
  );
  return {
    width,
    height: inline ? 42 : 36 + rows.length * 24,
    titleX: inline ? padding : width / 2,
    titleY: inline ? 25 : 22,
    titleAnchor: inline ? 'start' : 'middle',
    positions,
  };
};

export const splitWalkthroughCaption = text => {
  const separator = text.indexOf(' · ');
  return separator < 0
    ? { title: text, detail: '' }
    : { title: text.slice(0, separator), detail: text.slice(separator + 3) };
};
