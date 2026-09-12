import { expect, test } from '@playwright/test';
import { Buffer } from 'node:buffer';

const fixture = {
  format: 'graph-viz-project',
  version: 1,
  graph: {
    nodes: [
      {
        id: 'A',
        label: 'Start',
        x: 180,
        y: 200,
        shape: 'circle',
        annotationPlacement: 'below',
      },
      { id: 'B', label: 'B', x: 400, y: 320, shape: 'rectangle' },
      { id: 'C', label: 'C', x: 650, y: 420, shape: 'diamond' },
    ],
    edges: [
      { id: 'e1', from: 'A', to: 'B', directed: true, label: 'a' },
      { id: 'e2', from: 'B', to: 'C', label: 'b' },
    ],
  },
  timeline: {
    currentFrame: 0,
    steps: [
      {
        id: 'f1',
        description: 'First frame',
        nodeOverrides: {},
        edgeOverrides: {},
      },
      {
        id: 'f2',
        description: 'Second frame',
        nodeOverrides: { A: { annotation: 'd=2' } },
        edgeOverrides: {},
      },
    ],
  },
  settings: {
    snapEnabled: false,
    showGrid: false,
    lockCanvas: false,
    captionOverlay: { enabled: false },
  },
};

const canvas = page => page.getByTestId('graph-canvas-svg');
const node = (page, id) => canvas(page).locator(`[data-node-id="${id}"]`);
const importProject = async (page, project = fixture) => {
  await page.goto('/');
  await page.getByTestId('open-import-menu').click();
  await page.getByTestId('project-import-input').setInputFiles({
    name: 'node-authoring.graphviz.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(project)),
  });
  await expect(
    page.getByText('Project imported', { exact: true })
  ).toBeVisible();
};
const readDownload = async download => {
  const stream = await download.createReadStream();
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks).toString();
};
const shapeBox = async (page, id) =>
  node(page, id)
    .locator('[data-node-outline-id]')
    .evaluate(el => ({
      x: el.getBBox().x,
      y: el.getBBox().y,
      width: el.getBBox().width,
      height: el.getBBox().height,
    }));

test.use({ viewport: { width: 1600, height: 1000 } });

test('coordinates commit precisely across frames and Escape cancels drafts', async ({
  page,
}) => {
  await importProject(page);
  await node(page, 'A').click();
  const x = page.getByTestId('node-x-input');
  await x.fill('275.5');
  await x.press('Enter');
  await expect(x).toHaveValue('275.5');
  await expect(node(page, 'A').locator('circle').first()).toHaveAttribute(
    'cx',
    '275.5'
  );
  await x.fill('900');
  await x.press('Escape');
  await expect(x).toHaveValue('275.5');
  await page.getByTestId('timeline-frame-card').nth(1).click();
  await expect(node(page, 'A').locator('circle').first()).toHaveAttribute(
    'cx',
    '275.5'
  );
  await page.getByTestId('inspector-clear-selection').click();
  const size = page.getByLabel('Node size value', { exact: true });
  const before = await size.inputValue();
  await size.fill('44');
  await size.press('Escape');
  await expect(size).toHaveValue(before);
});

test('identity and frame annotation remain separate through shapes and project export', async ({
  page,
}) => {
  await importProject(page);
  await node(page, 'A').click();
  await page.getByLabel('Frame annotation', { exact: true }).fill('d=7');
  await expect(node(page, 'A').locator('[data-node-label-id]')).toHaveText(
    'Start'
  );
  await expect(node(page, 'A').locator('[data-node-annotation-id]')).toHaveText(
    'd=7'
  );
  await expect(node(page, 'A')).toHaveAttribute(
    'aria-label',
    /Node Start \(A\)\. Annotation: d=7/
  );
  await page.getByLabel('Node shape', { exact: true }).selectOption('square');
  await expect(
    node(page, 'A').locator('[data-node-outline-id]')
  ).toHaveJSProperty('tagName', 'rect');
  await page.getByTestId('timeline-frame-card').nth(1).click();
  await expect(node(page, 'A').locator('[data-node-label-id]')).toHaveText(
    'Start'
  );
  await expect(node(page, 'A').locator('[data-node-annotation-id]')).toHaveText(
    'd=2'
  );
  await page.getByTestId('open-export-menu').click();
  const pending = page.waitForEvent('download');
  await page.getByTestId('project-export-button').click();
  const download = await pending;
  const project = JSON.parse(await readDownload(download));
  expect(project.graph.nodes[0]).toMatchObject({
    label: 'Start',
    shape: 'square',
    annotationPlacement: 'below',
  });
  expect(project.timeline.steps.map(f => f.nodeOverrides.A.annotation)).toEqual(
    ['d=7', 'd=2']
  );
});

test('multi-node alignment and distribution affect shared positions in one action', async ({
  page,
}) => {
  await importProject(page);
  await node(page, 'A').click();
  await node(page, 'B').click({ modifiers: ['Shift'] });
  await expect(
    page.getByRole('button', {
      name: 'Distribute horizontal centers',
      exact: true,
    })
  ).toBeDisabled();
  await node(page, 'C').click({ modifiers: ['Shift'] });
  await page
    .getByRole('button', { name: 'Align left edges', exact: true })
    .click();
  const boxes = await Promise.all(
    ['A', 'B', 'C'].map(id => shapeBox(page, id))
  );
  expect(
    Math.max(...boxes.map(b => b.x)) - Math.min(...boxes.map(b => b.x))
  ).toBeLessThan(0.01);
  await page
    .getByRole('button', { name: 'Distribute vertical centers', exact: true })
    .click();
  const aligned = await Promise.all(
    ['A', 'B', 'C'].map(id => shapeBox(page, id))
  );
  const centers = aligned.map(b => b.y + b.height / 2).sort((a, b) => a - b);
  expect(centers[1] - centers[0]).toBeCloseTo(centers[2] - centers[1], 5);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect
    .poll(async () =>
      Promise.all(['A', 'B', 'C'].map(id => shapeBox(page, id)))
    )
    .toEqual(boxes);
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  await expect
    .poll(async () =>
      Promise.all(['A', 'B', 'C'].map(id => shapeBox(page, id)))
    )
    .toEqual(aligned);
  await page.getByTestId('timeline-frame-card').nth(1).click();
  const next = await Promise.all(['A', 'B', 'C'].map(id => shapeBox(page, id)));
  expect(next).toEqual(aligned);
});

test('all node shapes and separated annotations survive native SVG export', async ({
  page,
}, testInfo) => {
  const project = structuredClone(fixture);
  project.graph.nodes = [
    { id: 'A', label: 'A', x: 180, y: 200, shape: 'circle' },
    { id: 'B', label: 'B', x: 440, y: 200, shape: 'rectangle' },
    { id: 'C', label: 'C', x: 700, y: 200, shape: 'diamond' },
    { id: 'D', label: 'D', x: 300, y: 410, shape: 'square' },
    {
      id: 'E',
      label: 'x = 6',
      x: 610,
      y: 410,
      shape: 'text',
      annotationPlacement: 'below',
      color: '#FFFFFF',
    },
  ];
  project.graph.edges = [
    { id: 'e1', from: 'A', to: 'B', label: 'a', directed: true },
    { id: 'e2', from: 'B', to: 'C', label: 'b', directed: true },
    { id: 'e3', from: 'D', to: 'E', label: 'coordinate' },
  ];
  project.timeline.steps = [
    {
      id: 'f1',
      description: 'Shapes for teaching graphs',
      nodeOverrides: { E: { annotation: 'Mirror line' } },
      edgeOverrides: {},
    },
  ];
  await importProject(page, project);
  await page.getByRole('button', { name: 'Fit View', exact: true }).click();
  await canvas(page).screenshot({
    path: testInfo.outputPath('node-shapes-canvas.png'),
  });
  await node(page, 'E').locator('[data-node-outline-id]').click();
  await page.screenshot({
    path: testInfo.outputPath('node-shapes-inspector.png'),
  });
  await page.getByTestId('open-export-menu').click();
  const pending = page.waitForEvent('download');
  await page.getByTestId('svg-export-button').click();
  const exported = await readDownload(await pending);
  const rendered = await page.evaluate(svg => {
    const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
    return [...doc.querySelectorAll('[data-node-id]')].map(group => ({
      shape: group.getAttribute('data-node-shape'),
      label: group.querySelector('[data-node-label-id]')?.textContent,
      annotation:
        group.querySelector('[data-node-annotation-id]')?.textContent ?? '',
      outline: group.querySelector('[data-node-outline-id]')?.tagName,
      transform: group
        .querySelector('[data-node-outline-id]')
        ?.getAttribute('transform'),
    }));
  }, exported);
  expect(rendered.map(n => n.shape)).toEqual([
    'circle',
    'rectangle',
    'diamond',
    'square',
    'text',
  ]);
  expect(rendered.map(n => n.outline)).toEqual([
    'circle',
    'rect',
    'path',
    'rect',
    'rect',
  ]);
  expect(rendered[4]).toMatchObject({
    label: 'x = 6',
    annotation: 'Mirror line',
  });
  expect(rendered.every(n => !n.transform || n.transform === 'none')).toBe(
    true
  );
  expect(exported).not.toContain('data-node-selection-ring-id');
});

test('legacy annotations remain unchanged until explicitly separated and text stays selectable', async ({
  page,
}) => {
  const legacy = structuredClone(fixture);
  delete legacy.graph.nodes[0].annotationPlacement;
  legacy.graph.nodes[0].color = '#FFFFFF';
  legacy.timeline.currentFrame = 1;
  await importProject(page, legacy);
  await expect(node(page, 'A').locator('[data-node-label-id]')).toHaveText(
    'd=2'
  );
  await node(page, 'A').click();
  await page
    .getByLabel('Node annotation placement', { exact: true })
    .selectOption('below');
  await page.getByLabel('Node shape', { exact: true }).selectOption('text');
  await expect(
    node(page, 'A').locator('[data-node-outline-id]')
  ).toHaveAttribute('fill', 'transparent');
  await expect(
    node(page, 'A').locator('[data-node-outline-id]')
  ).toHaveAttribute('stroke', 'none');
  await expect(node(page, 'A').locator('[data-node-label-id]')).toHaveText(
    'Start'
  );
  await expect(node(page, 'A').locator('[data-node-label-id]')).toHaveAttribute(
    'fill',
    '#0F172A'
  );
  await page.getByTestId('inspector-clear-selection').click();
  await node(page, 'A').click();
  await expect(page.getByTestId('property-panel')).toHaveAttribute(
    'data-inspector-type',
    'node'
  );
});
