/* global process */
import react from '@vitejs/plugin-react';
import { execFileSync } from 'node:child_process';
import { defineConfig } from 'vite';

const firstDefined = (...values) =>
  values.find(value => typeof value === 'string' && value.trim())?.trim();

const readGitCommit = () => {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return undefined;
  }
};

const readSourceDate = value => {
  if (!value) return undefined;
  const epochSeconds = Number(value);
  if (!Number.isFinite(epochSeconds)) return undefined;
  const sourceDate = new Date(epochSeconds * 1000);
  if (Number.isNaN(sourceDate.getTime())) return undefined;
  return sourceDate.toISOString();
};

const providerDeployment = () => {
  if (process.env.VERCEL_ENV) return `vercel:${process.env.VERCEL_ENV}`;
  if (process.env.CONTEXT) return `netlify:${process.env.CONTEXT}`;
  if (process.env.CF_PAGES_BRANCH) {
    return `cloudflare-pages:${process.env.CF_PAGES_BRANCH}`;
  }
  if (process.env.GITHUB_ENVIRONMENT) {
    return `github:${process.env.GITHUB_ENVIRONMENT}`;
  }
  return undefined;
};

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  define: {
    __GRAPH_STUDIO_BUILD__: JSON.stringify({
      commitSha:
        firstDefined(
          process.env.GRAPH_STUDIO_COMMIT_SHA,
          process.env.VITE_GRAPH_STUDIO_COMMIT_SHA,
          process.env.VERCEL_GIT_COMMIT_SHA,
          process.env.CF_PAGES_COMMIT_SHA,
          process.env.COMMIT_REF,
          process.env.GITHUB_SHA,
          readGitCommit()
        ) ?? 'unknown',
      buildTimestamp:
        firstDefined(
          process.env.GRAPH_STUDIO_BUILD_TIMESTAMP,
          process.env.VITE_GRAPH_STUDIO_BUILD_TIMESTAMP,
          readSourceDate(process.env.SOURCE_DATE_EPOCH)
        ) ?? new Date().toISOString(),
      environment:
        firstDefined(
          process.env.GRAPH_STUDIO_DEPLOYMENT,
          process.env.VITE_GRAPH_STUDIO_DEPLOYMENT,
          providerDeployment(),
          mode
        ) ?? 'unknown',
    }),
  },
}));
