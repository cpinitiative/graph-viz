import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  clearLocalDraft,
  readLocalDraft,
  writeLocalDraft,
} from '../lib/localDraft';

const AUTOSAVE_DELAY_MS = 750;
const STARTUP_SETTLE_DELAY_MS = 250;

const getBrowserStorage = () => {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
};

const getProjectSignature = project => {
  if (!project) return '';
  const { exportedAt: _exportedAt, ...stableProject } = project;
  return JSON.stringify(stableProject);
};

const getMeaningfulProjectSignature = project => {
  if (!project) return '';
  const { exportedAt: _exportedAt, ...stableProject } = project;
  const settings = { ...(stableProject.settings ?? {}) };
  delete settings.viewState;
  return JSON.stringify({ ...stableProject, settings });
};

export const useGraphStudioLocalDraft = ({ project, onRestore }) => {
  const [initialState] = useState(() => {
    const storage = getBrowserStorage();
    return { storage, result: readLocalDraft(storage) };
  });
  const storageRef = useRef(initialState.storage);
  const [pendingDraft, setPendingDraft] = useState(initialState.result.draft);
  const [autosaveReady, setAutosaveReady] = useState(false);
  const [draftStatus, setDraftStatus] = useState(() => {
    if (initialState.result.error) {
      return {
        state: 'error',
        message:
          'Recovery draft could not be read. Export the project to avoid losing work.',
      };
    }
    if (initialState.result.draft) {
      return {
        state: 'pending',
        savedAt: initialState.result.draft.savedAt,
      };
    }
    return { state: 'idle' };
  });
  const projectSignature = useMemo(
    () => getProjectSignature(project),
    [project]
  );
  const meaningfulProjectSignature = useMemo(
    () => getMeaningfulProjectSignature(project),
    [project]
  );
  const initialProjectSignatureRef = useRef(projectSignature);
  const initialMeaningfulSignatureRef = useRef(meaningfulProjectSignature);
  const lastSavedSignatureRef = useRef('');
  const latestProjectRef = useRef(project);
  const latestSignatureRef = useRef(projectSignature);
  const pendingDraftRef = useRef(pendingDraft);
  const autosaveDisabledRef = useRef(Boolean(initialState.result.error));

  useEffect(() => {
    latestProjectRef.current = project;
    latestSignatureRef.current = projectSignature;
  }, [project, projectSignature]);

  useEffect(() => {
    pendingDraftRef.current = pendingDraft;
  }, [pendingDraft]);

  useEffect(() => {
    if (!initialState.result.error) return undefined;
    const timeout = window.setTimeout(() => {
      try {
        clearLocalDraft(storageRef.current);
      } catch {
        // The persistent read warning already tells the user storage is unsafe.
      }
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [initialState.result.error]);

  useEffect(() => {
    if (
      autosaveReady ||
      pendingDraft ||
      autosaveDisabledRef.current ||
      meaningfulProjectSignature !== initialMeaningfulSignatureRef.current
    ) {
      return undefined;
    }
    const timeout = window.setTimeout(() => {
      initialProjectSignatureRef.current = latestSignatureRef.current;
      setAutosaveReady(true);
    }, STARTUP_SETTLE_DELAY_MS);
    return () => window.clearTimeout(timeout);
  }, [autosaveReady, meaningfulProjectSignature, pendingDraft]);

  const persistLatestProject = useCallback((updateStatus = true) => {
    if (pendingDraftRef.current || autosaveDisabledRef.current) return false;
    const nextProject = latestProjectRef.current;
    const nextSignature = latestSignatureRef.current;
    if (
      !nextProject ||
      !nextSignature ||
      nextSignature === lastSavedSignatureRef.current ||
      (!lastSavedSignatureRef.current &&
        nextSignature === initialProjectSignatureRef.current)
    ) {
      return false;
    }

    try {
      const savedAt = new Date();
      writeLocalDraft({
        storage: storageRef.current,
        project: nextProject,
        savedAt,
      });
      lastSavedSignatureRef.current = nextSignature;
      if (updateStatus) {
        setDraftStatus(previous =>
          previous.state === 'error'
            ? previous
            : { state: 'saved', savedAt: savedAt.toISOString() }
        );
      }
      return true;
    } catch {
      autosaveDisabledRef.current = true;
      if (updateStatus) {
        setDraftStatus({
          state: 'error',
          message:
            'Recovery draft could not be saved. Export the project to avoid losing work.',
        });
      }
      return false;
    }
  }, []);

  useEffect(() => {
    if (pendingDraft || autosaveDisabledRef.current) return undefined;
    if (!autosaveReady) {
      if (
        meaningfulProjectSignature !== initialMeaningfulSignatureRef.current
      ) {
        setAutosaveReady(true);
      }
      return undefined;
    }
    if (
      projectSignature === lastSavedSignatureRef.current ||
      (!lastSavedSignatureRef.current &&
        projectSignature === initialProjectSignatureRef.current)
    ) {
      return undefined;
    }

    setDraftStatus(previous =>
      previous.state === 'error' ? previous : { state: 'saving' }
    );
    const timeout = window.setTimeout(
      () => persistLatestProject(true),
      AUTOSAVE_DELAY_MS
    );
    return () => window.clearTimeout(timeout);
  }, [
    autosaveReady,
    meaningfulProjectSignature,
    pendingDraft,
    persistLatestProject,
    projectSignature,
  ]);

  useEffect(() => {
    const flushDraft = () => persistLatestProject(false);
    window.addEventListener('pagehide', flushDraft);
    return () => window.removeEventListener('pagehide', flushDraft);
  }, [persistLatestProject]);

  const restorePendingDraft = useCallback(() => {
    if (!pendingDraft) return;
    onRestore?.(pendingDraft.project);
    lastSavedSignatureRef.current = getProjectSignature({
      format: 'graph-viz-project',
      version: 1,
      graph: pendingDraft.project.graph,
      timeline: pendingDraft.project.timeline,
      settings: pendingDraft.project.settings,
    });
    setDraftStatus({ state: 'saved', savedAt: pendingDraft.savedAt });
    setPendingDraft(null);
  }, [onRestore, pendingDraft]);

  const discardPendingDraft = useCallback(() => {
    try {
      clearLocalDraft(storageRef.current);
      setDraftStatus({ state: 'idle' });
    } catch {
      autosaveDisabledRef.current = true;
      setDraftStatus({
        state: 'error',
        message:
          'Recovery draft could not be cleared. Browser storage may be unavailable.',
      });
    }
    setPendingDraft(null);
  }, []);

  return {
    pendingDraft,
    draftStatus,
    restorePendingDraft,
    discardPendingDraft,
  };
};
