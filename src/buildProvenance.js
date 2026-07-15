/* global __GRAPH_STUDIO_BUILD__ */

const normalizeValue = value =>
  typeof value === 'string' && value.trim() ? value.trim() : 'unknown';

const injectedBuild =
  typeof __GRAPH_STUDIO_BUILD__ === 'object' && __GRAPH_STUDIO_BUILD__ !== null
    ? __GRAPH_STUDIO_BUILD__
    : {};

export const GRAPH_STUDIO_BUILD = Object.freeze({
  commitSha: normalizeValue(injectedBuild.commitSha),
  buildTimestamp: normalizeValue(injectedBuild.buildTimestamp),
  environment: normalizeValue(injectedBuild.environment),
});
