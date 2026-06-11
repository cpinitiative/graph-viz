import { expect, test } from '@playwright/test';
import { fileURLToPath } from 'url';

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

const fixturePath = name =>
  fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url));

const educationalPresets = [
  {
    value: 'topological-sort',
    firstDescription: 'Zero indegree nodes A and B enter the queue',
    secondDescription:
      'Process A: remove outgoing edge A->C; C still waits on B',
  },
  {
    value: 'disjoint-set-union',
    firstDescription: 'Initialize DSU: each node is its own component',
    secondDescription: 'find(0) and find(1) differ, so union accepts edge 0-1',
  },
  {
    value: 'connected-components',
    firstDescription: 'Start component 1 at node 0 and mark it active',
    secondDescription:
      'Traverse from 0: queue neighbors 1 and 2 in component 1',
  },
];

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

    await page.getByRole('button', { name: 'Import Edge List' }).click();
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

  test('loads USACO Guide educational graph presets with timeline descriptions', async ({
    page,
  }) => {
    const errors = watchForUnexpectedErrors(page);

    await page.goto('/');
    await expect(graphCanvas(page)).toBeVisible();

    const frameDescription = page.getByPlaceholder(
      'Enter a description for this frame...'
    );
    const frameLabels = page.getByText(/^Frame \d+$/);

    for (const preset of educationalPresets) {
      await choosePreset(page, preset.value);
      await expect(frameDescription).toHaveValue(preset.firstDescription);
      expect(await frameLabels.count()).toBeGreaterThan(1);

      await frameLabels.nth(1).click();
      await expect(frameDescription).toHaveValue(preset.secondDescription);
      await expect(graphCanvas(page)).toBeVisible();
    }

    expect(errors).toEqual([]);
  });

  test('toggles the built-in state legend without affecting the canvas', async ({
    page,
  }) => {
    const errors = watchForUnexpectedErrors(page);

    await page.goto('/');
    await expect(graphCanvas(page)).toBeVisible();

    const stateLegendToggle = page.getByLabel('Show State Legend');
    const stateLegend = page.getByTestId('graph-state-legend');

    await expect(stateLegendToggle).toBeVisible();
    await expect(stateLegend).toBeHidden();

    await stateLegendToggle.check();
    await expect(stateLegend).toBeVisible();
    await expect(stateLegend.getByText('Default node')).toBeVisible();
    await expect(stateLegend.getByText('Active node')).toBeVisible();
    await expect(stateLegend.getByText('Visited node')).toBeVisible();
    await expect(stateLegend.getByText('Queued node')).toBeVisible();
    await expect(stateLegend.getByText('Highlighted edge')).toBeVisible();
    await expect(stateLegend.getByText('Selected edge')).toBeVisible();
    await expect(graphCanvas(page)).toBeVisible();

    await stateLegendToggle.uncheck();
    await expect(stateLegend).toBeHidden();
    await expect(graphCanvas(page)).toBeVisible();

    expect(errors).toEqual([]);
  });

  test('supports full project JSON export and import', async ({ page }) => {
    const errors = watchForUnexpectedErrors(page);

    await page.goto('/');
    await expect(graphCanvas(page)).toBeVisible();

    await expect(page.getByTestId('project-export-button')).toBeVisible();
    await expect(page.getByTestId('project-import-button')).toBeVisible();

    const downloadPromise = page.waitForEvent('download');
    await page.getByTestId('project-export-button').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.graphviz\.json$/);

    await page
      .getByTestId('project-import-input')
      .setInputFiles(fixturePath('sample-project.graphviz.json'));
    await expect(page.getByText('Project imported')).toBeVisible();
    await expect(graphCanvas(page)).toBeVisible();
    await expect(page.getByText(/^Frame \d+$/)).toHaveCount(2);
    await expect(
      page.getByPlaceholder('Enter a description for this frame...')
    ).toHaveValue('Imported fixture frame two');
    await expect(page.getByLabel('Edge routing')).toHaveValue('bezier');
    await expect(page.getByLabel('Dot Grid')).toBeChecked();
    await expect(page.getByLabel('Snap to Grid')).not.toBeChecked();
    await expect(page.getByLabel('Show State Legend')).toBeChecked();
    await expect(page.getByTestId('graph-state-legend')).toBeVisible();

    await page
      .getByTestId('project-import-input')
      .setInputFiles(fixturePath('invalid-project.graphviz.json'));
    await expect(page.getByText(/Project import error:/)).toBeVisible();
    await expect(graphCanvas(page)).toBeVisible();
    await expect(
      page.getByPlaceholder('Enter a description for this frame...')
    ).toHaveValue('Imported fixture frame two');

    expect(errors).toEqual([]);
  });

  test('imports and renders a directed self-loop edge', async ({ page }) => {
    const errors = watchForUnexpectedErrors(page);

    await page.goto('/');
    await expect(graphCanvas(page)).toBeVisible();

    await page
      .getByTestId('project-import-input')
      .setInputFiles(fixturePath('self-loop-project.graphviz.json'));
    await expect(page.getByText('Project imported')).toBeVisible();
    await expect(graphCanvas(page)).toBeVisible();
    await expect(page.getByLabel('Show State Legend')).not.toBeChecked();

    const selfLoopEdge = graphCanvas(page).locator(
      'path[marker-end="url(#graphstudio-arrow)"]'
    );
    await expect(selfLoopEdge).toHaveCount(1);
    await expect(selfLoopEdge.first()).toBeVisible();
    await expect(selfLoopEdge.first()).toHaveAttribute('stroke', '#64748b');
    await expect(selfLoopEdge.first()).toHaveAttribute(
      'marker-end',
      'url(#graphstudio-arrow)'
    );
    await expect(
      graphCanvas(page)
        .locator('text')
        .filter({ hasText: /^loop$/ })
    ).toBeVisible();

    await page.getByText('Frame 2').click();
    await expect(selfLoopEdge.first()).toHaveAttribute('stroke', '#f59e0b');

    await page.getByRole('button', { name: 'Script Mode' }).click();
    await page.locator('[data-testid="script-modal"] textarea').fill(`
api.edge('loop', '#3b82f6');
`);
    await page.getByRole('button', { name: 'Generate timeline' }).click();
    await expect(page.getByText('Script Mode (Trace Recorder)')).toBeHidden();
    await page.getByText('Frame 2').click();
    await expect(selfLoopEdge.first()).toHaveAttribute('stroke', '#3b82f6');

    const edgeHitTarget = graphCanvas(page)
      .locator('path[stroke="rgba(0,0,0,0)"]')
      .first();
    await edgeHitTarget.dispatchEvent('click');
    await expect(page.getByText('Edge Inspector')).toBeVisible();

    const downloadPromise = page.waitForEvent('download');
    await page.getByTestId('project-export-button').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.graphviz\.json$/);

    expect(errors).toEqual([]);
  });

  test('keeps directed arrowheads bound to effective edge stroke colors', async ({
    page,
  }) => {
    const errors = watchForUnexpectedErrors(page);

    await page.goto('/');
    await expect(graphCanvas(page)).toBeVisible();

    await choosePreset(page, 'dfs');

    const markerTriangle = graphCanvas(page).locator(
      'marker#graphstudio-arrow path'
    );
    await expect(markerTriangle).toHaveAttribute('fill', 'context-stroke');

    const directedEdges = graphCanvas(page).locator(
      'path[marker-end="url(#graphstudio-arrow)"]'
    );
    await expect(directedEdges.first()).toBeVisible();

    await page.getByText('Frame 2').click();
    await expect(directedEdges.first()).toHaveAttribute('stroke', '#3b82f6');
    await expect(directedEdges.first()).toHaveAttribute(
      'marker-end',
      'url(#graphstudio-arrow)'
    );

    await page.getByRole('button', { name: 'Script Mode' }).click();
    await page.locator('[data-testid="script-modal"] textarea').fill(`
api.edge('e0', '#f59e0b');
`);
    await page.getByRole('button', { name: 'Generate timeline' }).click();
    await expect(page.getByText('Script Mode (Trace Recorder)')).toBeHidden();
    await page.getByText('Frame 2').click();
    await expect(directedEdges.first()).toHaveAttribute('stroke', '#f59e0b');
    await expect(markerTriangle).toHaveAttribute('fill', 'context-stroke');

    expect(errors).toEqual([]);
  });

  test('exports the default timeline as a PPTX slideshow', async ({ page }) => {
    const errors = watchForUnexpectedErrors(page);

    await page.goto('/');
    await expect(graphCanvas(page)).toBeVisible();

    const frameCounter = page.getByText(/^\d+ \/ \d+$/).first();
    const initialFrameCounter = await frameCounter.textContent();

    await expect(page.getByTestId('slideshow-export-button')).toBeVisible();
    await expect(page.getByTestId('slideshow-export-button')).toBeEnabled();

    await page.getByRole('button', { name: 'Export MP4' }).click();
    await expect(page.getByText('Export MP4 Video')).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByText('Export MP4 Video')).toBeHidden();

    const downloadPromise = page.waitForEvent('download');
    await page.getByTestId('slideshow-export-button').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.pptx$/);

    await expect(page.getByText('Slideshow exported')).toBeVisible();
    await expect(frameCounter).toHaveText(initialFrameCounter);
    await expect(graphCanvas(page)).toBeVisible();

    expect(errors).toEqual([]);
  });
});
