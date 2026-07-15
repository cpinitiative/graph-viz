export const TEMPORAL_NODE_OVERRIDE_KEYS = Object.freeze([
  'status',
  'color',
  'visible',
]);

// Edge status is part of the existing frame-property routing contract.
export const TEMPORAL_EDGE_OVERRIDE_KEYS = Object.freeze([
  'status',
  'color',
  'visible',
]);

const TEMPORAL_OVERRIDE_KEYS_BY_TYPE = {
  node: new Set(TEMPORAL_NODE_OVERRIDE_KEYS),
  edge: new Set(TEMPORAL_EDGE_OVERRIDE_KEYS),
};

const isRecord = value =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

export const isTemporalOverrideKey = (objectType, key) =>
  TEMPORAL_OVERRIDE_KEYS_BY_TYPE[objectType]?.has(key) === true;

export const sanitizeTemporalOverridePatch = (objectType, patch) => {
  if (!isRecord(patch)) return {};

  return Object.fromEntries(
    Object.entries(patch).filter(([key]) =>
      isTemporalOverrideKey(objectType, key)
    )
  );
};

export const sanitizeTemporalOverrideMap = (objectType, overrideMap) => {
  if (!isRecord(overrideMap)) return {};

  const sanitizedEntries = Object.entries(overrideMap).reduce(
    (entries, [id, patch]) => {
      const sanitizedPatch = sanitizeTemporalOverridePatch(objectType, patch);
      if (Object.keys(sanitizedPatch).length > 0) {
        entries.push([String(id), sanitizedPatch]);
      }
      return entries;
    },
    []
  );
  return Object.fromEntries(sanitizedEntries);
};
