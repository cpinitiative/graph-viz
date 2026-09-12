import { useEffect, useState } from 'react';
import { ThemeProvider } from '../context/ThemeProvider';
import {
  getCanonicalUrl,
  LEGACY_HOSTNAME,
  PRIMARY_HOSTNAME,
  readLegacyDraft,
} from '../siteDomain';

const buttonClass =
  'inline-flex min-h-11 items-center justify-center rounded border border-slate-400 px-4 py-2 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500';

const DomainMigration = () => {
  const [draft] = useState(() => readLegacyDraft(() => window.localStorage));
  const destination = getCanonicalUrl(window.location.href);

  useEffect(() => {
    if (draft.state === 'empty') window.location.replace(destination);
  }, [destination, draft.state]);

  const download = () => {
    const url = URL.createObjectURL(
      new Blob([draft.contents], { type: 'application/json' })
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = draft.filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  return (
    <ThemeProvider>
      <main
        className="flex h-dvh items-center justify-center overflow-auto bg-white px-6 py-10 font-inter text-slate-900 dark:bg-[#121212] dark:text-slate-100"
        data-testid="domain-migration"
      >
        <div className="my-auto w-full max-w-lg space-y-5">
          <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">
            Graph Studio
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            One address for Graph Studio
          </h1>
          <p className="text-sm leading-relaxed">
            Graph Studio now lives at <strong>{PRIMARY_HOSTNAME}</strong>.
          </p>
          {draft.state === 'saved' && (
            <>
              <p className="text-sm leading-relaxed">
                You have a project saved in this browser at {LEGACY_HOSTNAME}.
                Download it before continuing, then choose{' '}
                <strong>Import → Upload Project File</strong> at the main
                address to open it.
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Saved {new Date(draft.savedAt).toLocaleString()}. Your original
                copy stays here, and projects at the main address are kept until
                you choose to replace them.
              </p>
            </>
          )}
          {draft.state === 'invalid' && (
            <p role="alert" className="text-sm leading-relaxed">
              A saved draft exists here, but it could not be read. Download the
              original backup to keep it available for recovery. This backup may
              need repair before it can be imported.
            </p>
          )}
          {draft.state === 'blocked' && (
            <p role="alert" className="text-sm leading-relaxed">
              Browser storage is unavailable, so we could not check for a saved
              project. Allow storage for this address and reload to recover it,
              or continue to the main address.
            </p>
          )}
          {draft.state === 'empty' && (
            <p className="text-sm" role="status">
              Opening Graph Studio…
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            {draft.contents && (
              <button
                type="button"
                onClick={download}
                className={`${buttonClass} border-blue-700 bg-blue-700 text-white hover:bg-blue-800`}
              >
                {draft.state === 'saved'
                  ? 'Download saved project'
                  : 'Download backup'}
              </button>
            )}
            <a
              className={`${buttonClass} hover:bg-slate-100 dark:hover:bg-slate-800`}
              href={destination}
            >
              Continue to {PRIMARY_HOSTNAME}
            </a>
          </div>
        </div>
      </main>
    </ThemeProvider>
  );
};

export default DomainMigration;
