import { expect, test } from '@playwright/test';
import { Buffer } from 'node:buffer';

const fixture = {
  format: 'graph-viz-project',
  version: 1,
  graph: {
    nodes: [
      { id: 'A', label: 'A', x: 160, y: 160, shape: 'circle' },
      { id: 'B', label: 'B', x: 400, y: 160, shape: 'square' },
      { id: 'C', label: 'C', x: 640, y: 160, shape: 'rectangle' },
      { id: 'D', label: 'D', x: 260, y: 400, shape: 'diamond' },
      {
        id: 'E',
        label: 'Note',
        x: 600,
        y: 400,
        shape: 'text',
        annotationPlacement: 'below',
      },
    ],
    edges: [
      { id: 'arrow', from: 'A', to: 'B', directed: true, label: 'a' },
      { id: 'link', from: 'B', to: 'C', label: 'b' },
      { id: 'diagonal', from: 'B', to: 'D', directed: true },
      { id: 'loop', from: 'D', to: 'D', directed: true, label: 'loop' },
    ],
  },
  timeline: {
    currentFrame: 0,
    steps: [
      {
        id: 'f1',
        description: 'Select and inspect graph objects.',
        nodeOverrides: {},
        edgeOverrides: {},
      },
      {
        id: 'f2',
        description: 'Keyboard focus remains visible on the current frame.',
        nodeOverrides: { E: { annotation: 'd=2' } },
        edgeOverrides: {},
      },
    ],
  },
  settings: {
    snapEnabled: false,
    showGrid: false,
    lockCanvas: false,
    globalSettings: {
      nodeSize: 28,
      nodeLabelFontSize: 18,
      edgeWidth: 3,
      edgeLabelFontSize: 14,
    },
    captionOverlay: { enabled: false },
  },
};

test.use({ viewport: { width: 1600, height: 1000 } });

const canvas = page => page.getByTestId('graph-canvas-svg');
const node = (page, id) => canvas(page).locator(`[data-node-id="${id}"]`);
const edge = (page, id) => canvas(page).locator(`[data-edge-id="${id}"]`);
const indicator = object =>
  object.locator(':scope > [data-interaction-indicator]');

const importFixture = async page => {
  await page.goto('/');
  await page.getByTestId('open-import-menu').click();
  await page.getByTestId('project-import-input').setInputFiles({
    name: 'selection-feedback.graphviz.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(fixture)),
  });
  await expect(
    page.getByText('Project imported', { exact: true })
  ).toBeVisible();
  await expect(canvas(page)).toHaveAttribute('data-view-ready', 'true');
};

const feedback = object =>
  object.evaluate(element => {
    const decoration = element.querySelector(
      ':scope > [data-interaction-indicator]'
    );
    const style = decoration ? getComputedStyle(decoration) : null;
    return {
      focused: document.activeElement === element,
      focusVisible: element.matches(':focus-visible'),
      outline: getComputedStyle(element).outlineStyle,
      shown: Boolean(
        style &&
        style.visibility !== 'hidden' &&
        style.display !== 'none' &&
        Number(style.opacity) > 0
      ),
      dash: style?.strokeDasharray,
    };
  });

// Sample consecutive animation frames, so a transient press/release scale or
// animated selection stroke cannot hide behind a final-state-only assertion.
const bodySamples = (object, kind, count = 4) =>
  object.evaluate(
    async (element, options) => {
      const round = value => Math.round(value * 1000) / 1000;
      const box = element => {
        if (!element) return null;
        const local = element.getBBox();
        const screen = element.getBoundingClientRect();
        return {
          local: ['x', 'y', 'width', 'height'].map(key => round(local[key])),
          screen: ['x', 'y', 'width', 'height'].map(key => round(screen[key])),
        };
      };
      const attributes = (element, names) =>
        element
          ? Object.fromEntries(
              names.map(name => [name, element.getAttribute(name)])
            )
          : null;
      const read = () => {
        if (options.kind === 'node') {
          const body = element.querySelector('[data-node-outline-id]');
          const label = element.querySelector('[data-node-label-id]');
          return {
            shape: attributes(body, [
              'cx',
              'cy',
              'r',
              'x',
              'y',
              'width',
              'height',
              'd',
              'transform',
            ]),
            box: box(body),
            labelBox: box(label),
            strokeWidth: getComputedStyle(body).strokeWidth,
            transform: getComputedStyle(body).transform,
          };
        }
        const body = element.querySelector('[data-edge-path-id]');
        const arrow = element.querySelector('[data-edge-arrowhead-id]');
        return {
          path: attributes(body, ['d', 'stroke-width', 'transform']),
          box: box(body),
          strokeWidth: getComputedStyle(body).strokeWidth,
          transform: getComputedStyle(body).transform,
          arrow: attributes(arrow, [
            'points',
            'data-edge-arrow-tip-x',
            'data-edge-arrow-tip-y',
            'data-edge-arrow-base-x',
            'data-edge-arrow-base-y',
            'data-edge-arrow-length',
            'data-edge-arrow-base-width',
          ]),
          arrowBox: box(arrow),
        };
      };
      const samples = [read()];
      for (let i = 1; i < options.count; i++) {
        await new Promise(resolve => requestAnimationFrame(resolve));
        samples.push(read());
      }
      return samples;
    },
    { kind, count }
  );

const expectBodyStable = async (object, kind, original) => {
  const samples = await bodySamples(object, kind);
  for (const sample of samples) expect(sample).toEqual(original);
};

const pointOnEdge = object =>
  object.locator('[data-edge-hit-target-id]').evaluate(path => {
    const point = path.getPointAtLength(path.getTotalLength() * 0.45);
    const screen = new DOMPoint(point.x, point.y).matrixTransform(
      path.getScreenCTM()
    );
    return { x: screen.x, y: screen.y };
  });

const camera = page =>
  canvas(page).evaluate(element =>
    ['data-view-x', 'data-view-y', 'data-view-zoom'].map(name =>
      Number(element.getAttribute(name))
    )
  );

test('every node shape keeps its body fixed through mouse down, release, and repeated clicks', async ({
  page,
}) => {
  await importFixture(page);
  const tags = {
    circle: 'circle',
    square: 'rect',
    rectangle: 'rect',
    diamond: 'path',
    text: 'rect',
  };
  for (const authored of fixture.graph.nodes) {
    const object = node(page, authored.id);
    const original = (await bodySamples(object, 'node', 1))[0];
    await expect(indicator(object)).toHaveCount(1);
    await expect(indicator(object)).toHaveAttribute(
      'data-editor-decoration',
      'true'
    );
    await expect(indicator(object)).toHaveJSProperty(
      'tagName',
      tags[authored.shape]
    );
    const bounds = await object.locator('[data-node-outline-id]').boundingBox();
    await page.mouse.move(
      bounds.x + bounds.width / 2,
      bounds.y + bounds.height / 2
    );
    for (let click = 0; click < 2; click++) {
      await page.mouse.down();
      await expectBodyStable(object, 'node', original);
      await page.mouse.up();
      await expectBodyStable(object, 'node', original);
      await expect(object).toHaveAttribute('aria-pressed', 'true');
      await expect(indicator(object)).toHaveCount(1);
      await expect(indicator(object)).toHaveAttribute(
        'data-interaction-active',
        'true'
      );
      expect(await feedback(object)).toMatchObject({
        outline: 'none',
        focusVisible: false,
        shown: true,
      });
    }
  }
});

test('selecting directed, undirected, diagonal, and loop edges preserves body and arrow geometry', async ({
  page,
}) => {
  await importFixture(page);
  for (const authored of fixture.graph.edges) {
    const object = edge(page, authored.id);
    const original = (await bodySamples(object, 'edge', 1))[0];
    await expect(indicator(object)).toHaveCount(1);
    expect(await feedback(object)).toMatchObject({ shown: false });
    const point = await pointOnEdge(object);
    await page.mouse.move(point.x, point.y);
    for (let click = 0; click < 2; click++) {
      await page.mouse.down();
      await expectBodyStable(object, 'edge', original);
      await page.mouse.up();
      await expectBodyStable(object, 'edge', original);
      await expect(object).toHaveAttribute('aria-pressed', 'true');
      await expect(indicator(object)).toHaveCount(1);
      await expect(indicator(object)).toHaveAttribute(
        'data-interaction-active',
        'true'
      );
      expect(await feedback(object)).toMatchObject({
        outline: 'none',
        focusVisible: false,
        shown: true,
      });
    }
  }
});

test('keyboard navigation shows one dashed shape indicator without selecting until activation', async ({
  page,
}) => {
  await importFixture(page);
  await canvas(page).click({ position: { x: 10, y: 10 } });
  await page.keyboard.press('Tab');
  await expect(node(page, 'A')).toBeFocused();
  await expect(canvas(page).locator('[aria-pressed="true"]')).toHaveCount(0);
  expect(await feedback(node(page, 'A'))).toMatchObject({
    focusVisible: true,
    shown: true,
    outline: 'none',
  });
  expect((await feedback(node(page, 'A'))).dash).not.toBe('none');
  await page.keyboard.press('ArrowRight');
  await expect(node(page, 'B')).toBeFocused();
  await expect(canvas(page).locator('[aria-pressed="true"]')).toHaveCount(0);
  expect(await feedback(node(page, 'A'))).toMatchObject({ shown: false });
  expect(await feedback(node(page, 'B'))).toMatchObject({
    focusVisible: true,
    shown: true,
    outline: 'none',
  });
  await page.keyboard.press('Home');
  const firstEdge = edge(page, 'arrow');
  await expect(firstEdge).toBeFocused();
  await expect(firstEdge).toHaveAttribute('aria-pressed', 'false');
  expect(await feedback(firstEdge)).toMatchObject({
    focusVisible: true,
    shown: true,
    outline: 'none',
  });
  expect((await feedback(firstEdge)).dash).not.toBe('none');
  const focusIndicator = await indicator(firstEdge).elementHandle();
  const edgeBody = (await bodySamples(firstEdge, 'edge', 1))[0];
  await page.keyboard.press('Enter');
  await expect(firstEdge).toHaveAttribute('aria-pressed', 'true');
  await expect(indicator(firstEdge)).toHaveAttribute(
    'data-interaction-active',
    'true'
  );
  expect(
    await indicator(firstEdge).evaluate(
      (element, original) => element === original,
      focusIndicator
    )
  ).toBe(true);
  await expectBodyStable(firstEdge, 'edge', edgeBody);
  await page.keyboard.press('End');
  await expect(node(page, 'E')).toBeFocused();
  await expect(node(page, 'E')).toHaveAttribute('aria-pressed', 'false');
  await expect(firstEdge).toHaveAttribute('aria-pressed', 'true');
  expect(await feedback(node(page, 'E'))).toMatchObject({
    focusVisible: true,
    shown: true,
  });
  await page.keyboard.press('Space');
  await expect(node(page, 'E')).toHaveAttribute('aria-pressed', 'true');
  await expect(firstEdge).toHaveAttribute('aria-pressed', 'false');
  await expect(indicator(node(page, 'E'))).toHaveCount(1);
});

test('Fit View ignores selection and draw indicators at graph extremes', async ({
  page,
}) => {
  await importFixture(page);
  const fit = page.getByRole('button', { name: 'Fit View', exact: true });
  await fit.click();
  const original = await camera(page);
  for (const id of ['A', 'C']) {
    await node(page, id).locator('[data-node-outline-id]').click();
    await fit.click();
    expect(await camera(page)).toEqual(original);
  }
  const source = node(page, 'D');
  const body = (await bodySamples(source, 'node', 1))[0];
  await source.locator('[data-node-outline-id]').click();
  await page.getByRole('button', { name: 'Draw Edge', exact: true }).click();
  await expect(source).toHaveAttribute('aria-label', /Edge source/);
  await expect(indicator(source)).toHaveCount(1);
  await expect(indicator(source)).toHaveJSProperty('tagName', 'path');
  await expect(indicator(source)).toHaveAttribute(
    'data-interaction-active',
    'true'
  );
  await expectBodyStable(source, 'node', body);
  await expect(canvas(page).locator('[data-edge-id]')).toHaveCount(4);
  await fit.click();
  expect(await camera(page)).toEqual(original);
});

test('native SVG export contains authored graph objects and no editor feedback', async ({
  page,
}) => {
  await importFixture(page);
  await node(page, 'C').locator('[data-node-outline-id]').click();
  await expect(
    canvas(page).locator('[data-interaction-active="true"]')
  ).toHaveCount(1);
  await page.getByTestId('open-export-menu').click();
  const pending = page.waitForEvent('download');
  await page.getByTestId('svg-export-button').click();
  const stream = await (await pending).createReadStream();
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  const exported = Buffer.concat(chunks).toString();
  const result = await page.evaluate(svg => {
    const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
    return {
      nodes: doc.querySelectorAll('[data-node-outline-id]').length,
      edges: doc.querySelectorAll('[data-edge-path-id]').length,
      decorations: doc.querySelectorAll(
        '[data-editor-decoration], [data-interaction-indicator]'
      ).length,
    };
  }, exported);
  expect(result).toEqual({ nodes: 5, edges: 4, decorations: 0 });
});

test('Fit View and the selected timeline frame distinguish pointer and keyboard focus', async ({
  page,
}) => {
  await importFixture(page);
  const controlState = control =>
    control.evaluate(element => {
      const style = getComputedStyle(element);
      return {
        focusVisible: element.matches(':focus-visible'),
        outlineVisible:
          style.outlineStyle !== 'none' &&
          Number.parseFloat(style.outlineWidth) > 0 &&
          style.outlineColor.replaceAll(' ', '') !== 'rgba(0,0,0,0)',
        shadow: style.boxShadow,
        width: element.getBoundingClientRect().width,
        height: element.getBoundingClientRect().height,
      };
    });
  const fit = page.getByRole('button', { name: 'Fit View', exact: true });
  await fit.click();
  const pointerFit = await controlState(fit);
  expect(pointerFit.focusVisible).toBe(false);
  expect(pointerFit.outlineVisible).toBe(false);
  await page.keyboard.press('Tab');
  await page.keyboard.press('Shift+Tab');
  await expect(fit).toBeFocused();
  const keyboardFit = await controlState(fit);
  expect(keyboardFit.focusVisible).toBe(true);
  expect(keyboardFit.shadow).not.toBe(pointerFit.shadow);
  expect([keyboardFit.width, keyboardFit.height]).toEqual([
    pointerFit.width,
    pointerFit.height,
  ]);
  const frames = page.getByTestId('timeline-frame-card');
  await frames.first().click();
  const pointerFrame = await controlState(frames.first());
  expect(pointerFrame.focusVisible).toBe(false);
  await expect(frames.first()).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('ArrowRight');
  await expect(frames.nth(1)).toBeFocused();
  await expect(frames.nth(1)).toHaveAttribute('aria-selected', 'true');
  const keyboardFrame = await controlState(frames.nth(1));
  expect(keyboardFrame.focusVisible).toBe(true);
  expect(keyboardFrame.shadow).not.toBe(pointerFrame.shadow);
  await expect(
    frames.nth(1).getByTestId('timeline-frame-selected-accent')
  ).toHaveCount(1);
});
