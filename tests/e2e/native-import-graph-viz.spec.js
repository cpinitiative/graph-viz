import { expect, test } from '@playwright/test';
import fs from 'node:fs/promises';

const DRAFT_KEY = 'graph-viz:editor:draft:v1';
const labyrinth = '5 8\n########\n#.A#...#\n#.##.#B#\n#......#\n########';
const monsters = '5 8\n########\n#M..A..#\n#.#.M#.#\n#M#..#..\n#.######';
const palindrome =
  '8 8\n1 2 a\n2 3 b\n1 3 c\n3 4 b\n4 5 a\n5 6 c\n6 7 b\n7 8 a';
const canvas = page => page.getByTestId('graph-canvas-svg');
const nodes = page => canvas(page).locator('[data-node-id]');
const draft = page =>
  page.evaluate(
    key => JSON.parse(localStorage.getItem(key) || 'null')?.project,
    DRAFT_KEY
  );
const stableProject = project => ({
  graph: project.graph,
  timeline: project.timeline,
  settings: {
    globalSettings: project.settings.globalSettings,
    customLegend: project.settings.customLegend,
    visualStates: project.settings.visualStates,
    captionOverlay: project.settings.captionOverlay,
    snapEnabled: project.settings.snapEnabled,
    showGrid: project.settings.showGrid,
    lockCanvas: project.settings.lockCanvas,
  },
});
const waitForDraft = async (page, nodeCount) => {
  await expect
    .poll(async () => (await draft(page))?.graph.nodes.length)
    .toBe(nodeCount);
  return draft(page);
};
const openInput = async (page, mode) => {
  await page.getByTestId('open-import-menu').click();
  await page
    .getByRole('button', {
      name:
        mode === 'grid'
          ? 'Paste / Import ASCII Grid'
          : 'Paste / Import Edge List',
      exact: true,
    })
    .click();
  const modal = page.getByTestId('parser-modal');
  await expect(modal.getByLabel('Input format')).toHaveValue(mode);
  return modal;
};

test('imports a CSES maze from Blank Project, undoes the whole import, and restores square cells after reload', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByLabel('Load graph preset').selectOption('blank');
  await expect(nodes(page)).toHaveCount(0);
  const before = stableProject(await waitForDraft(page, 0));
  const modal = await openInput(page, 'grid');
  await modal.getByLabel('ASCII grid input').fill(labyrinth);
  await modal.getByRole('button', { name: 'Generate graph' }).click();
  await expect(modal).toBeHidden();
  await expect(nodes(page)).toHaveCount(40);
  await expect(canvas(page).locator('[data-node-shape="square"]')).toHaveCount(
    40
  );
  await expect(canvas(page).locator('[data-edge-path-id]')).toHaveCount(14);
  await expect(canvas(page).locator('[data-node-label-id="r2c3"]')).toHaveText(
    'A'
  );
  await expect(canvas(page).locator('[data-node-label-id="r3c7"]')).toHaveText(
    'B'
  );
  await expect(canvas(page).locator('[data-node-id="r2c2"]')).toHaveAttribute(
    'aria-label',
    /^Node \. \(r2c2\)\./
  );
  const imported = await waitForDraft(page, 40);
  expect(imported.settings.showGrid).toBe(false);
  expect(imported.settings.globalSettings.nodeSize).toBe(24);

  await page
    .getByTestId('left-sidebar')
    .getByRole('button', { name: 'Undo', exact: true })
    .click();
  await expect(nodes(page)).toHaveCount(0);
  expect(stableProject(await waitForDraft(page, 0))).toEqual(before);
  await page
    .getByTestId('left-sidebar')
    .getByRole('button', { name: 'Redo', exact: true })
    .click();
  await expect(nodes(page)).toHaveCount(40);
  await waitForDraft(page, 40);
  await page.reload();
  await expect(canvas(page).locator('[data-node-shape="square"]')).toHaveCount(
    40
  );
  expect(stableProject(await waitForDraft(page, 40))).toEqual(
    stableProject(imported)
  );
});

test('rejects malformed or oversized grids without changing the current timeline and imports a corrected Monsters sample', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByLabel('Load graph preset').selectOption('bfs');
  const originalCount = await nodes(page).count();
  const before = stableProject(await waitForDraft(page, originalCount));
  const modal = await openInput(page, 'grid');
  for (const [input, message] of [
    ['2 3\n...\n..', /row 2 has 2 cells; expected 3/],
    ['1000 1000\n.', /Grid cell count.*1,000/],
    ['#X#', /row 1, column 2/],
  ]) {
    await modal.getByLabel('ASCII grid input').fill(input);
    await modal.getByRole('button', { name: 'Generate graph' }).click();
    await expect(modal.getByRole('alert')).toContainText(message);
    await expect(modal.getByLabel('ASCII grid input')).toHaveAttribute(
      'aria-invalid',
      'true'
    );
    expect(stableProject(await draft(page))).toEqual(before);
  }
  await modal.getByLabel('ASCII grid input').fill(monsters);
  await expect(modal.getByRole('alert')).toBeHidden();
  await modal.getByRole('button', { name: 'Generate graph' }).click();
  await expect(nodes(page)).toHaveCount(40);
  await expect(canvas(page).locator('[data-edge-path-id]')).toHaveCount(17);
  const project = await waitForDraft(page, 40);
  expect(
    project.graph.nodes.filter(node => node.label === 'M').map(node => node.id)
  ).toEqual(['r2c2', 'r3c5', 'r4c2']);
});

test('pastes the exact one-based, character-labeled AtCoder sample and preserves it in Project export', async ({
  page,
}) => {
  await page.goto('/');
  const modal = await openInput(page, 'edge-list');
  await expect(modal.getByLabel('Vertex IDs')).toHaveValue('0');
  await expect(modal.getByLabel('Edge values')).toHaveValue('weight');
  await modal.getByLabel('Edge list input').fill(palindrome);
  await modal.getByRole('button', { name: 'Generate graph' }).click();
  await expect(modal.getByRole('alert')).toContainText(
    /weight must be numeric/
  );
  await modal.getByLabel('Vertex IDs').selectOption('1');
  await modal.getByLabel('Edge values').selectOption('label');
  await expect(modal.getByRole('alert')).toBeHidden();
  await modal.getByRole('button', { name: 'Generate graph' }).click();
  await expect(nodes(page)).toHaveCount(8);
  await expect(canvas(page).locator('[data-edge-path-id]')).toHaveCount(8);
  await expect(canvas(page).locator('[data-edge-id]').first()).toHaveAttribute(
    'aria-label',
    /\. Label a/
  );
  await page.getByTestId('open-export-menu').click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByTestId('project-export-button').click();
  const download = await downloadPromise;
  const project = JSON.parse(await fs.readFile(await download.path(), 'utf8'));
  expect(project.graph.nodes.map(node => node.label)).toEqual([
    '1',
    '2',
    '3',
    '4',
    '5',
    '6',
    '7',
    '8',
  ]);
  expect(project.graph.edges.map(edge => edge.label).join('')).toBe('abcbacba');
  expect(project.graph.edges.at(-1)).toMatchObject({
    from: 7,
    to: 8,
    label: 'a',
  });
});

test('ASCII grid import is reachable and editable on a narrow viewport', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Open tools panel' }).click();
  const modal = await openInput(page, 'grid');
  await modal.getByLabel('ASCII grid input').fill('3 3\n#A#\n#.#\n#B#');
  await modal.getByRole('button', { name: 'Generate graph' }).click();
  await expect(nodes(page)).toHaveCount(9);
  await expect(canvas(page).locator('[data-node-shape="square"]')).toHaveCount(
    9
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth
    )
  ).toBe(true);
});

test('enabling a grid caption keeps nodes and overlays clear in the editor and export', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  const modal = await openInput(page, 'grid');
  await modal.getByLabel('ASCII grid input').fill(labyrinth);
  await modal.getByRole('button', { name: 'Generate graph' }).click();
  await canvas(page).locator('[data-node-id="r2c3"]').click();
  await page
    .getByRole('textbox', { name: 'Frame annotation', exact: true })
    .fill('d = 0');
  await page
    .getByRole('textbox', { name: 'Frame Description', exact: true })
    .fill('Start BFS at A with distance zero.');
  await page
    .getByRole('checkbox', { name: 'Separate caption text', exact: true })
    .check();
  await page
    .getByRole('textbox', { name: 'Display caption', exact: true })
    .fill('LABYRINTH · Start BFS at A (d = 0)');
  await page
    .getByRole('checkbox', { name: 'Show caption', exact: true })
    .check();
  const hasOverlap = svg =>
    svg.evaluate(element => {
      const legend = element
        .querySelector('[data-legend-position]')
        .getBoundingClientRect();
      const caption = element
        .querySelector('[data-caption-overlay]')
        .getBoundingClientRect();
      const intersects = (a, b) =>
        a.left < b.right &&
        a.right > b.left &&
        a.top < b.bottom &&
        a.bottom > b.top;
      return (
        intersects(legend, caption) ||
        [...element.querySelectorAll('[data-node-id]')].some(node => {
          const bounds = node.getBoundingClientRect();
          return intersects(bounds, caption) || intersects(bounds, legend);
        })
      );
    });
  await expect.poll(() => hasOverlap(canvas(page))).toBe(false);
  await page.getByLabel('Caption Style', { exact: true }).selectOption('dark');
  await page
    .getByRole('textbox', { name: 'Caption Font Size', exact: true })
    .fill('16');
  await page
    .getByRole('textbox', { name: 'Caption Font Size', exact: true })
    .press('Enter');
  await expect.poll(() => hasOverlap(canvas(page))).toBe(false);
  await page.getByTestId('open-export-menu').click();
  await page.getByTestId('image-framing-select').selectOption('presentation');
  await expect(page.getByTestId('png-export-button')).toBeEnabled();
  expect(
    await hasOverlap(page.locator('#graph-studio-export-capture-svg'))
  ).toBe(false);
});
