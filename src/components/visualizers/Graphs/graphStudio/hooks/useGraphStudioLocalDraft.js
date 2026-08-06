import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  clearLocalDraft,
  readBrowserLocalDraft,
  writeLocalDraft,
} from '../lib/localDraft';

const AUTOSAVE_DELAY_MS = 750;
const STARTUP_SETTLE_DELAY_MS = 250;

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

export const useGraphStudioLocalDraft = ({ project, startup }) => {
  const [initialState] = useState(() => startup ?? readBrowserLocalDraft());
  const storageRef = useRef(initialState.storage);
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
        state: 'restored',
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
  const autosaveDisabledRef = useRef(Boolean(initialState.result.error));

  useEffect(() => {
    latestProjectRef.current = project;
    latestSignatureRef.current = projectSignature;
  }, [project, projectSignature]);

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
  }, [autosaveReady, meaningfulProjectSignature]);

  const persistLatestProject = useCallback((updateStatus = true) => {
    if (autosaveDisabledRef.current) return false;
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
    if (autosaveDisabledRef.current) return undefined;
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
    persistLatestProject,
    projectSignature,
  ]);

  useEffect(() => {
    const flushDraft = () => persistLatestProject(false);
    window.addEventListener('pagehide', flushDraft);
    return () => window.removeEventListener('pagehide', flushDraft);
  }, [persistLatestProject]);

  return { draftStatus };
};
