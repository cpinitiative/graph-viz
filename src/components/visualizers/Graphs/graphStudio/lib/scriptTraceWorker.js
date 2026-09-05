import { requireLimit } from './projectLimits.js';
import { GRAPH_STATE_COLORS } from './stateColors';

const SCRIPT_MAX_TRACE_ENTRIES = 1000;

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

self.onmessage = event => {
  try {
    const { code, graph } = event.data ?? {};
    const source = String(code ?? '');
    const safeGraph = deepFreeze(cloneSerializable(graph, 'api.graph'));
    const trace = [];
    let traceBytes = 0;
    const pushTrace = entry => {
      if (trace.length >= SCRIPT_MAX_TRACE_ENTRIES) {
        throw new Error(
          `Script generated too many events; limit is ${SCRIPT_MAX_TRACE_ENTRIES}`
        );
      }
      const serialized = JSON.stringify(entry);
      requireLimit(serialized.length, 65536, 'Trace event size');
      traceBytes += new TextEncoder().encode(serialized).byteLength;
      requireLimit(traceBytes, 1024 * 1024, 'Trace size in bytes');
      trace.push(JSON.parse(serialized));
    };
    const api = {
      graph: safeGraph,
      push: pushTrace,
      active: id => pushTrace({ type: 'node', id, status: 'active' }),
      visited: id => pushTrace({ type: 'node', id, status: 'visited' }),
      queued: id => pushTrace({ type: 'node', id, status: 'queued' }),
      edge: (id, color = GRAPH_STATE_COLORS.edgeHighlighted) =>
        pushTrace({ type: 'edge', id, color }),
    };
    const fn = new Function('api', `'use strict';\n${source}\n`);
    fn(api);
    self.postMessage({ ok: true, trace });
  } catch (error) {
    self.postMessage({
      ok: false,
      error:
        error && typeof error.message === 'string'
          ? error.message
          : 'Script execution failed',
    });
  }
};
