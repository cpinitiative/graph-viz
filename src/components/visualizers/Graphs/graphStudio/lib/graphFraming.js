// Reserve space for captions and legends when explicitly fitting the graph.
// Keeping this independent of node bounds prevents a frame's text from moving
// the camera during viewport-based timeline export.
export const getUnobscuredViewport = (viewport, obstacles = []) => {
  let area = { ...viewport };
  for (const box of obstacles) {
    const left = Math.max(area.x, box.x - 12),
      right = Math.min(area.x + area.width, box.x + box.width + 12);
    const top = Math.max(area.y, box.y - 12),
      bottom = Math.min(area.y + area.height, box.y + box.height + 12);
    if (right <= left || bottom <= top) continue;
    const candidates = [
      { ...area, width: left - area.x },
      { ...area, x: right, width: area.x + area.width - right },
      { ...area, height: top - area.y },
      { ...area, y: bottom, height: area.y + area.height - bottom },
    ].filter(r => r.width >= 80 && r.height >= 60);
    if (candidates.length)
      area = candidates.sort(
        (a, b) => b.width * b.height - a.width * a.height
      )[0];
  }
  return area;
};

export const getGraphContentViewport = (svg, viewport) => {
  const obstacles = [
    ...svg.querySelectorAll('[data-legend-position], [data-caption-overlay]'),
  ].map(el => {
    const box = el.getBBox(),
      matrix = el.transform.baseVal.consolidate()?.matrix;
    return {
      x: box.x + (matrix?.e ?? 0),
      y: box.y + (matrix?.f ?? 0),
      width: box.width,
      height: box.height,
    };
  });
  return getUnobscuredViewport(viewport, obstacles);
};
