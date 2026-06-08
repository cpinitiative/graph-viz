import { expect, test } from '@playwright/test';

const unexpectedConsoleTypes = new Set(['error']);

const watchForUnexpectedErrors = page => {
  const errors = [];

  page.on('console', message => {
    if (unexpectedConsoleTypes.has(message.type())) {
      errors.push(`console.${message.type()}: ${message.text()}`);
    }
  });

  page.on('pageerror', error => {
    errors.push(`pageerror: ${error.message}`);
  });

  return errors;
};

const graphCanvas = page =>
  page
    .getByTestId('graph-canvas-svg')
    .or(page.locator('svg#graph-studio-canvas-svg'));

const choosePreset = async (page, value) => {
  const presetSelect = page
    .getByLabel('Load graph preset')
    .or(page.locator('select').nth(1));

  await presetSelect.selectOption(value);
  await expect(graphCanvas(page)).toBeVisible();
};

test.describe('Graph Viz desktop smoke', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('loads the app shell without unexpected browser errors', async ({
    page,
  }) => {
    const errors = watchForUnexpectedErrors(page);

    await page.goto('/');

    await expect(page).toHaveTitle(/Graph Visualizer/);
    await expect(
      page.getByTestId('graph-studio-root').or(page.locator('main'))
    ).toBeVisible();
    await expect(page.getByText(/Guide Graph Visualizer/)).toBeVisible();
    await expect(page.getByAltText('USACO Guide Logo')).toBeVisible();
    await expect(page.getByText('Tools')).toBeVisible();
    await expect(page.getByText('Timeline')).toBeVisible();
    await expect(graphCanvas(page)).toBeVisible();

    expect(errors).toEqual([]);
  });

  test('supports core graph, layout, preset, timeline, import, and script flows', async ({
    page,
  }) => {
    const errors = watchForUnexpectedErrors(page);

    await page.addInitScript(() => {
      window.localStorage.setItem('theme', 'light');
    });
    await page.goto('/');
    await expect(graphCanvas(page)).toBeVisible();

    const themeToggle = page.getByRole('button', { name: 'Toggle theme' });
    await themeToggle.click();
    await expect(page.locator('html')).toHaveClass(/dark/);
    await themeToggle.click();
    await expect(page.locator('html')).not.toHaveClass(/dark/);

    await page.getByRole('button', { name: 'Add Node' }).click();
    await expect(page.getByText(/Node \d+ added/)).toBeVisible();
    await expect(graphCanvas(page)).toBeVisible();

    const drawInstructions = page.getByText(/Click the (source|target) node/);
    await page.getByRole('button', { name: 'Draw Edge' }).click();
    await expect(drawInstructions).toBeVisible();
    await page.getByRole('button', { name: 'select' }).click();
    await expect(drawInstructions).toBeHidden();

    for (const layout of ['Circle', 'Tree', 'Force']) {
      await page.getByRole('button', { name: layout }).click();
      await expect(graphCanvas(page)).toBeVisible();
    }

    for (const preset of ['bfs', 'dfs', 'dijkstra']) {
      await choosePreset(page, preset);
    }

    const frameLabels = page.getByText(/^Frame \d+$/);
    const initialFrameCount = await frameLabels.count();

    await page.getByRole('button', { name: '+ Keyframe' }).click();
    await expect(frameLabels).toHaveCount(initialFrameCount + 1);
    await page.getByRole('button', { name: 'Duplicate' }).click();
    await expect(frameLabels).toHaveCount(initialFrameCount + 2);
    await page.getByRole('button', { name: 'Delete' }).click();
    await expect(frameLabels).toHaveCount(initialFrameCount + 1);

    const frameDescription = page.getByPlaceholder(
      'Enter a description for this frame...'
    );
    await frameDescription.fill('Smoke test frame');
    await expect(frameDescription).toHaveValue('Smoke test frame');

    await page.getByRole('button', { name: 'Import' }).click();
    await expect(page.getByText('Text-to-Graph Parser')).toBeVisible();
    await page.locator('textarea').last().fill('0 1\n1 2\n2 0');
    await page.getByRole('button', { name: 'Generate graph' }).click();
    await expect(page.getByText('Text-to-Graph Parser')).toBeHidden();
    await expect(graphCanvas(page)).toBeVisible();

    await choosePreset(page, 'bfs');
    await page.getByRole('button', { name: 'Script Mode' }).click();
    await expect(page.getByText('Script Mode (Trace Recorder)')).toBeVisible();
    await expect(
      page.getByText(/Script Mode executes local JavaScript/)
    ).toBeVisible();
    await page.getByRole('button', { name: 'Generate timeline' }).click();
    await expect(page.getByText('Script Mode (Trace Recorder)')).toBeHidden();
    await expect(graphCanvas(page)).toBeVisible();
    await expect(page.getByText(/Script generated \d+ frames/)).toBeVisible();

    await page.getByRole('button', { name: 'Script Mode' }).click();
    await expect(page.getByText('Script Mode (Trace Recorder)')).toBeVisible();
    await page.locator('[data-testid="script-modal"] textarea').fill(`
while (true) {}
`);
    await page.getByRole('button', { name: 'Generate timeline' }).click();
    await expect(
      page.getByText(
        'Script error: Script timed out. Check for infinite loops or expensive work.'
      )
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeEnabled();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByText('Script Mode (Trace Recorder)')).toBeHidden();
    await expect(graphCanvas(page)).toBeVisible();

    expect(errors).toEqual([]);
  });
});
