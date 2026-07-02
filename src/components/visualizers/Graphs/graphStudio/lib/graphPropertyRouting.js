/** Per-frame animation properties (step overrides). */
export const STEP_NODE_PROPS = new Set(['status', 'color', 'visible']);
export const STEP_EDGE_PROPS = new Set(['status', 'color', 'visible']);

export const splitNodePatch = patch => {
  const basePatch = {};
  const stepUpdates = [];
  Object.entries(patch).forEach(([key, value]) => {
    if (STEP_NODE_PROPS.has(key)) {
      stepUpdates.push({ key, value });
    } else {
      basePatch[key] = value;
    }
  });
  return { basePatch, stepUpdates };
};

export const splitEdgePatch = patch => {
  const basePatch = {};
  const stepUpdates = [];
  Object.entries(patch).forEach(([key, value]) => {
    if (STEP_EDGE_PROPS.has(key)) {
      stepUpdates.push({ key, value });
    } else {
      basePatch[key] = value;
    }
  });
  return { basePatch, stepUpdates };
};
