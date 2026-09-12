import { expect, test } from '@playwright/test';
import { Buffer } from 'node:buffer';

const canvas = page => page.getByTestId('graph-canvas-svg');
const project = () => ({
  format: 'graph-viz-project',
  version: 1,
  graph: {
    nodes: [
      { id: 'L', label: 'Laser', x: 240, y: 660 },
      { id: 'P', label: 'Post', x: 240, y: 470 },
      { id: 'B', label: 'Barn', x: 820, y: 470 },
      { id: 'X', label: 'Top', x: 350, y: 90 },
      { id: 'hidden', label: 'Hidden', x: 900, y: 600, visible: false },
    ],
    edges: [
      { id: 'e0', from: 'L', to: 'P', directed: true },
      { id: 'e1', from: 'P', to: 'B', directed: true },
    ],
  },
  timeline: {
    currentFrame: 0,
    steps: [
      {
        id: 'first',
        description:
          'One mirror changes the beam direction. The other post is passed without a turn.',
        nodeOverrides: {},
        edgeOverrides: {},
      },
    ],
  },
  settings: {
    globalSettings: { nodeSize: 28 },
    lockCanvas: false,
    captionOverlay: {
      enabled: true,
      position: { x: 0, y: 1 },
      style: 'light',
      fontSize: 16,
    },
    customLegend: {
      enabled: true,
      mode: 'custom',
      title: 'Lasers and mirrors',
      position: 'top-left',
      entries: [
        { label: 'Laser', color: '#2563EB', kind: 'node' },
        { label: 'Beam', color: '#0F766E', kind: 'edge' },
      ],
    },
  },
});

const importProject = async (page, value) => {
  await page.getByRole('button', { name: 'Import...', exact: true }).click();
  await page.getByTestId('project-import-input').setInputFiles({
    name: 'framing.graphviz.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(value)),
  });
  await expect(
    page.getByText('Project imported', { exact: true })
  ).toBeVisible();
  await expect(canvas(page)).toHaveAttribute('data-view-ready', 'true');
};

const overlaps = page =>
  canvas(page).evaluate(svg => {
    const obstacles = [
      ...svg.querySelectorAll('[data-caption-overlay],[data-legend-position]'),
    ].map(el => el.getBoundingClientRect());
    return [...svg.querySelectorAll('[data-node-id]')]
      .filter(node => {
        const b = node.getBoundingClientRect();
        return obstacles.some(
          o =>
            b.left < o.right &&
            b.right > o.left &&
            b.top < o.bottom &&
            b.bottom > o.top
        );
      })
      .map(node => node.getAttribute('data-node-id'));
  });

test('blank projects create readable nodes at normal zoom', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByLabel('Load graph preset').selectOption('blank');
  await expect(canvas(page)).toHaveAttribute('data-view-zoom', '1');
  await page.getByRole('button', { name: 'Add Node', exact: true }).click();
  await canvas(page).click({ position: { x: 180, y: 160 } });
  const label = canvas(page).locator('[data-node-label-id]').first();
  await expect(label).toBeVisible();
  expect((await label.boundingBox()).height).toBeGreaterThanOrEqual(12);
});

test('reload fits mounted overlays and keeps notices outside the drawing', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto('/');
  await importProject(page, project());
  await expect.poll(() => overlaps(page)).toEqual([]);
  const firstZoom = Number(await canvas(page).getAttribute('data-view-zoom'));
  await expect(page.getByTestId('local-draft-status')).toContainText(
    'Saved locally'
  );
  await page.reload();
  await expect(canvas(page)).toHaveAttribute('data-view-ready', 'true');
  await expect.poll(() => overlaps(page)).toEqual([]);
  const restoredZoom = Number(
    await canvas(page).getAttribute('data-view-zoom')
  );
  expect(Math.abs(firstZoom - restoredZoom)).toBeLessThan(0.02);
  const [drawing, recovery] = await Promise.all([
    canvas(page).boundingBox(),
    page.getByTestId('presence-recovery-affordance').boundingBox(),
  ]);
  expect(recovery.y + recovery.height).toBeLessThanOrEqual(drawing.y);
  await page.getByRole('button', { name: 'Export...', exact: true }).click();
  await page.getByTestId('image-framing-select').selectOption('presentation');
  await expect(page.getByTestId('png-export-button')).toBeEnabled();
  const caption = page.locator(
    '#graph-studio-export-capture-svg [data-caption-overlay]'
  );
  await expect(caption).toContainText('One mirror');
});

test('a short display caption survives save and export while preserving full notes', async ({
  page,
}) => {
  await page.goto('/');
  const value = project();
  const notes =
    'A detailed explanation of the predecessor chain and why this step is safe. '.repeat(
      30
    );
  value.timeline.steps[0].description = notes;
  await importProject(page, value);
  await expect(page.getByTestId('caption-overflow-warning')).toBeVisible();
  await page
    .getByRole('checkbox', { name: 'Separate caption text', exact: true })
    .check();
  await page
    .getByRole('textbox', { name: 'Display caption', exact: true })
    .fill('Turn once at the mirror.');
  await expect(page.getByTestId('frame-caption-overlay')).toContainText(
    'Turn once at the mirror.'
  );
  await expect(page.getByTestId('caption-overflow-warning')).toBeHidden();
  await expect(
    page.getByRole('textbox', { name: 'Frame Description', exact: true })
  ).toHaveValue(notes);
  await expect(page.getByTestId('local-draft-status')).toContainText(
    'Saved locally'
  );
  await page.reload();
  await expect(
    page.getByRole('textbox', { name: 'Display caption', exact: true })
  ).toHaveValue('Turn once at the mirror.');
  await expect(
    page.getByRole('textbox', { name: 'Frame Description', exact: true })
  ).toHaveValue(notes);
  await page.getByRole('button', { name: 'Duplicate', exact: true }).click();
  await expect(
    page.getByRole('textbox', { name: 'Display caption', exact: true })
  ).toHaveValue('Turn once at the mirror.');
  await page.getByRole('button', { name: '+ Keyframe', exact: true }).click();
  await expect(
    page.getByRole('textbox', { name: 'Display caption', exact: true })
  ).toHaveValue('');
  await expect(
    page.getByRole('textbox', { name: 'Frame Description', exact: true })
  ).toHaveValue('');
  await page.getByTestId('timeline-frame-card').first().click();
  await page.getByRole('button', { name: 'Export...', exact: true }).click();
  const pending = page.waitForEvent('download');
  await page.getByTestId('project-export-button').click();
  const download = await pending;
  const stream = await download.createReadStream();
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  const exported = JSON.parse(Buffer.concat(chunks).toString());
  expect(exported.timeline.steps[0].captionText).toBe(
    'Turn once at the mirror.'
  );
  expect(exported.timeline.steps[0].description).toBe(notes);
});

test('Escape cancels numeric edits throughout the editor', async ({ page }) => {
  await page.goto('/');
  for (const name of [
    'Node size value',
    'Force strength value',
    'Zoom percent',
    'Duration (ms)',
    'Caption Font Size',
  ]) {
    const input = page.getByRole('textbox', { name, exact: true });
    const before = await input.inputValue();
    await input.fill(name === 'Force strength value' ? '1.8' : '40');
    await input.press('Escape');
    await expect(input).toHaveValue(before);
  }
});

test('negative and extended coordinates remain stable when dragging and zooming', async ({
  page,
}) => {
  await page.goto('/');
  const value = project();
  value.graph = {
    nodes: [{ id: 'outside', label: 'Outside', x: -200, y: 1600 }],
    edges: [],
  };
  value.settings.customLegend.enabled = false;
  value.settings.captionOverlay.enabled = false;
  value.settings.snapEnabled = false;
  await importProject(page, value);
  const node = canvas(page).locator('[data-node-id="outside"]');
  const before = await node.boundingBox();
  const x = before.x + before.width / 2;
  const y = before.y + before.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 20, y + 10, { steps: 5 });
  await page.mouse.up();
  await expect
    .poll(async () => (await node.boundingBox()).x - before.x)
    .toBeGreaterThan(15);
  await expect
    .poll(async () => (await node.boundingBox()).x - before.x)
    .toBeLessThan(25);
  const beforeZoom = await node.boundingBox();
  await page.mouse.move(
    beforeZoom.x + beforeZoom.width / 2,
    beforeZoom.y + beforeZoom.height / 2
  );
  await page.mouse.wheel(0, -90);
  await expect
    .poll(async () => {
      const b = await node.boundingBox();
      return Math.abs(b.x + b.width / 2 - beforeZoom.x - beforeZoom.width / 2);
    })
    .toBeLessThan(3);
});
