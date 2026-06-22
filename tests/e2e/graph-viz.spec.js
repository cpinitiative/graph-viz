import { expect, test } from '@playwright/test';
import fs from 'node:fs/promises';
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
  await page.getByLabel('Load graph preset').selectOption(value);
  await expect(graphCanvas(page)).toBeVisible();
};

const getDirectedEdgeEndpointOffsets = async page =>
  graphCanvas(page).evaluate(svg => {
    const edgePaths = Array.from(
      svg.querySelectorAll('path[marker-end^="url(#graphstudio-arrow-"]')
    );
    const nodeCircles = Array.from(svg.querySelectorAll(':scope > g circle'))
      .map(circle => ({
        x: Number(circle.getAttribute('cx')),
        y: Number(circle.getAttribute('cy')),
        r: Number(circle.getAttribute('r')),
      }))
      .filter(
        circle =>
          Number.isFinite(circle.x) &&
          Number.isFinite(circle.y) &&
          Number.isFinite(circle.r)
      );

    return edgePaths
      .map(path => {
        const values = (path.getAttribute('d')?.match(/-?\d+(?:\.\d+)?/g) ?? [])
          .map(Number)
          .filter(Number.isFinite);
        if (values.length < 4 || !nodeCircles.length) return null;
        const x = values[values.length - 2];
        const y = values[values.length - 1];
        const nearest = nodeCircles.reduce((best, circle) => {
          const distance = Math.hypot(x - circle.x, y - circle.y);
          const offset = Math.abs(distance - circle.r);
          return !best || offset < best.offset
            ? { distance, radius: circle.r, offset }
            : best;
        }, null);
        return nearest;
      })
      .filter(Boolean);
  });

const expectDirectedEdgesAnchored = async page => {
  await expect
    .poll(async () => {
      const offsets = await getDirectedEdgeEndpointOffsets(page);
      if (!offsets.length) return Number.POSITIVE_INFINITY;
      return Math.max(...offsets.map(offset => offset.offset));
    })
    .toBeLessThanOrEqual(1.25);

  const offsets = await getDirectedEdgeEndpointOffsets(page);
  expect(offsets.length).toBeGreaterThan(0);
};

const dragFirstGraphNode = async page => {
  const node = page.locator('svg#graph-studio-canvas-svg > g circle').first();
  await expect(node).toBeVisible();
  const box = await node.boundingBox();
  expect(box).not.toBeNull();

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    box.x + box.width / 2 + 72,
    box.y + box.height / 2 + 36,
    {
      steps: 8,
    }
  );
  await page.mouse.up();
};

const dragLegend = async (page, { dx = -160, dy = -100 } = {}) => {
  const legend = page.getByTestId('custom-export-legend');
  await expect(legend).toBeVisible();
  const box = await legend.boundingBox();
  expect(box).not.toBeNull();

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    box.x + box.width / 2 + dx,
    box.y + box.height / 2 + dy,
    { steps: 8 }
  );
  await page.mouse.up();

  await expect(legend).toHaveAttribute('data-legend-position', 'custom');
  return {
    x: Number(await legend.getAttribute('data-custom-position-x')),
    y: Number(await legend.getAttribute('data-custom-position-y')),
  };
};

const setRangeValue = async (page, label, value) => {
  await page.getByLabel(label).evaluate((input, nextValue) => {
    input.value = String(nextValue);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
};

const expectDownloadFrom = async ({ page, locator, filenamePattern }) => {
  const downloadPromise = page.waitForEvent('download');
  await locator.click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(filenamePattern);
  return download;
};

const readPngDimensions = async download => {
  const path = await download.path();
  expect(path).not.toBeNull();
  const buffer = await fs.readFile(path);
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
};

const expandLegendEditor = async page => {
  const editToggle = page.getByTestId('custom-legend-edit-toggle');
  const modal = page.getByTestId('custom-legend-modal');
  await expect(editToggle).toBeVisible();
  if (!(await modal.isVisible())) {
    await editToggle.click();
  }
  await expect(modal).toBeVisible();
  await expect(page.getByTestId('custom-legend-editor')).toBeVisible();
};

const closeLegendEditor = async page => {
  await page.getByRole('button', { name: 'Done' }).click();
  await expect(page.getByTestId('custom-legend-modal')).toBeHidden();
};

const openImportMenu = async page => {
  await page.getByTestId('open-import-menu').click();
  await expect(page.getByTestId('import-menu-modal')).toBeVisible();
  return page.getByTestId('import-menu-modal');
};

const openExportMenu = async page => {
  await page.getByTestId('open-export-menu').click();
  await expect(page.getByTestId('export-menu-modal')).toBeVisible();
  return page.getByTestId('export-menu-modal');
};

const expectExportPreview = async page => {
  const previewSection = page.getByTestId('export-preview-section');
  const previewImage = page.getByTestId('export-preview-image');
  await expect(previewSection).toBeVisible();
  await expect(previewImage).toBeVisible();
  await expect
    .poll(() =>
      previewImage.evaluate(
        image =>
          image.complete && image.naturalWidth > 0 && image.naturalHeight > 0
      )
    )
    .toBe(true);
  return previewImage;
};

const closeExportMenu = async page => {
  await page
    .getByTestId('export-menu-modal')
    .getByRole('button', { name: 'Close', exact: true })
    .last()
    .click();
  await expect(page.getByTestId('export-menu-modal')).toBeHidden();
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
  {
    value: 'kruskal-mst',
    firstDescription:
      'Kruskal MST: sort weighted edges ascending; each node starts in its own DSU component',
    secondDescription:
      'Consider edge A-B (1): find(A) and find(B) differ, so union accepts it',
    thirdDescription:
      'Consider edge D-E (5): find(D) equals find(E), so this cycle edge is rejected',
  },
  {
    value: 'dijkstra-shortest-paths',
    firstDescription:
      'Dijkstra starts at source S: distance[S]=0 and all other distances are infinity',
    secondDescription:
      'Relax edges from S: A gets distance 2 and B gets distance 5 as queued candidates',
    thirdDescription:
      'Final shortest-path tree from S: S-A, A-B, A-C, B-D, and D-T are highlighted',
  },
];

const presetLegends = [
  {
    value: 'bfs',
    title: 'BFS Legend',
    entries: ['Active node', 'Queued node', 'Visited node', 'Current edge'],
  },
  {
    value: 'dfs',
    title: 'DFS Legend',
    entries: ['Active node', 'Visited node', 'Completed edge'],
  },
  {
    value: 'dijkstra',
    title: 'Dijkstra Legend',
    entries: ['Current minimum', 'Candidate node', 'Superseded edge'],
  },
  {
    value: 'topological-sort',
    title: 'Topological Sort Legend',
    entries: ['Ready node', 'Processing node', 'Removing edge'],
  },
  {
    value: 'disjoint-set-union',
    title: 'DSU Legend',
    entries: ['Component A', 'Merged component', 'Rejected cycle'],
  },
  {
    value: 'connected-components',
    title: 'Connected Components Legend',
    entries: ['Component 1', 'Component 3', 'Traversing edge'],
  },
  {
    value: 'kruskal-mst',
    title: 'Kruskal MST Legend',
    entries: [
      'Candidate endpoints',
      'Accepted MST edge',
      'Rejected cycle edge',
    ],
  },
  {
    value: 'dijkstra-shortest-paths',
    title: 'Dijkstra Legend',
    entries: [
      'Current minimum',
      'Relaxed candidate edge',
      'Final shortest-path edge',
    ],
  },
  {
    value: 'multigraph',
    title: 'Multi-Edge / Loop Legend',
    entries: ['Candidate path', 'Selected path', 'Non-selected path'],
  },
];

const pastedProject = {
  format: 'graph-viz-project',
  version: 1,
  exportedAt: '2026-06-21T00:00:00.000Z',
  graph: {
    nodes: [
      { id: 'A', label: 'Pasted A', x: 320, y: 280, visible: true },
      { id: 'B', label: 'Pasted B', x: 560, y: 280, visible: true },
    ],
    edges: [
      {
        id: 'AB',
        from: 'A',
        to: 'B',
        directed: true,
        label: '1',
        color: '#64748B',
        visible: true,
        duration: 450,
      },
    ],
  },
  timeline: {
    currentFrame: 0,
    steps: [
      {
        id: 'step-0',
        description: 'Pasted JSON import test',
        durationMs: 600,
        nodeOverrides: {},
        edgeOverrides: {},
      },
    ],
  },
  settings: {
    edgeRouting: 'straight',
    snapEnabled: true,
    showGrid: false,
    lockCanvas: true,
    viewState: null,
    globalSettings: {
      forceStrength: 1,
      edgeCurvature: 46,
      nodeSize: 24,
      edgeWidth: 2.2,
    },
  },
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
    await expect(
      page.getByTestId('timeline-panel').getByRole('button', { name: 'Play' })
    ).toBeVisible();
    await expect(
      page.getByTestId('left-sidebar').getByRole('button', { name: 'Play' })
    ).toHaveCount(0);
    await expect(page.getByText(/item\(s\) selected/)).toHaveCount(0);

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

    const importMenu = await openImportMenu(page);
    await importMenu
      .getByRole('button', { name: 'Paste / Import Edge List' })
      .click();
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
      page
        .getByTestId('script-modal')
        .getByText(
          'Script error: Script timed out. Check for infinite loops or expensive work.'
        )
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeEnabled();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByText('Script Mode (Trace Recorder)')).toBeHidden();
    await expect(graphCanvas(page)).toBeVisible();

    expect(errors).toEqual([]);
  });

  test('loads Script Mode examples without auto-running them', async ({
    page,
  }) => {
    const errors = watchForUnexpectedErrors(page);

    await page.goto('/');
    await expect(graphCanvas(page)).toBeVisible();

    await page.getByRole('button', { name: 'Script Mode' }).click();
    await expect(page.getByText('Script Mode (Trace Recorder)')).toBeVisible();

    const exampleSelect = page.getByLabel('Load script example');
    const editor = page.locator('[data-testid="script-modal"] textarea');

    await expect(exampleSelect).toBeVisible();
    await exampleSelect.selectOption('bfs');
    await expect(editor).toHaveValue(/Breadth-first search/);
    await expect(editor).toHaveValue(/Start BFS/);
    await expect(page.getByText('Script Mode (Trace Recorder)')).toBeVisible();

    await page.getByRole('button', { name: 'Generate timeline' }).click();
    await expect(page.getByText('Script Mode (Trace Recorder)')).toBeHidden();
    await expect(page.getByText(/Script generated \d+ frames/)).toBeVisible();
    await expect(graphCanvas(page)).toBeVisible();

    await page.getByRole('button', { name: 'Script Mode' }).click();
    await exampleSelect.selectOption('dfs');
    await expect(editor).toHaveValue(/Depth-first search/);
    await expect(editor).not.toHaveValue(/Breadth-first search/);
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByText('Script Mode (Trace Recorder)')).toBeHidden();

    expect(errors).toEqual([]);
  });

  test('loads USACO Guide educational graph presets with timeline descriptions', async ({
    page,
  }) => {
    const errors = watchForUnexpectedErrors(page);

    await page.goto('/');
    await expect(graphCanvas(page)).toBeVisible();
    await expect(page.getByText('Presets', { exact: true })).toBeVisible();

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

      if (preset.thirdDescription) {
        const targetFrameIndex = preset.value === 'kruskal-mst' ? 5 : 7;
        await frameLabels.nth(targetFrameIndex).click();
        await expect(frameDescription).toHaveValue(preset.thirdDescription);
        await expect(graphCanvas(page)).toBeVisible();
      }
    }

    expect(errors).toEqual([]);
  });

  test('loads custom accurate legends for graph presets', async ({ page }) => {
    const errors = watchForUnexpectedErrors(page);

    await page.goto('/');
    await expect(graphCanvas(page)).toBeVisible();
    await page.getByRole('checkbox', { name: /^Legend$/ }).check();

    const legendTitle = page.getByTestId('custom-legend-title-input');
    const legendPreview = page.getByTestId('custom-export-legend');

    for (const preset of presetLegends) {
      await choosePreset(page, preset.value);
      await expect(
        page.getByRole('checkbox', { name: /^Legend$/ })
      ).toBeChecked();
      await expandLegendEditor(page);
      await expect(legendTitle).toHaveValue(preset.title);
      await expect(legendPreview).toBeVisible();
      await expect(
        legendPreview.getByText('Nodes', { exact: true })
      ).toBeVisible();
      await expect(
        legendPreview.getByText('Edges', { exact: true })
      ).toBeVisible();

      for (const entry of preset.entries) {
        await expect(
          legendPreview.getByText(entry, { exact: true })
        ).toBeVisible();
      }
      await closeLegendEditor(page);
    }

    expect(errors).toEqual([]);
  });

  test('supports unified editable legend preview and default reset', async ({
    page,
  }) => {
    const errors = watchForUnexpectedErrors(page);

    await page.goto('/');
    await expect(graphCanvas(page)).toBeVisible();

    const legendToggle = page.getByRole('checkbox', { name: /^Legend$/ });
    const legendEditToggle = page.getByTestId('custom-legend-edit-toggle');
    const legendModal = page.getByTestId('custom-legend-modal');
    const legendEditor = page.getByTestId('custom-legend-editor');
    const legendTitle = page.getByTestId('custom-legend-title-input');
    const legendPosition = page.getByTestId('custom-legend-position-select');
    const legendPlacement = page.getByTestId('custom-legend-placement-select');
    const legendPreview = page.getByTestId('custom-export-legend');

    await expect(page.getByLabel('Show State Legend')).toBeHidden();
    await expect(legendToggle).toBeVisible();
    await expect(legendEditToggle).toBeVisible();
    await expect(page.getByTestId('custom-legend-summary')).toContainText(
      '6 entries'
    );
    await expect(page.getByTestId('custom-legend-summary')).toContainText(
      'Auto'
    );
    await expect(legendPlacement).toHaveValue('auto');
    await expect(legendEditor).toBeHidden();
    await expect(legendToggle).not.toBeChecked();
    await expect(legendPreview).toBeHidden();

    await legendEditToggle.click();
    await expect(legendEditToggle).toHaveAttribute('aria-expanded', 'true');
    await expect(legendModal).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Edit Legend' })
    ).toBeVisible();
    await expect(legendEditor).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(legendEditToggle).toHaveAttribute('aria-expanded', 'false');
    await expect(legendModal).toBeHidden();
    await expect(legendEditor).toBeHidden();
    await legendEditToggle.click();
    await expect(legendModal).toBeVisible();
    await expect(legendEditor).toBeVisible();

    await page.getByLabel('Enable Legend').check();
    await expect(legendPreview).toBeVisible();
    for (const text of [
      'Nodes',
      'Default node',
      'Active node',
      'Visited node',
      'Queued node',
      'Edges',
      'Highlighted edge',
      'Selected edge',
    ]) {
      await expect(
        legendPreview.locator('text').filter({ hasText: text })
      ).toBeVisible();
    }

    await legendTitle.fill('Traversal Key');
    await page.getByTestId('custom-legend-add-entry').click();
    await page.getByTestId('custom-legend-entry-group-6').fill('Edges');
    await page.getByTestId('custom-legend-entry-label-6').fill('Frontier edge');
    await page.getByTestId('custom-legend-entry-kind-6').selectOption('edge');
    await page.getByTestId('custom-legend-entry-color-6').fill('#f59e0b');
    await legendPlacement.selectOption('top-left');

    await expect(legendPreview).toHaveAttribute(
      'transform',
      /translate\(16 16\)/
    );
    await expect(legendPosition).toHaveValue('top-left');
    await expect(
      legendPreview.locator('text').filter({ hasText: 'Traversal Key' })
    ).toBeVisible();
    await expect(
      legendPreview.locator('text').filter({ hasText: 'Frontier edge' })
    ).toBeVisible();
    await expect(
      legendPreview.locator('line[stroke="#f59e0b"]')
    ).toHaveAttribute('stroke', '#f59e0b');
    await expect(graphCanvas(page)).toBeVisible();

    await page.getByTestId('custom-legend-reset').click();
    await expect(legendToggle).toBeChecked();
    await expect(legendTitle).toHaveValue('Legend');
    await expect(legendPosition).toHaveValue('auto');
    await expect(legendPlacement).toHaveValue('auto');
    await expect(page.getByTestId('custom-legend-entry-group-0')).toHaveValue(
      'Nodes'
    );
    await expect(page.getByTestId('custom-legend-entry-label-0')).toHaveValue(
      'Default node'
    );
    await expect(page.getByTestId('custom-legend-entry-kind-0')).toHaveValue(
      'node'
    );
    await expect(
      legendPreview.locator('text').filter({ hasText: 'Nodes' })
    ).toBeVisible();
    await expect(
      legendPreview.locator('text').filter({ hasText: 'Edges' })
    ).toBeVisible();
    await closeLegendEditor(page);

    expect(errors).toEqual([]);
  });

  test('supports full project JSON export and import', async ({ page }) => {
    const errors = watchForUnexpectedErrors(page);

    await page.goto('/');
    await expect(graphCanvas(page)).toBeVisible();

    await openExportMenu(page);
    await expect(page.getByTestId('project-export-button')).toBeVisible();
    const downloadPromise = page.waitForEvent('download');
    await page.getByTestId('project-export-button').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.graphviz\.json$/);
    await closeExportMenu(page);

    await openImportMenu(page);
    await expect(page.getByTestId('project-import-button')).toBeVisible();
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
    await expect(
      page.getByRole('checkbox', { name: /^Legend$/ })
    ).toBeChecked();
    await expect(page.getByTestId('custom-export-legend')).toBeVisible();
    await expect(
      page
        .getByTestId('custom-export-legend')
        .locator('text')
        .filter({ hasText: 'Nodes' })
    ).toBeVisible();

    await openImportMenu(page);
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

  test('opens consolidated import and export menus', async ({ page }) => {
    const errors = watchForUnexpectedErrors(page);

    await page.goto('/');
    await expect(graphCanvas(page)).toBeVisible();

    const importMenu = await openImportMenu(page);
    await expect(
      importMenu.getByRole('heading', { name: 'Import' })
    ).toBeVisible();
    await expect(
      importMenu.getByRole('button', { name: 'Upload Project File' })
    ).toBeVisible();
    await expect(
      importMenu.getByRole('button', { name: 'Paste Project JSON' })
    ).toBeVisible();
    await expect(
      importMenu.getByRole('button', { name: 'Paste / Import Edge List' })
    ).toBeVisible();
    await importMenu.getByRole('button', { name: 'Cancel' }).click();
    await expect(importMenu).toBeHidden();

    const exportMenu = await openExportMenu(page);
    await expect(
      exportMenu.getByRole('heading', { name: 'Export' })
    ).toBeVisible();
    await exportMenu.getByRole('button', { name: 'Export Edge List' }).click();
    await expect(page.getByTestId('graph-studio-status')).toHaveText(
      /Edge list copied to clipboard|Clipboard unavailable/
    );
    const parserModal = page.getByTestId('parser-modal');
    if (await parserModal.isVisible()) {
      await expect(parserModal.locator('textarea')).not.toHaveValue('');
      await parserModal.getByRole('button', { name: 'Cancel' }).click();
    }
    await closeExportMenu(page);

    expect(errors).toEqual([]);
  });

  test('keeps import and export menus usable on mobile', async ({ page }) => {
    const errors = watchForUnexpectedErrors(page);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await expect(graphCanvas(page)).toBeVisible();
    await page.getByTestId('mobile-tools-toggle').click();

    const importButton = page.getByTestId('open-import-menu');
    await importButton.scrollIntoViewIfNeeded();
    await importButton.click();
    const importMenu = page.getByTestId('import-menu-modal');
    await expect(importMenu).toBeVisible();
    await expect(
      importMenu.getByRole('button', { name: 'Upload Project File' })
    ).toBeVisible();
    await importMenu.getByRole('button', { name: 'Cancel' }).click();

    const exportButton = page.getByTestId('open-export-menu');
    await exportButton.scrollIntoViewIfNeeded();
    await exportButton.click();
    const exportMenu = page.getByTestId('export-menu-modal');
    await expect(exportMenu).toBeVisible();
    await expect(exportMenu.getByLabel('PNG Scale')).toBeVisible();
    await expect(exportMenu.getByLabel('Image Framing')).toBeVisible();
    await expectExportPreview(page);
    await exportMenu
      .getByTestId('export-frame-range-controls')
      .scrollIntoViewIfNeeded();
    await expect(
      exportMenu.getByTestId('export-frame-range-controls')
    ).toBeVisible();

    const exportDialogBox = await exportMenu.getByRole('dialog').boundingBox();
    expect(exportDialogBox).not.toBeNull();
    expect(exportDialogBox.x).toBeGreaterThanOrEqual(0);
    expect(exportDialogBox.x + exportDialogBox.width).toBeLessThanOrEqual(390);

    expect(errors).toEqual([]);
  });

  test('previews the current frame with the selected image framing', async ({
    page,
  }) => {
    const errors = watchForUnexpectedErrors(page);

    await page.goto('/');
    await expect(graphCanvas(page)).toBeVisible();

    const exportMenu = await openExportMenu(page);
    const previewImage = await expectExportPreview(page);
    const viewportPreviewUrl = await previewImage.getAttribute('src');
    expect(viewportPreviewUrl).toMatch(/^data:image\/svg\+xml/);
    await expect(
      exportMenu.getByTestId('export-preview-section')
    ).toContainText(
      'PNG/SVG export the current editor frame. Use the main timeline to change it.'
    );

    await exportMenu.getByLabel('Image Framing').selectOption('fit');
    await expect(
      exportMenu.getByTestId('export-preview-panel')
    ).toHaveAttribute('data-preview-framing', 'fit');
    await expectExportPreview(page);
    await expect
      .poll(() => previewImage.getAttribute('src'))
      .not.toBe(viewportPreviewUrl);

    expect(errors).toEqual([]);
  });

  test('reviews only included export frames without changing the editor frame', async ({
    page,
  }) => {
    const errors = watchForUnexpectedErrors(page);

    await page.goto('/');
    await expect(graphCanvas(page)).toBeVisible();
    await choosePreset(page, 'bfs');

    const frameCounter = page.getByText(/^\d+ \/ \d+$/).first();
    const editorFrameBeforeReview = await frameCounter.textContent();
    const exportMenu = await openExportMenu(page);
    const frameList = exportMenu.getByTestId('export-preview-frame-list');
    const frameItems = frameList.locator(
      '[data-testid^="export-preview-frame-item-"]'
    );

    await expect(frameList).toBeVisible();
    await expect(
      exportMenu
        .getByTestId('export-preview-section')
        .getByTestId('export-preview-frame-list')
    ).toBeVisible();
    await expect(frameItems).toHaveCount(5);
    await expect(exportMenu.getByLabel('Export start frame')).toHaveCount(0);
    await expect(exportMenu.getByLabel('Export end frame')).toHaveCount(0);
    await expect(
      exportMenu.getByTestId('export-preview-frame-item-0')
    ).toHaveAttribute('aria-current', 'true');
    const previewImage = await expectExportPreview(page);
    const firstFramePreviewUrl = await previewImage.getAttribute('src');

    await exportMenu.getByTestId('export-preview-frame-item-1').click();
    await expect(previewImage).toBeVisible();
    await expect(exportMenu.getByTestId('export-preview-status')).toHaveCount(
      0
    );
    await expect(
      exportMenu.getByTestId('export-preview-frame-item-1')
    ).toHaveAttribute('aria-current', 'true');
    await expect(
      exportMenu.getByTestId('export-preview-panel')
    ).toHaveAttribute('data-preview-frame-index', '1');
    await expectExportPreview(page);
    await expect
      .poll(() => previewImage.getAttribute('src'))
      .not.toBe(firstFramePreviewUrl);
    await expect(frameCounter).toHaveText(editorFrameBeforeReview);

    await exportMenu.getByRole('radio', { name: 'Current' }).check();
    await expect(frameItems).toHaveCount(1);
    await expect(
      exportMenu.getByTestId('export-preview-frame-item-0')
    ).toBeVisible();

    await exportMenu.getByRole('radio', { name: 'Range' }).check();
    await expect(exportMenu.getByLabel('Export start frame')).toBeVisible();
    await expect(exportMenu.getByLabel('Export end frame')).toBeVisible();
    await exportMenu.getByLabel('Export start frame').click();
    await exportMenu.getByLabel('Export start frame').clear();
    await exportMenu.getByLabel('Export start frame').pressSequentially('2');
    await expect(exportMenu.getByLabel('Export start frame')).toHaveValue('2');
    await exportMenu.getByLabel('Export end frame').click();
    await exportMenu.getByLabel('Export end frame').clear();
    await exportMenu.getByLabel('Export end frame').pressSequentially('3');
    await expect(exportMenu.getByLabel('Export end frame')).toHaveValue('3');
    await expect(frameItems).toHaveCount(2);
    await expect(
      exportMenu.getByTestId('export-preview-frame-item-1')
    ).toBeVisible();
    await expect(
      exportMenu.getByTestId('export-preview-frame-item-2')
    ).toBeVisible();
    await expect(
      exportMenu.getByTestId('export-preview-frame-item-0')
    ).toHaveCount(0);
    await expect(frameCounter).toHaveText(editorFrameBeforeReview);

    expect(errors).toEqual([]);
  });

  test('imports valid pasted project JSON', async ({ page }) => {
    const errors = watchForUnexpectedErrors(page);

    await page.goto('/');
    await expect(graphCanvas(page)).toBeVisible();

    await openImportMenu(page);
    await page.getByTestId('project-paste-json-button').click();
    const modal = page.getByTestId('project-json-paste-modal');
    await expect(modal).toBeVisible();
    await expect(modal.getByText('Import Project JSON')).toBeVisible();

    await page
      .getByTestId('project-json-paste-textarea')
      .fill(JSON.stringify(pastedProject));
    await page.getByTestId('project-json-paste-submit').click();

    await expect(modal).toBeHidden();
    await expect(page.getByText('Project imported')).toBeVisible();
    await expect(graphCanvas(page)).toBeVisible();
    await expect(
      page.getByPlaceholder('Enter a description for this frame...')
    ).toHaveValue('Pasted JSON import test');
    await expect(
      graphCanvas(page).locator('text').filter({ hasText: 'Pasted A' })
    ).toBeVisible();

    expect(errors).toEqual([]);
  });

  test('keeps pasted project JSON errors inside the modal', async ({
    page,
  }) => {
    const errors = watchForUnexpectedErrors(page);

    await page.goto('/');
    await expect(graphCanvas(page)).toBeVisible();
    const originalDescription = await page
      .getByPlaceholder('Enter a description for this frame...')
      .inputValue();

    await openImportMenu(page);
    await page.getByTestId('project-paste-json-button').click();
    const modal = page.getByTestId('project-json-paste-modal');
    const textarea = page.getByTestId('project-json-paste-textarea');
    await expect(modal).toBeVisible();

    await page.getByTestId('project-json-paste-submit').click();
    await expect(
      modal.getByText(
        'Project import error: Paste project JSON before importing.'
      )
    ).toBeVisible();

    await textarea.fill('{ bad json');
    await expect(modal.getByRole('alert')).toBeHidden();
    await page.getByTestId('project-json-paste-submit').click();

    await expect(modal).toBeVisible();
    await expect(
      modal.getByText('Project import error: Invalid JSON')
    ).toBeVisible();
    await expect(page.getByTestId('graph-studio-status')).toBeVisible();
    await expect(page.getByTestId('graph-studio-status')).toHaveText(
      'Project import error: Invalid JSON'
    );
    await expect(graphCanvas(page)).toBeVisible();
    await expect(
      page.getByPlaceholder('Enter a description for this frame...')
    ).toHaveValue(originalDescription);

    await modal.getByRole('button', { name: 'Cancel' }).click();
    await openImportMenu(page);
    await page.getByTestId('project-paste-json-button').click();
    await expect(textarea).toHaveValue('');
    await expect(modal.getByRole('alert')).toBeHidden();

    expect(errors).toEqual([]);
  });

  test('supports editable legend preview and project round trip', async ({
    page,
  }) => {
    const errors = watchForUnexpectedErrors(page);

    await page.goto('/');
    await expect(graphCanvas(page)).toBeVisible();

    const legendControls = page.getByTestId('custom-legend-controls');
    const legendToggle = page.getByRole('checkbox', { name: /^Legend$/ });
    const legendTitle = page.getByTestId('custom-legend-title-input');
    const legendPosition = page.getByTestId('custom-legend-position-select');
    const legendPreview = page.getByTestId('custom-export-legend');

    await expect(legendControls).toBeVisible();
    await expect(page.getByTestId('custom-legend-editor')).toBeHidden();
    await expect(legendToggle).not.toBeChecked();
    await expect(legendPreview).toBeHidden();

    await expandLegendEditor(page);
    await page.getByLabel('Enable Legend').check();
    await expect(legendPreview).toBeVisible();
    await expect(
      legendPreview.locator('text').filter({ hasText: 'Legend' })
    ).toBeVisible();

    await legendTitle.fill('Traversal Key');
    await page.getByTestId('custom-legend-add-entry').click();
    await page.getByTestId('custom-legend-entry-group-6').fill('Edges');
    await page.getByTestId('custom-legend-entry-label-6').fill('Frontier');
    await page.getByTestId('custom-legend-entry-kind-6').selectOption('edge');
    await page.getByTestId('custom-legend-entry-color-6').fill('#f59e0b');
    await expect(
      legendPreview.locator('text').filter({ hasText: 'Traversal Key' })
    ).toBeVisible();
    await expect(
      legendPreview.locator('text').filter({ hasText: 'Frontier' })
    ).toBeVisible();
    await expect(
      legendPreview.locator('line[stroke="#f59e0b"]')
    ).toHaveAttribute('stroke', '#f59e0b');

    await closeLegendEditor(page);
    const draggedPosition = await dragLegend(page);
    expect(draggedPosition.x).toBeGreaterThanOrEqual(0);
    expect(draggedPosition.x).toBeLessThanOrEqual(1);
    expect(draggedPosition.y).toBeGreaterThanOrEqual(0);
    expect(draggedPosition.y).toBeLessThanOrEqual(1);
    await expandLegendEditor(page);
    await expect(legendPosition).toHaveValue('custom');
    await expect(
      page.getByText('Drag the legend on the canvas to place it.')
    ).toBeVisible();
    await closeLegendEditor(page);

    await openExportMenu(page);
    const downloadPromise = page.waitForEvent('download');
    await page.getByTestId('project-export-button').click();
    const download = await downloadPromise;
    const downloadPath = await download.path();
    const exportedProject = JSON.parse(await fs.readFile(downloadPath, 'utf8'));
    expect(exportedProject.settings).not.toHaveProperty('showLegend');
    expect(exportedProject.settings.customLegend).toMatchObject({
      enabled: true,
      title: 'Traversal Key',
      position: 'custom',
    });
    expect(exportedProject.settings.customLegend.customPosition.x).toBeCloseTo(
      draggedPosition.x,
      5
    );
    expect(exportedProject.settings.customLegend.customPosition.y).toBeCloseTo(
      draggedPosition.y,
      5
    );
    expect(exportedProject.settings.customLegend.entries).toEqual(
      expect.arrayContaining([
        {
          group: 'Edges',
          kind: 'edge',
          label: 'Frontier',
          color: '#f59e0b',
        },
      ])
    );
    await closeExportMenu(page);

    await legendToggle.uncheck();
    await expandLegendEditor(page);
    await legendTitle.fill('Temporary');
    await legendPosition.selectOption('bottom-right');
    await expect(legendPreview).toBeHidden();

    await closeLegendEditor(page);
    await openImportMenu(page);
    await page.getByTestId('project-import-input').setInputFiles(downloadPath);
    await expect(page.getByText('Project imported')).toBeVisible();
    await expandLegendEditor(page);
    await expect(legendToggle).toBeChecked();
    await expect(legendTitle).toHaveValue('Traversal Key');
    await expect(legendPosition).toHaveValue('custom');
    await expect(page.getByTestId('custom-legend-entry-group-6')).toHaveValue(
      'Edges'
    );
    await expect(page.getByTestId('custom-legend-entry-label-6')).toHaveValue(
      'Frontier'
    );
    await expect(page.getByTestId('custom-legend-entry-kind-6')).toHaveValue(
      'edge'
    );
    await expect(page.getByTestId('custom-legend-entry-color-6')).toHaveValue(
      '#f59e0b'
    );
    await expect(legendPreview).toBeVisible();
    await expect(legendPreview).toHaveAttribute('transform', /translate\(/);
    expect(
      Number(await legendPreview.getAttribute('data-custom-position-x'))
    ).toBeCloseTo(draggedPosition.x, 5);
    expect(
      Number(await legendPreview.getAttribute('data-custom-position-y'))
    ).toBeCloseTo(draggedPosition.y, 5);

    expect(errors).toEqual([]);
  });

  test('imports and renders a directed self-loop edge', async ({ page }) => {
    const errors = watchForUnexpectedErrors(page);

    await page.goto('/');
    await expect(graphCanvas(page)).toBeVisible();

    await openImportMenu(page);
    await page
      .getByTestId('project-import-input')
      .setInputFiles(fixturePath('self-loop-project.graphviz.json'));
    await expect(page.getByText('Project imported')).toBeVisible();
    await expect(graphCanvas(page)).toBeVisible();
    await expect(
      page.getByRole('checkbox', { name: /^Legend$/ })
    ).not.toBeChecked();
    await expect(page.getByTestId('custom-export-legend')).toBeHidden();

    const selfLoopEdge = graphCanvas(page).locator(
      'path[marker-end^="url(#graphstudio-arrow-"]'
    );
    await expect(selfLoopEdge).toHaveCount(1);
    await expect(selfLoopEdge.first()).toBeVisible();
    await expect(selfLoopEdge.first()).toHaveAttribute('stroke', '#64748b');
    await expect(selfLoopEdge.first()).toHaveAttribute(
      'marker-end',
      'url(#graphstudio-arrow-64748b)'
    );
    const selfLoopLabel = graphCanvas(page).locator(
      '[data-edge-label-id="loop"]'
    );
    const selfLoopLabelText = selfLoopLabel.locator(
      '[data-edge-label-text="true"]'
    );
    await expect(selfLoopLabelText).toBeVisible();
    await expect(selfLoopLabelText).toHaveText('loop');
    await expect(selfLoopLabelText).toHaveAttribute('font-size', '12');
    await expect(selfLoopLabel).toHaveAttribute('pointer-events', 'none');

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

    await openExportMenu(page);
    const svgDownload = await expectDownloadFrom({
      page,
      locator: page.getByTestId('svg-export-button'),
      filenamePattern: /\.svg$/,
    });
    const svgPath = await svgDownload.path();
    expect(svgPath).not.toBeNull();
    const exportedSvg = await fs.readFile(svgPath, 'utf8');
    expect(exportedSvg).toContain('data-edge-label-text="true"');
    expect(exportedSvg).toContain('font-size="12"');
    expect(exportedSvg).toContain('>loop</text>');

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

    const marker = graphCanvas(page).locator('marker#graphstudio-arrow-64748b');
    await expect(marker).toHaveAttribute('markerWidth', '12');
    await expect(marker).toHaveAttribute('markerHeight', '12');
    await expect(marker).toHaveAttribute('refX', '10');
    await expect(marker).toHaveAttribute('refY', '6');
    await expect(marker).toHaveAttribute('orient', 'auto');
    await expect(marker).toHaveAttribute('markerUnits', 'userSpaceOnUse');

    const markerTriangle = graphCanvas(page).locator(
      'marker#graphstudio-arrow-64748b path'
    );
    await expect(markerTriangle).toHaveAttribute('fill', '#64748B');

    const directedEdges = graphCanvas(page).locator(
      'path[marker-end^="url(#graphstudio-arrow-"]'
    );
    await expect(directedEdges.first()).toBeVisible();
    await expect(directedEdges.first()).toHaveAttribute('stroke', '#64748B');
    await expect(directedEdges.first()).toHaveAttribute(
      'marker-end',
      'url(#graphstudio-arrow-64748b)'
    );

    await openExportMenu(page);
    const defaultSvgDownload = await expectDownloadFrom({
      page,
      locator: page.getByTestId('svg-export-button'),
      filenamePattern: /\.svg$/,
    });
    const defaultSvgPath = await defaultSvgDownload.path();
    expect(defaultSvgPath).not.toBeNull();
    const defaultExportedSvg = await fs.readFile(defaultSvgPath, 'utf8');
    expect(defaultExportedSvg).toContain('id="graphstudio-arrow-64748b"');
    expect(defaultExportedSvg).toContain('data-edge-color="#64748B"');
    expect(defaultExportedSvg).toContain('fill="#64748B"');
    expect(defaultExportedSvg).toContain(
      'marker-end="url(#graphstudio-arrow-64748b)"'
    );
    await closeExportMenu(page);

    await page.getByText('Frame 2').click();
    await expect(directedEdges.first()).toHaveAttribute('stroke', '#3b82f6');
    await expect(directedEdges.first()).toHaveAttribute(
      'marker-end',
      'url(#graphstudio-arrow-3b82f6)'
    );
    await expect(
      graphCanvas(page).locator('marker#graphstudio-arrow-3b82f6 path')
    ).toHaveAttribute('fill', '#3b82f6');

    await page.getByRole('button', { name: 'Script Mode' }).click();
    await page.locator('[data-testid="script-modal"] textarea').fill(`
api.edge('e0', '#f59e0b');
`);
    await page.getByRole('button', { name: 'Generate timeline' }).click();
    await expect(page.getByText('Script Mode (Trace Recorder)')).toBeHidden();
    await page.getByText('Frame 2').click();
    await expect(directedEdges.first()).toHaveAttribute('stroke', '#f59e0b');
    await expect(directedEdges.first()).toHaveAttribute(
      'marker-end',
      'url(#graphstudio-arrow-f59e0b)'
    );
    await expect(
      graphCanvas(page).locator('marker#graphstudio-arrow-f59e0b path')
    ).toHaveAttribute('fill', '#f59e0b');

    await openExportMenu(page);
    const overrideSvgDownload = await expectDownloadFrom({
      page,
      locator: page.getByTestId('svg-export-button'),
      filenamePattern: /\.svg$/,
    });
    const overrideSvgPath = await overrideSvgDownload.path();
    expect(overrideSvgPath).not.toBeNull();
    const overrideExportedSvg = await fs.readFile(overrideSvgPath, 'utf8');
    expect(overrideExportedSvg).toContain('id="graphstudio-arrow-f59e0b"');
    expect(overrideExportedSvg).toContain('data-edge-color="#f59e0b"');
    expect(overrideExportedSvg).toContain('fill="#f59e0b"');
    expect(overrideExportedSvg).toContain(
      'marker-end="url(#graphstudio-arrow-f59e0b)"'
    );
    await closeExportMenu(page);

    const firstEdgeHitTarget = directedEdges
      .first()
      .locator('xpath=..')
      .locator('path[stroke="rgba(0,0,0,0)"]');
    await firstEdgeHitTarget.dispatchEvent('click');
    await expect(directedEdges.first()).toHaveAttribute('stroke', '#171717');
    await expect(directedEdges.first()).toHaveAttribute(
      'marker-end',
      'url(#graphstudio-arrow-171717)'
    );
    await expect(
      graphCanvas(page).locator('marker#graphstudio-arrow-171717 path')
    ).toHaveAttribute('fill', '#171717');

    expect(errors).toEqual([]);
  });

  test('keeps directed edge endpoints anchored through graph interactions', async ({
    page,
  }) => {
    const errors = watchForUnexpectedErrors(page);

    await page.goto('/');
    await expect(graphCanvas(page)).toBeVisible();

    await choosePreset(page, 'dfs');
    await expectDirectedEdgesAnchored(page);

    await page.getByLabel('Edge routing').selectOption('bezier');
    await expectDirectedEdgesAnchored(page);

    await setRangeValue(page, 'Node size', 34);
    await setRangeValue(page, 'Edge width', 5);
    await expectDirectedEdgesAnchored(page);

    await dragFirstGraphNode(page);
    await expect(graphCanvas(page)).toBeVisible();
    await expectDirectedEdgesAnchored(page);

    for (const layout of ['Circle', 'Tree', 'Force']) {
      await page.getByRole('button', { name: layout }).click();
      await expect(graphCanvas(page)).toBeVisible();
      await expectDirectedEdgesAnchored(page);
    }

    await choosePreset(page, 'kruskal-mst');
    await page.getByText('Frame 6').click();
    await expect(
      graphCanvas(page).locator('path[stroke]').first()
    ).toBeVisible();

    await choosePreset(page, 'dijkstra-shortest-paths');
    await page.getByText('Frame 2').click();
    await expectDirectedEdgesAnchored(page);

    expect(errors).toEqual([]);
  });

  test('exports the default timeline as a PPTX slideshow', async ({ page }) => {
    const errors = watchForUnexpectedErrors(page);

    await page.goto('/');
    await expect(graphCanvas(page)).toBeVisible();

    const frameCounter = page.getByText(/^\d+ \/ \d+$/).first();
    const initialFrameCounter = await frameCounter.textContent();

    await openExportMenu(page);
    await expect(page.getByTestId('slideshow-export-button')).toBeVisible();
    await expect(page.getByTestId('slideshow-export-button')).toBeEnabled();
    await expect(page.getByTestId('svg-export-button')).toBeVisible();
    await expect(page.getByTestId('svg-export-button')).toBeEnabled();
    await expect(page.getByTestId('png-export-button')).toBeVisible();
    await expect(page.getByTestId('png-export-button')).toBeEnabled();
    await expect(page.getByTestId('image-export-controls')).toBeVisible();
    const pngScaleSelect = page.getByTestId('png-scale-select');
    const imageFramingSelect = page.getByTestId('image-framing-select');
    await expect(pngScaleSelect).toHaveValue('2');
    await expect(imageFramingSelect).toHaveValue('viewport');
    await expect(page.getByTestId('export-frame-range-controls')).toBeVisible();
    await expect(page.getByRole('radio', { name: 'All' })).toBeChecked();
    await expect(
      page.getByRole('radio', { name: 'Current' })
    ).not.toBeChecked();
    await expect(page.getByRole('radio', { name: 'Range' })).not.toBeChecked();

    await expectDownloadFrom({
      page,
      locator: page.getByTestId('svg-export-button'),
      filenamePattern: /\.svg$/,
    });
    await expect(page.getByText('SVG exported')).toBeVisible();

    const twoXDownload = await expectDownloadFrom({
      page,
      locator: page.getByTestId('png-export-button'),
      filenamePattern: /\.png$/,
    });
    await expect(page.getByText('PNG exported')).toBeVisible();
    const twoXDimensions = await readPngDimensions(twoXDownload);
    expect(
      Math.max(twoXDimensions.width, twoXDimensions.height)
    ).toBeLessThanOrEqual(4096);

    await pngScaleSelect.selectOption('1');
    await expect(pngScaleSelect).toHaveValue('1');
    const oneXDownload = await expectDownloadFrom({
      page,
      locator: page.getByTestId('png-export-button'),
      filenamePattern: /\.png$/,
    });
    const oneXDimensions = await readPngDimensions(oneXDownload);
    expect(
      Math.abs(twoXDimensions.width - oneXDimensions.width * 2)
    ).toBeLessThanOrEqual(1);
    expect(
      Math.abs(twoXDimensions.height - oneXDimensions.height * 2)
    ).toBeLessThanOrEqual(1);

    await pngScaleSelect.selectOption('3');
    await expect(pngScaleSelect).toHaveValue('3');
    await imageFramingSelect.selectOption('fit');
    await expect(imageFramingSelect).toHaveValue('fit');
    const graphTransformGroup = graphCanvas(page)
      .locator('[data-export-content="true"]')
      .locator('..');
    const graphTransformBeforeFitExport =
      await graphTransformGroup.getAttribute('transform');

    await closeExportMenu(page);
    await page.getByRole('checkbox', { name: /^Legend$/ }).check();
    await expandLegendEditor(page);
    await page.getByTestId('custom-legend-title-input').fill('Export Key');
    await page.getByTestId('custom-legend-add-entry').click();
    await page.getByTestId('custom-legend-entry-group-6').fill('Edges');
    await page.getByTestId('custom-legend-entry-label-6').fill('Critical path');
    await page.getByTestId('custom-legend-entry-kind-6').selectOption('edge');
    await page.getByTestId('custom-legend-entry-color-6').fill('#f59e0b');
    await expect(page.getByTestId('custom-export-legend')).toBeVisible();
    await closeLegendEditor(page);
    await dragLegend(page, { dx: -180, dy: -120 });

    await openExportMenu(page);
    const previewImage = await expectExportPreview(page);
    await expect
      .poll(() =>
        previewImage.evaluate(async image => (await fetch(image.src)).text())
      )
      .toContain('Export Key');
    const previewSvgText = await previewImage.evaluate(async image =>
      (await fetch(image.src)).text()
    );
    expect(previewSvgText).toContain('Export Key');
    expect(previewSvgText).toContain('data-legend-position="custom"');
    const customSvgDownload = await expectDownloadFrom({
      page,
      locator: page.getByTestId('svg-export-button'),
      filenamePattern: /\.svg$/,
    });
    const customSvgPath = await customSvgDownload.path();
    expect(customSvgPath).not.toBeNull();
    const customSvgText = await fs.readFile(customSvgPath, 'utf8');
    expect(customSvgText).toContain('data-legend-position="custom"');
    expect(customSvgText).toMatch(
      /data-testid="custom-export-legend"[^>]+transform="translate\([^"]+\)"/
    );
    const threeXDownload = await expectDownloadFrom({
      page,
      locator: page.getByTestId('png-export-button'),
      filenamePattern: /\.png$/,
    });
    const threeXDimensions = await readPngDimensions(threeXDownload);
    expect(
      Math.max(threeXDimensions.width, threeXDimensions.height)
    ).toBeLessThanOrEqual(4096);
    expect(
      Math.abs(threeXDimensions.width - oneXDimensions.width * 3)
    ).toBeLessThanOrEqual(1);
    expect(
      Math.abs(threeXDimensions.height - oneXDimensions.height * 3)
    ).toBeLessThanOrEqual(1);
    await expect(graphTransformGroup).toHaveAttribute(
      'transform',
      graphTransformBeforeFitExport
    );

    await page.getByRole('button', { name: 'Export MP4' }).click();
    await expect(page.getByText('Export MP4 Video')).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByText('Export MP4 Video')).toBeHidden();

    await openExportMenu(page);
    await expectDownloadFrom({
      page,
      locator: page.getByTestId('slideshow-export-button'),
      filenamePattern: /\.pptx$/,
    });

    await expect(page.getByText('Slideshow exported')).toBeVisible();
    await expect(frameCounter).toHaveText(initialFrameCounter);
    await expect(graphCanvas(page)).toBeVisible();

    await page.getByRole('radio', { name: 'Current' }).check();
    await expect(page.getByRole('radio', { name: 'Current' })).toBeChecked();
    await expectDownloadFrom({
      page,
      locator: page.getByTestId('slideshow-export-button'),
      filenamePattern: /\.pptx$/,
    });
    await expect(frameCounter).toHaveText(initialFrameCounter);

    await closeExportMenu(page);
    await choosePreset(page, 'bfs');
    await openExportMenu(page);
    await page.getByRole('radio', { name: 'Range' }).check();
    await expect(page.getByRole('radio', { name: 'Range' })).toBeChecked();
    await page.getByLabel('Export start frame').fill('1');
    await page.getByLabel('Export end frame').fill('2');
    await expectDownloadFrom({
      page,
      locator: page.getByTestId('slideshow-export-button'),
      filenamePattern: /\.pptx$/,
    });
    await expect(graphCanvas(page)).toBeVisible();

    expect(errors).toEqual([]);
  });
});
