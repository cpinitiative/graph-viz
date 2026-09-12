import {
  LOCAL_DRAFT_STORAGE_KEY,
  parseLocalDraftText,
} from './components/visualizers/Graphs/graphStudio/lib/localDraft.js';
import { exportProjectJson } from './components/visualizers/Graphs/graphStudio/lib/projectJson.js';

export const PRIMARY_HOSTNAME = 'graph.usaco.guide';
export const LEGACY_HOSTNAME = 'graph-viz.usaco.guide';
export const PRIMARY_ORIGIN = `https://${PRIMARY_HOSTNAME}`;
export const LEGACY_ORIGIN = `https://${LEGACY_HOSTNAME}`;

export const getCanonicalUrl = href => {
  const source = new URL(href);
  const target = new URL(PRIMARY_ORIGIN);
  target.pathname = source.pathname;
  target.search = source.search;
  target.hash = source.hash;
  return target.href;
};

// Read without modifying the old save. Even an unreadable draft must remain
// available for recovery instead of being discarded during a redirect.
export const readLegacyDraft = getStorage => {
  let raw;
  try {
    raw = getStorage().getItem(LOCAL_DRAFT_STORAGE_KEY);
  } catch {
    return { state: 'blocked' };
  }
  if (!raw) return { state: 'empty' };
  try {
    const draft = parseLocalDraftText(raw);
    return {
      state: 'saved',
      savedAt: draft.savedAt,
      filename: 'graph-studio-recovered.graphviz.json',
      contents: `${JSON.stringify(
        exportProjectJson({
          baseGraph: draft.project.graph,
          steps: draft.project.timeline.steps,
          currentFrame: draft.project.timeline.currentFrame,
          settings: draft.project.settings,
        }),
        null,
        2
      )}\n`,
    };
  } catch {
    return {
      state: 'invalid',
      filename: 'graph-studio-local-draft-backup.json',
      contents: raw,
    };
  }
};
