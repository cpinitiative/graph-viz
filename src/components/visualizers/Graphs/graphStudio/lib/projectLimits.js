export const PROJECT_LIMITS = Object.freeze({
  bytes: 16 * 1024 * 1024,
  nodes: 1000,
  edges: 5000,
  frames: 1001,
  label: 200,
  description: 10000,
  overrides: 500000,
});

export const requireLimit = (count, limit, label) => {
  if (count > limit)
    throw new Error(
      `${label} exceeds the limit of ${limit.toLocaleString('en-US')}`
    );
};

export const requireTextBudget = (text, label = 'Project') => {
  requireLimit(text.length, PROJECT_LIMITS.bytes, `${label} size`);
  requireLimit(
    new TextEncoder().encode(text).byteLength,
    PROJECT_LIMITS.bytes,
    `${label} size in bytes`
  );
};
