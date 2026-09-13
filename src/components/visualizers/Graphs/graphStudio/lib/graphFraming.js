// Reserve space for captions and legends when explicitly fitting the graph.
// Keeping this independent of node bounds prevents a frame's text from moving
// the camera during viewport-based timeline export.
const OVERLAY_CLEARANCE = 12;
const MIN_CONTENT_HEIGHT = 60;

const isDockedOverlay = box => box.dock === 'top' || box.dock === 'bottom';

const reserveDockedBands = (viewport, obstacles) => {
  const viewportBottom = viewport.y + viewport.height;
  let top = viewport.y;
  let bottom = viewportBottom;
  for (const box of obstacles) {
    if (
      !isDockedOverlay(box) ||
      box.x + box.width <= viewport.x ||
      box.x >= viewport.x + viewport.width ||
      box.y + box.height <= viewport.y ||
      box.y >= viewportBottom
    )
      continue;
    if (box.dock === 'top') {
      top = Math.max(
        top,
        Math.min(viewportBottom, box.y + box.height + OVERLAY_CLEARANCE)
      );
    } else {
      bottom = Math.min(
        bottom,
        Math.max(viewport.y, box.y - OVERLAY_CLEARANCE)
      );
    }
  }

  const minimumHeight = Math.min(MIN_CONTENT_HEIGHT, viewport.height);
  if (bottom - top >= minimumHeight) {
    return { ...viewport, y: top, height: bottom - top };
  }

  // Tiny panels cannot always contain both overlays and the graph. Keep the
  // fallback usable and inside the viewport rather than fitting a negative gap.
  const center = Math.max(
    viewport.y + minimumHeight / 2,
    Math.min(viewportBottom - minimumHeight / 2, (top + bottom) / 2)
  );
  return { ...viewport, y: center - minimumHeight / 2, height: minimumHeight };
};

export const getUnobscuredViewport = (viewport, obstacles = []) => {
  // Explicit docks reserve horizontal bands together, so a short caption cannot
  // shift the graph sideways and DOM order cannot change the reserved space.
  // Unmarked/custom overlays retain the existing floating-overlay policy.
  let area = reserveDockedBands(viewport, obstacles);
  for (const box of obstacles.filter(box => !isDockedOverlay(box))) {
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
      dock: el.getAttribute('data-overlay-dock'),
    };
  });
  return getUnobscuredViewport(viewport, obstacles);
};
