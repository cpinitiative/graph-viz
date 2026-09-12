import { track } from '@vercel/analytics';

export const ANALYTICS_OPT_OUT_KEY = 'va-disable';

export const USAGE_EVENTS = Object.freeze({
  exportCompleted: 'Export Completed',
  presetLoaded: 'Preset Loaded',
  projectImported: 'Project Imported',
  projectStarted: 'Project Started',
  timelineCreated: 'Timeline Created',
});

const PROJECT_SOURCES = new Set([
  'canvas',
  'export',
  'parser',
  'script',
  'timeline',
]);
const TIMELINE_SOURCES = new Set(['manual', 'script']);
const EXPORT_FORMATS = new Set([
  'edge-list',
  'mp4',
  'png',
  'pptx',
  'project',
  'svg',
]);
const PRESET_IDS = new Set([
  'blank',
  'bfs',
  'connected-components',
  'dfs',
  'dijkstra',
  'dijkstra-shortest-paths',
  'disjoint-set-union',
  'kruskal-mst',
  'multigraph',
  'topological-sort',
]);

const EVENT_SCHEMAS = Object.freeze({
  [USAGE_EVENTS.exportCompleted]: {
    properties: { format: EXPORT_FORMATS },
    required: ['format'],
  },
  [USAGE_EVENTS.presetLoaded]: {
    properties: { preset: PRESET_IDS },
    required: ['preset'],
  },
  [USAGE_EVENTS.projectImported]: { properties: {}, required: [] },
  [USAGE_EVENTS.projectStarted]: {
    properties: { source: PROJECT_SOURCES },
    required: ['source'],
  },
  [USAGE_EVENTS.timelineCreated]: {
    properties: { source: TIMELINE_SOURCES },
    required: ['source'],
  },
});

export const shouldEnableWebAnalytics = hostname => {
  const normalizedHostname = String(hostname ?? '').toLowerCase();
  return normalizedHostname === 'graph.usaco.guide';
};

export const stripAnalyticsUrlDetails = event => {
  if (!event?.url) return event;
  try {
    const url = new URL(event.url);
    url.search = '';
    url.hash = '';
    return { ...event, url: url.toString() };
  } catch {
    return null;
  }
};

export const prepareAnalyticsEvent = event => {
  try {
    if (window.localStorage.getItem(ANALYTICS_OPT_OUT_KEY)) return null;
  } catch {
    // Analytics remains anonymous when storage is unavailable.
  }
  return stripAnalyticsUrlDetails(event);
};

const sanitizeEventProperties = (schema, properties) => {
  const sanitized = {};
  Object.entries(schema.properties).forEach(([key, allowedValues]) => {
    const value = properties?.[key];
    if (allowedValues.has(value)) sanitized[key] = value;
  });
  const hasRequiredProperties = schema.required.every(
    key => sanitized[key] !== undefined
  );
  return hasRequiredProperties ? sanitized : null;
};

export const trackUsageEvent = (eventName, properties, trackEvent = track) => {
  const schema = EVENT_SCHEMAS[eventName];
  if (!schema) return false;
  const sanitized = sanitizeEventProperties(schema, properties);
  if (!sanitized) return false;
  try {
    if (Object.keys(sanitized).length) trackEvent(eventName, sanitized);
    else trackEvent(eventName);
    return true;
  } catch {
    // Metrics must never interrupt authoring or exports.
    return false;
  }
};

export const createProjectUsageTracker = ({
  initialProjectStarted = false,
  initialHasTimeline = false,
  emit = trackUsageEvent,
} = {}) => {
  let projectStarted = Boolean(initialProjectStarted);
  let timelineCreated = Boolean(initialHasTimeline);

  const resetProject = ({
    alreadyStarted = false,
    hasTimeline = false,
  } = {}) => {
    projectStarted = Boolean(alreadyStarted);
    timelineCreated = Boolean(hasTimeline);
  };

  const markProjectStarted = source => {
    if (projectStarted) return false;
    const recorded = emit(USAGE_EVENTS.projectStarted, { source });
    if (recorded) projectStarted = true;
    return recorded;
  };

  const markTimelineCreated = source => {
    markProjectStarted(source === 'script' ? 'script' : 'timeline');
    if (timelineCreated) return false;
    const recorded = emit(USAGE_EVENTS.timelineCreated, { source });
    if (recorded) timelineCreated = true;
    return recorded;
  };

  return {
    getState: () => ({ projectStarted, timelineCreated }),
    markProjectStarted,
    markTimelineCreated,
    recordExport(format) {
      markProjectStarted('export');
      return emit(USAGE_EVENTS.exportCompleted, { format });
    },
    recordGeneratedProject(source, { hasTimeline = false } = {}) {
      resetProject({ hasTimeline });
      return markProjectStarted(source);
    },
    recordPresetLoaded(preset, { hasTimeline = false } = {}) {
      resetProject({ hasTimeline });
      return emit(USAGE_EVENTS.presetLoaded, { preset });
    },
    recordProjectImported({ hasTimeline = false } = {}) {
      resetProject({ alreadyStarted: true, hasTimeline });
      return emit(USAGE_EVENTS.projectImported);
    },
    resetProject,
  };
};
