import { validateProjectPayload } from './projectJson.js';

export const LOCAL_DRAFT_STORAGE_KEY = 'graph-viz:editor:draft:v1';
export const LOCAL_DRAFT_FORMAT = 'graph-viz-local-draft';
export const LOCAL_DRAFT_VERSION = 1;

const isRecord = value =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const normalizeSavedAt = value => {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    throw new Error('Local draft has an invalid save time');
  }
  return date.toISOString();
};

export const createLocalDraftEnvelope = ({ project, savedAt = new Date() }) => {
  validateProjectPayload(project);
  return {
    format: LOCAL_DRAFT_FORMAT,
    version: LOCAL_DRAFT_VERSION,
    savedAt: normalizeSavedAt(savedAt),
    project,
  };
};

export const parseLocalDraftText = text => {
  let envelope;
  try {
    envelope = JSON.parse(String(text ?? ''));
  } catch {
    throw new Error('Local draft contains invalid JSON');
  }

  if (!isRecord(envelope) || envelope.format !== LOCAL_DRAFT_FORMAT) {
    throw new Error('Unsupported local draft format');
  }
  if (envelope.version !== LOCAL_DRAFT_VERSION) {
    throw new Error(`Unsupported local draft version "${envelope.version}"`);
  }

  return {
    savedAt: normalizeSavedAt(envelope.savedAt),
    project: validateProjectPayload(envelope.project),
  };
};

export const readLocalDraft = storage => {
  if (!storage?.getItem) return { draft: null, error: null };
  let storedValue;
  try {
    storedValue = storage.getItem(LOCAL_DRAFT_STORAGE_KEY);
  } catch (error) {
    return { draft: null, error };
  }
  if (!storedValue) return { draft: null, error: null };

  try {
    return { draft: parseLocalDraftText(storedValue), error: null };
  } catch (error) {
    // Cleanup happens after mount so React Strict Mode's verification remount
    // observes the same failure instead of silently replacing it with a new draft.
    return { draft: null, error };
  }
};

export const readBrowserLocalDraft = () => {
  let storage = null;
  try {
    storage = typeof window === 'undefined' ? null : window.localStorage;
  } catch (error) {
    return {
      storage: null,
      result: { draft: null, error },
    };
  }
  return { storage, result: readLocalDraft(storage) };
};

export const writeLocalDraft = ({ storage, project, savedAt = new Date() }) => {
  if (!storage?.setItem) throw new Error('Browser storage is unavailable');
  const envelope = createLocalDraftEnvelope({ project, savedAt });
  storage.setItem(LOCAL_DRAFT_STORAGE_KEY, JSON.stringify(envelope));
  return envelope;
};

export const clearLocalDraft = storage => {
  storage?.removeItem?.(LOCAL_DRAFT_STORAGE_KEY);
};
