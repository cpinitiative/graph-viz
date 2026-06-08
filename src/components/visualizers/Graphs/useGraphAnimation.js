import { useCallback, useMemo, useState } from 'react';

const clampFrame = (frame, count) => {
  if (!count) return 0;
  return Math.max(0, Math.min(frame, count - 1));
};

const cloneStep = step => JSON.parse(JSON.stringify(step ?? {}));

let stepIdSeed = 0;

const createStepId = () => `step-${Date.now()}-${(stepIdSeed += 1)}`;

const normalizeAnimationStep = (step = {}, index = 0) => {
  const cloned = cloneStep(step);
  return {
    ...cloned,
    id: String(cloned?.id ?? createStepId()),
    description: String(cloned?.description ?? `Step ${index + 1}`),
    durationMs: Number.isFinite(Number(cloned?.durationMs))
      ? Number(cloned.durationMs)
      : 600,
    nodeOverrides:
      cloned?.nodeOverrides && typeof cloned.nodeOverrides === 'object'
        ? cloned.nodeOverrides
        : {},
    edgeOverrides:
      cloned?.edgeOverrides && typeof cloned.edgeOverrides === 'object'
        ? cloned.edgeOverrides
        : {},
  };
};

const normalizeAnimationSteps = (steps = []) => {
  const normalized = (Array.isArray(steps) ? steps : []).map((step, index) =>
    normalizeAnimationStep(step, index)
  );
  const seenIds = new Set();
  return normalized.map(step => {
    if (!seenIds.has(step.id)) {
      seenIds.add(step.id);
      return step;
    }
    const nextId = createStepId();
    seenIds.add(nextId);
    return { ...step, id: nextId };
  });
};

const setByPath = (target, path, value) => {
  const segments = String(path)
    .split('.')
    .map(item => item.trim())
    .filter(Boolean);
  if (!segments.length) return target;
  let cursor = target;
  for (let i = 0; i < segments.length - 1; i += 1) {
    const segment = segments[i];
    if (
      cursor[segment] === undefined ||
      cursor[segment] === null ||
      typeof cursor[segment] !== 'object'
    ) {
      cursor[segment] = {};
    }
    cursor = cursor[segment];
  }
  cursor[segments[segments.length - 1]] = value;
  return target;
};

/**
 * @typedef {Object} BaseGraphNode
 * @property {string|number} id
 * @property {number} x
 * @property {number} y
 * @property {string} [label]
 * @property {string} [color]
 * @property {boolean} [visible]
 */

/**
 * @typedef {Object} BaseGraphEdge
 * @property {string} id
 * @property {string|number} from
 * @property {string|number} to
 * @property {boolean} [directed]
 * @property {string} [label]
 * @property {string} [color]
 * @property {number} [duration]
 * @property {boolean} [visible]
 */

/**
 * @typedef {Object} BaseGraph
 * @property {BaseGraphNode[]} nodes
 * @property {BaseGraphEdge[]} edges
 */

/**
 * @typedef {Object} AnimationStep
 * @property {string} [id]
 * @property {Record<string, Partial<BaseGraphNode>>} [nodeOverrides]
 * @property {Record<string, Partial<BaseGraphEdge>>} [edgeOverrides]
 * @property {string} [description]
 */
export const computeGraphAtStep = (baseGraph, step) => {
  const nodeOverrides = step?.nodeOverrides ?? {};
  const edgeOverrides = step?.edgeOverrides ?? {};
  const nodes = (baseGraph?.nodes ?? []).map(node => ({
    ...node,
    ...(nodeOverrides[String(node.id)] ?? {}),
    id: node.id,
  }));
  const edges = (baseGraph?.edges ?? []).map(edge => ({
    ...edge,
    ...(edgeOverrides[String(edge.id)] ?? {}),
    id: edge.id,
    from: edge.from,
    to: edge.to,
  }));
  return { nodes, edges };
};

export const useGraphAnimation = (initialBaseGraph, initialSteps = []) => {
  const [baseGraph, setBaseGraph] = useState(initialBaseGraph);
  const [steps, setSteps] = useState(() => {
    const normalized = normalizeAnimationSteps(initialSteps);
    return normalized.length ? normalized : [normalizeAnimationStep({}, 0)];
  });
  const [currentFrame, setCurrentFrame] = useState(0);
  const frameCount = steps.length;
  const computedGraph = useMemo(
    () => computeGraphAtStep(baseGraph, steps[currentFrame] ?? {}),
    [baseGraph, steps, currentFrame]
  );
  const getFrameGraph = useCallback(
    frameIndex =>
      computeGraphAtStep(
        baseGraph,
        steps[clampFrame(frameIndex, frameCount)] ?? {}
      ),
    [baseGraph, steps, frameCount]
  );
  const addStep = useCallback(index => {
    setSteps(prev => {
      const next = prev.length ? [...prev] : [normalizeAnimationStep({}, 0)];
      const insertAt = Math.max(0, Math.min(Number(index) + 1, next.length));
      next.splice(insertAt, 0, normalizeAnimationStep({}, insertAt));
      return next;
    });
  }, []);
  const updateStep = useCallback((index, property, value) => {
    setSteps(prev => {
      if (!prev.length) return prev;
      const frameIndex = clampFrame(index, prev.length);
      const next = [...prev];
      const draft = cloneStep(next[frameIndex]);
      if (typeof property === 'string') {
        setByPath(draft, property, value);
      } else if (property && typeof property === 'object') {
        Object.assign(draft, property);
      }
      next[frameIndex] = draft;
      return next;
    });
  }, []);
  const duplicateStep = useCallback(index => {
    setSteps(prev => {
      if (!prev.length) return prev;
      const frameIndex = clampFrame(index, prev.length);
      const next = [...prev];
      const duplicated = normalizeAnimationStep(
        cloneStep(next[frameIndex]),
        frameIndex + 1
      );
      duplicated.id = createStepId();
      next.splice(frameIndex + 1, 0, duplicated);
      return next;
    });
  }, []);
  const removeStep = useCallback(index => {
    setSteps(prev => {
      if (prev.length <= 1) return prev;
      const frameIndex = clampFrame(index, prev.length);
      const next = [...prev];
      next.splice(frameIndex, 1);
      return next.length ? next : [normalizeAnimationStep({}, 0)];
    });
  }, []);
  const moveStep = useCallback((fromIndex, toIndex) => {
    setSteps(prev => {
      if (prev.length <= 1) return prev;
      const from = clampFrame(fromIndex, prev.length);
      const to = clampFrame(toIndex, prev.length);
      if (from === to) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }, []);
  const replaceTimeline = useCallback((nextBaseGraph, nextSteps = [{}]) => {
    setBaseGraph(nextBaseGraph);
    const normalized = normalizeAnimationSteps(nextSteps);
    setSteps(normalized.length ? normalized : [normalizeAnimationStep({}, 0)]);
    setCurrentFrame(0);
  }, []);
  const setFrame = useCallback(
    nextFrame => {
      setCurrentFrame(clampFrame(nextFrame, frameCount));
    },
    [frameCount]
  );
  return {
    baseGraph,
    setBaseGraph,
    steps,
    setSteps,
    frameCount,
    currentFrame,
    setCurrentFrame: setFrame,
    computedGraph,
    getFrameGraph,
    addStep,
    updateStep,
    duplicateStep,
    removeStep,
    moveStep,
    replaceTimeline,
  };
};
