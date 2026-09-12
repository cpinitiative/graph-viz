import { expect, test } from '@playwright/test';
import fs from 'node:fs/promises';
import {
  createLocalDraftEnvelope,
  LOCAL_DRAFT_STORAGE_KEY,
} from '../../src/components/visualizers/Graphs/graphStudio/lib/localDraft.js';
import {
  exportProjectJson,
  parseProjectJson,
} from '../../src/components/visualizers/Graphs/graphStudio/lib/projectJson.js';

const primary = 'https://graph.usaco.guide';
const legacy = 'https://graph-viz.usaco.guide';
const makeDraft = label =>
  JSON.stringify(
    createLocalDraftEnvelope({
      project: exportProjectJson({
        baseGraph: {
          nodes: [{ id: 'start', label, x: 200, y: 200, visible: true }],
          edges: [],
        },
        steps: [
          {
            id: 'step-0',
            description: label,
            durationMs: 700,
            nodeOverrides: {},
            edgeOverrides: {},
          },
        ],
        currentFrame: 0,
        settings: {},
      }),
      savedAt: '2026-09-01T12:00:00.000Z',
    })
  );

// Serve the local build at the real origin names. No request reaches either
// public site, and browser storage remains separate exactly as in production.
test.beforeEach(async ({ context, baseURL }) => {
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (![primary, legacy].includes(url.origin)) {
      return route.fulfill({
        status: 200,
        contentType: 'text/plain',
        body: '',
      });
    }
    if (url.pathname === '/__seed') {
      return route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: '<!doctype html><title>Seed test storage</title>',
      });
    }
    if (url.pathname.startsWith('/_vercel/')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/javascript',
        body: '',
      });
    }
    const response = await route.fetch({
      url: `${baseURL}${url.pathname}${url.search}`,
    });
    await route.fulfill({ response });
  });
});

test.afterEach(async ({ context }) => {
  await context.unrouteAll({ behavior: 'wait' });
});

const seed = async (page, origin, value) => {
  await page.goto(`${origin}/__seed`);
  await page.evaluate(({ key, value }) => localStorage.setItem(key, value), {
    key: LOCAL_DRAFT_STORAGE_KEY,
    value,
  });
};

test('legacy visitors without a draft go to the main address and retain URL details', async ({
  page,
}) => {
  await page.goto(`${legacy}/?source=bookmark#frame-2`);
  await expect(page).toHaveURL(`${primary}/?source=bookmark#frame-2`);
  await expect(page.getByTestId('graph-canvas-svg')).toBeVisible();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    `${primary}/`
  );
});

test('old saved projects can be downloaded without changing either origin’s save', async ({
  page,
}) => {
  const mainDraft = makeDraft('Main project');
  const oldDraft = makeDraft('Old project');
  await seed(page, primary, mainDraft);
  await seed(page, legacy, oldDraft);
  await page.goto(legacy);
  await expect(page.getByTestId('domain-migration')).toBeVisible();
  await expect(page.getByTestId('graph-canvas-svg')).toHaveCount(0);
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download saved project' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe(
    'graph-studio-recovered.graphviz.json'
  );
  const recovered = parseProjectJson(
    await fs.readFile(await download.path(), 'utf8')
  );
  expect(recovered.graph.nodes[0].label).toBe('Old project');
  expect(recovered.timeline.steps[0].durationMs).toBe(700);
  expect(
    await page.evaluate(
      key => localStorage.getItem(key),
      LOCAL_DRAFT_STORAGE_KEY
    )
  ).toBe(oldDraft);
  await page
    .getByRole('link', { name: `Continue to graph.usaco.guide` })
    .click();
  await expect(
    page
      .getByTestId('graph-canvas-svg')
      .getByText('Main project', { exact: true })
  ).toBeVisible();
  expect(
    JSON.parse(
      await page.evaluate(
        key => localStorage.getItem(key),
        LOCAL_DRAFT_STORAGE_KEY
      )
    ).project.graph.nodes[0].label
  ).toBe('Main project');
  await page.getByRole('button', { name: 'Import...', exact: true }).click();
  await expect(
    page.getByRole('link', {
      name: 'Recover a saved project from graph-viz.usaco.guide',
    })
  ).toHaveAttribute('href', legacy);
});

test('an unreadable old save is preserved as a backup and never silently redirected', async ({
  page,
}) => {
  const raw = '{broken saved project';
  await seed(page, legacy, raw);
  await page.goto(legacy);
  await expect(page.getByRole('alert')).toContainText('could not be read');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download backup' }).click();
  const download = await downloadPromise;
  expect(await fs.readFile(await download.path(), 'utf8')).toBe(raw);
  expect(
    await page.evaluate(
      key => localStorage.getItem(key),
      LOCAL_DRAFT_STORAGE_KEY
    )
  ).toBe(raw);
  await expect(page).toHaveURL(`${legacy}/`);
});

test('unavailable storage leaves an explicit recovery choice', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new Error('Storage blocked');
      },
    });
  });
  await page.goto(legacy);
  await expect(page.getByRole('alert')).toContainText(
    'could not check for a saved project'
  );
  await expect(
    page.getByRole('link', { name: 'Continue to graph.usaco.guide' })
  ).toBeVisible();
  await expect(page).toHaveURL(`${legacy}/`);
  await expect(page.getByTestId('graph-canvas-svg')).toHaveCount(0);
});

test('the main address restores its save without scaling the canvas on reload', async ({
  page,
}) => {
  await seed(page, primary, makeDraft('Restored project'));
  await page.addInitScript(() => {
    window.startupFrames = [];
    const capture = () => {
      const svg = document.querySelector('[data-testid="graph-canvas-svg"]');
      if (svg) {
        window.startupFrames.push({
          stageTransform: getComputedStyle(svg.parentElement.parentElement)
            .transform,
          ready: svg.getAttribute('data-view-ready') === 'true',
          view: svg
            .querySelector('[data-graph-view-transform="true"]')
            ?.getAttribute('transform'),
        });
      }
      if (window.startupFrames.length < 45) requestAnimationFrame(capture);
    };
    requestAnimationFrame(capture);
  });
  await page.goto(primary);
  await page.reload();
  await page.waitForFunction(() => window.startupFrames.length === 45);
  const frames = await page.evaluate(() => window.startupFrames);
  expect(frames.every(frame => frame.stageTransform === 'none')).toBe(true);
  const visibleViews = frames
    .filter(frame => frame.ready)
    .map(frame => frame.view);
  expect(visibleViews.length).toBeGreaterThan(0);
  expect(new Set(visibleViews).size).toBe(1);
  await expect(
    page
      .getByTestId('graph-canvas-svg')
      .getByText('Restored project', { exact: true })
  ).toBeVisible();
});

test('saved-project recovery fits a mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 600 });
  await seed(page, legacy, makeDraft('Mobile saved project'));
  await page.goto(legacy);
  await expect(
    page.getByRole('button', { name: 'Download saved project' })
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth
    )
  ).toBe(true);
  await page.screenshot({ path: 'qa-screenshots/domain-recovery-mobile.png' });
});
