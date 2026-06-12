import { GRAPH_STATE_COLORS } from './stateColors';

const SCRIPT_MAX_LENGTH = 20000;
const SCRIPT_MAX_TRACE_ENTRIES = 1000;
export const DEFAULT_SCRIPT_TIMEOUT_MS = 2000;
const SCRIPT_TIMEOUT_ERROR =
  'Script timed out. Check for infinite loops or expensive work.';
const SCRIPT_NODE_STATUSES = new Set([
  'default',
  'active',
  'queued',
  'visited',
  'discarded',
]);

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const cloneSerializable = (value, label) => {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    throw new Error(`${label} must be JSON-serializable`);
  }
};

const deepFreeze = value => {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) {
    return value;
  }
  Object.freeze(value);
  Object.values(value).forEach(deepFreeze);
  return value;
};

const validateScriptSource = code => {
  const source = String(code ?? '');
  if (!source.trim()) {
    throw new Error('Script cannot be empty');
  }
  if (source.length > SCRIPT_MAX_LENGTH) {
    throw new Error(
      `Script is too large; keep it under ${SCRIPT_MAX_LENGTH} characters`
    );
  }
  return source;
};

const normalizeScriptTimeout = timeoutMs => {
  if (timeoutMs === undefined) return DEFAULT_SCRIPT_TIMEOUT_MS;
  const value = Number(timeoutMs);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error('timeoutMs must be a positive finite number');
  }
  return value;
};

const normalizeScriptDuration = durationMs => {
  if (durationMs === undefined) return undefined;
  const value = Number(durationMs);
  if (!Number.isFinite(value)) {
    throw new Error('durationMs must be a finite number');
  }
  return clamp(value, 80, 8000);
};

const validateOverrideMap = ({ label, overrides, knownIds }) => {
  if (overrides === undefined || overrides === null) return {};
  if (
    typeof overrides !== 'object' ||
    Array.isArray(overrides) ||
    overrides instanceof Date
  ) {
    throw new Error(`${label} must be an object keyed by id`);
  }

  return Object.entries(overrides).reduce((acc, [id, patch]) => {
    if (!knownIds.has(String(id))) {
      throw new Error(`${label} references unknown id "${id}"`);
    }
    if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
      throw new Error(`${label}.${id} must be an object`);
    }
    acc[String(id)] = cloneSerializable(patch, `${label}.${id}`);
    return acc;
  }, {});
};

const validateScriptTraceEntry = (entry, context) => {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
    throw new Error('Trace entries must be objects');
  }

  const type = String(entry.type ?? '');
  const description =
    entry.description === undefined ? undefined : String(entry.description);
  const durationMs = normalizeScriptDuration(entry.durationMs);

  if (type === 'node') {
    const id = String(entry.id ?? '');
    if (!context.nodeIds.has(id)) {
      throw new Error(`Trace references unknown node "${entry.id}"`);
    }
    const status = String(entry.status ?? 'active');
    if (!SCRIPT_NODE_STATUSES.has(status)) {
      throw new Error(`Unsupported node status "${status}"`);
    }
    return {
      type,
      id,
      status,
      color: typeof entry.color === 'string' ? entry.color : undefined,
      description,
      durationMs,
    };
  }

  if (type === 'edge') {
    const id = String(entry.id ?? '');
    if (!context.edgeIds.has(id)) {
      throw new Error(`Trace references unknown edge "${entry.id}"`);
    }
    return {
      type,
      id,
      color:
        typeof entry.color === 'string'
          ? entry.color
          : GRAPH_STATE_COLORS.edgeHighlighted,
      description,
      durationMs,
    };
  }

  if (type === 'patch') {
    return {
      type,
      description,
      durationMs,
      nodeOverrides: validateOverrideMap({
        label: 'nodeOverrides',
        overrides: entry.nodeOverrides,
        knownIds: context.nodeIds,
      }),
      edgeOverrides: validateOverrideMap({
        label: 'edgeOverrides',
        overrides: entry.edgeOverrides,
        knownIds: context.edgeIds,
      }),
    };
  }

  throw new Error(`Unsupported trace entry type "${type || 'missing'}"`);
};

const createScriptContext = graph => ({
  nodeIds: new Set((graph.nodes ?? []).map(node => String(node.id))),
  edgeIds: new Set((graph.edges ?? []).map(edge => String(edge.id))),
});

const validateWorkerTrace = ({ trace, context }) => {
  if (!Array.isArray(trace)) {
    throw new Error('Script worker returned an invalid trace');
  }
  if (trace.length > SCRIPT_MAX_TRACE_ENTRIES) {
    throw new Error(
      `Script generated too many events; limit is ${SCRIPT_MAX_TRACE_ENTRIES}`
    );
  }

  return trace.map(entry => validateScriptTraceEntry(entry, context));
};

const runScriptTraceWorker = ({ source, graph, timeoutMs }) =>
  new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL('./scriptTraceWorker.js', import.meta.url),
      {
        type: 'module',
      }
    );
    let settled = false;

    const finish = callback => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      worker.terminate();
      callback();
    };

    const timeoutId = setTimeout(() => {
      finish(() => reject(new Error(SCRIPT_TIMEOUT_ERROR)));
    }, timeoutMs);

    worker.onmessage = event => {
      finish(() => {
        const payload = event.data;
        if (!payload || typeof payload !== 'object') {
          reject(new Error('Script worker returned an invalid response'));
          return;
        }
        if (payload.ok) {
          resolve(payload.trace);
          return;
        }
        reject(new Error(String(payload.error || 'Script execution failed')));
      });
    };

    worker.onerror = event => {
      finish(() => {
        reject(new Error(event.message || 'Script worker failed'));
      });
    };

    worker.postMessage({ code: source, graph });
  });

const buildTimelineSteps = trace => {
  const steps = [
    {
      id: 'step-0',
      description: 'Initial',
      durationMs: 600,
      nodeOverrides: {},
      edgeOverrides: {},
    },
  ];
  trace.forEach((entry, index) => {
    const previous = steps[steps.length - 1];
    const next = {
      id: `step-${index + 1}`,
      description: String(entry.description ?? `${entry.type} ${entry.id}`),
      durationMs: clamp(Number(entry.durationMs ?? 650), 80, 8000),
      nodeOverrides: JSON.parse(JSON.stringify(previous.nodeOverrides ?? {})),
      edgeOverrides: JSON.parse(JSON.stringify(previous.edgeOverrides ?? {})),
    };
    if (entry.type === 'node') {
      next.nodeOverrides[String(entry.id)] = {
        ...(next.nodeOverrides[String(entry.id)] ?? {}),
        status: entry.status ?? 'active',
        color: entry.color,
      };
    }
    if (entry.type === 'edge') {
      next.edgeOverrides[String(entry.id)] = {
        ...(next.edgeOverrides[String(entry.id)] ?? {}),
        color: entry.color ?? GRAPH_STATE_COLORS.edgeHighlighted,
      };
    }
    if (entry.type === 'patch') {
      next.nodeOverrides = {
        ...next.nodeOverrides,
        ...(entry.nodeOverrides ?? {}),
      };
      next.edgeOverrides = {
        ...next.edgeOverrides,
        ...(entry.edgeOverrides ?? {}),
      };
    }
    steps.push(next);
  });
  return steps;
};

export const runScriptTrace = async ({ code, graph, timeoutMs }) => {
  const source = validateScriptSource(code);
  const normalizedTimeoutMs = normalizeScriptTimeout(timeoutMs);
  const safeGraph = deepFreeze(cloneSerializable(graph, 'api.graph'));
  const context = createScriptContext(safeGraph);
  const rawTrace = await runScriptTraceWorker({
    source,
    graph: safeGraph,
    timeoutMs: normalizedTimeoutMs,
  });
  const trace = validateWorkerTrace({ trace: rawTrace, context });
  return buildTimelineSteps(trace);
};
