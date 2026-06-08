export const HISTORY_LIMIT = 120;

export const cloneJson = value => JSON.parse(JSON.stringify(value));

export const snapshotTimelineState = ({ baseGraph, steps, currentFrame }) => ({
  baseGraph: cloneJson(baseGraph ?? { nodes: [], edges: [] }),
  steps: cloneJson(steps ?? []),
  currentFrame: Number.isFinite(Number(currentFrame))
    ? Number(currentFrame)
    : 0,
});
