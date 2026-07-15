import {
  TEMPORAL_EDGE_OVERRIDE_KEYS,
  TEMPORAL_NODE_OVERRIDE_KEYS,
} from './temporalOverrideSchema.js';

/** Per-frame animation properties (step overrides). */
export const STEP_NODE_PROPS = new Set(TEMPORAL_NODE_OVERRIDE_KEYS);
export const STEP_EDGE_PROPS = new Set(TEMPORAL_EDGE_OVERRIDE_KEYS);

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
