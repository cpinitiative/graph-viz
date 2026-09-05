import { exportProjectJson, parseProjectJson } from './projectJson.js';
import { requireTextBudget } from './projectLimits.js';

export const DRAFT_KEY = 'graph-studio-draft-v1';

export const readProjectDraft = () => {
  try {
    const text = localStorage.getItem(DRAFT_KEY);
    return text ? parseProjectJson(text) : null;
  } catch {
    return null;
  }
};

export const writeProjectDraft = project => {
  const text = JSON.stringify(exportProjectJson(project));
  requireTextBudget(text, 'Draft');
  localStorage.setItem(DRAFT_KEY, text);
};
