import { useEffect, useState } from 'react';
import { writeProjectDraft } from '../lib/projectDraft';

export const useProjectDraft = project => {
  const [savedProject, setSavedProject] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let saved = false;
    const save = () => {
      try {
        writeProjectDraft(project);
        saved = true;
        setSavedProject(project);
        setError('');
      } catch {
        setError('Draft could not be saved. Export Project to keep your work.');
      }
    };
    const timer = setTimeout(save, 800);
    const beforeUnload = event => {
      if (!saved) {
        save();
        if (!saved) {
          event.preventDefault();
          event.returnValue = '';
        }
      }
    };
    const visibility = () => {
      if (document.visibilityState === 'hidden' && !saved) save();
    };
    window.addEventListener('beforeunload', beforeUnload);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('beforeunload', beforeUnload);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [project]);
  return (
    error ||
    (savedProject === project ? 'Draft saved on this device' : 'Saving draft…')
  );
};
