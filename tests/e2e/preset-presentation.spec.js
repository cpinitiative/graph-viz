/* global process */
import { expect, test } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { GRAPH_PRESETS } from '../../src/components/visualizers/Graphs/graphStudio/data/graphPresets.js';

const PRESETS = [
  'bfs',
  'dfs',
  'dijkstra',
  'kruskal-mst',
  'dijkstra-shortest-paths',
  'topological-sort',
  'disjoint-set-union',
  'connected-components',
  'multigraph',
];

const canvas = page => page.getByTestId('graph-canvas-svg');

// The SVG DOM's boxes omit painted strokes. Expand each painted element so a
// one-pixel contact between a node outline and a footer is a real test failure.
// Routing paths and their labels are part of the graph's visual center too.
const measurePresentation = svg => {
  const rect = element => {
    const box = element.getBoundingClientRect();
    return {
      left: box.left,
      top: box.top,
      right: box.right,
      bottom: box.bottom,
      width: box.width,
      height: box.height,
    };
  };
  const merge = boxes => {
    if (!boxes.length) return null;
    const left = Math.min(...boxes.map(box => box.left));
    const top = Math.min(...boxes.map(box => box.top));
    const right = Math.max(...boxes.map(box => box.right));
    const bottom = Math.max(...boxes.map(box => box.bottom));
    return {
      left,
      top,
      right,
      bottom,
      width: right - left,
      height: bottom - top,
    };
  };
  const paintedRect = element => {
    if (element.tagName.toLowerCase() === 'g') {
      return merge(
        [...element.querySelectorAll('rect, circle, path, line, polygon, text')]
          .map(paintedRect)
          .filter(Boolean)
      );
    }
    const box = rect(element);
    const style = getComputedStyle(element);
    const matrix = element.getScreenCTM();
    const stroke =
      style.stroke === 'none' || Number(style.strokeOpacity) === 0
        ? 0
        : parseFloat(style.strokeWidth) || 0;
    const paddingX = (stroke * Math.hypot(matrix?.a ?? 1, matrix?.c ?? 0)) / 2;
    const paddingY = (stroke * Math.hypot(matrix?.b ?? 0, matrix?.d ?? 1)) / 2;
    return {
      left: box.left - paddingX,
      top: box.top - paddingY,
      right: box.right + paddingX,
      bottom: box.bottom + paddingY,
      width: box.width + 2 * paddingX,
      height: box.height + 2 * paddingY,
    };
  };
  const intersects = (a, b) =>
    Math.min(a.right, b.right) - Math.max(a.left, b.left) > 0.1 &&
    Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 0.1;
  const viewport = rect(svg);
  const isOutside = box =>
    box.left < viewport.left - 0.5 ||
    box.top < viewport.top - 0.5 ||
    box.right > viewport.right + 0.5 ||
    box.bottom > viewport.bottom + 0.5;
  const identify = element =>
    [...element.attributes]
      .filter(
        attribute =>
          attribute.name.startsWith('data-') && attribute.name.endsWith('-id')
      )
      .map(attribute => `${attribute.name}=${attribute.value}`)
      .join(', ');
  const geometry = [
    ...svg.querySelectorAll(
      '[data-node-outline-id], [data-node-label-id], [data-node-annotation-id], [data-edge-path-id], [data-edge-arrowhead-id], [data-edge-label-id]'
    ),
  ].map(element => ({ id: identify(element), ...paintedRect(element) }));
  const overlays = [
    ...svg.querySelectorAll('[data-caption-overlay], [data-legend-position]'),
  ].map(element => ({
    kind: element.hasAttribute('data-caption-overlay') ? 'caption' : 'legend',
    truncated:
      element.getAttribute('data-caption-truncated') ??
      element.getAttribute('data-legend-truncated'),
    dock: element.getAttribute('data-overlay-dock'),
    ...paintedRect(element),
  }));
  const graphBounds = merge(geometry);
  const caption = overlays.find(overlay => overlay.kind === 'caption');
  const effectiveFontSize = element => {
    const matrix = element.getScreenCTM();
    return (
      parseFloat(getComputedStyle(element).fontSize) *
      Math.hypot(matrix?.a ?? 1, matrix?.b ?? 0)
    );
  };
  const identities = [...svg.querySelectorAll('[data-node-label-id]')].map(
    element => ({
      id: element.getAttribute('data-node-label-id'),
      label: element.textContent,
      fontSize: effectiveFontSize(element),
    })
  );
  const annotations = [
    ...svg.querySelectorAll('[data-node-annotation-id]'),
  ].map(element => ({
    id: element.getAttribute('data-node-annotation-id'),
    text: element.textContent,
    fontSize: effectiveFontSize(element),
  }));
  // Check glyph extents rather than a broad annotation-width estimate. A line
  // hidden by the text halo is still a collision in an authored teaching graph.
  const sampledEdges = [...svg.querySelectorAll('[data-edge-path-id]')].map(
    edge => {
      const matrix = edge.getScreenCTM();
      const scale = Math.hypot(matrix.a, matrix.b);
      const length = edge.getTotalLength();
      const count = Math.max(2, Math.ceil(length * scale));
      return {
        id: edge.getAttribute('data-edge-path-id'),
        halfStroke:
          (parseFloat(getComputedStyle(edge).strokeWidth) * scale) / 2,
        points: Array.from({ length: count + 1 }, (_, index) =>
          edge
            .getPointAtLength((length * index) / count)
            .matrixTransform(matrix)
        ),
      };
    }
  );
  const annotationEdgeContacts = [
    ...svg.querySelectorAll('[data-node-annotation-id]'),
  ].flatMap(annotation => {
    const matrix = annotation.getScreenCTM();
    const characters = [...annotation.textContent].flatMap(
      (character, index) => {
        if (!character.trim()) return [];
        const box = annotation.getExtentOfChar(index);
        const topLeft = new DOMPoint(box.x, box.y).matrixTransform(matrix);
        const bottomRight = new DOMPoint(
          box.x + box.width,
          box.y + box.height
        ).matrixTransform(matrix);
        return [
          {
            character,
            left: topLeft.x,
            top: topLeft.y,
            right: bottomRight.x,
            bottom: bottomRight.y,
          },
        ];
      }
    );
    return sampledEdges.flatMap(edge => {
      const hit = characters.filter(box =>
        edge.points.some(
          point =>
            point.x + edge.halfStroke > box.left &&
            point.x - edge.halfStroke < box.right &&
            point.y + edge.halfStroke > box.top &&
            point.y - edge.halfStroke < box.bottom
        )
      );
      return hit.length
        ? [
            {
              node: annotation.getAttribute('data-node-annotation-id'),
              text: annotation.textContent,
              edge: edge.id,
              characters: hit.map(box => box.character).join(''),
            },
          ]
        : [];
    });
  });
  const captionElement = svg.querySelector('[data-caption-overlay]');
  return {
    camera: svg
      .querySelector('[data-graph-view-transform]')
      ?.getAttribute('transform'),
    viewport,
    graphBounds,
    overlays,
    caption,
    identities,
    annotations,
    annotationEdgeContacts,
    captionContent: [
      ...captionElement.querySelectorAll('text:not([data-caption-progress])'),
    ].map(element => element.textContent.trim()),
    captionProgress:
      captionElement
        .querySelector('[data-caption-progress]')
        ?.textContent.trim() ?? null,
    clipped: [...geometry, ...overlays].filter(isOutside),
    graphOverlayCollisions: geometry.flatMap(element =>
      overlays
        .filter(overlay => intersects(element, overlay))
        .map(overlay => ({ object: element.id, overlay: overlay.kind }))
    ),
    overlayCollisions: overlays.flatMap((overlay, index) =>
      overlays
        .slice(index + 1)
        .filter(other => intersects(overlay, other))
        .map(other => [overlay.kind, other.kind])
    ),
    horizontalOffset: graphBounds
      ? (graphBounds.left +
          graphBounds.right -
          viewport.left -
          viewport.right) /
        2
      : null,
    captionHorizontalOffset: caption
      ? (caption.left + caption.right - viewport.left - viewport.right) / 2
      : null,
  };
};

const settleFrame = page =>
  page.evaluate(
    () =>
      new Promise(resolve =>
        requestAnimationFrame(() => requestAnimationFrame(resolve))
      )
  );

const choosePreset = async (page, name) => {
  await page.getByLabel('Load graph preset').selectOption(name);
  await expect(canvas(page).locator('[data-node-id]')).toHaveCount(
    GRAPH_PRESETS[name].graph.nodes.length
  );
  await expect(page.getByTestId('frame-caption-overlay')).toBeVisible();
  await settleFrame(page);
};

const expectClearPresentation = (state, label) => {
  expect(
    state.clipped,
    `${label}: painted graph and overlays fit inside the viewport`
  ).toEqual([]);
  expect(
    state.graphOverlayCollisions,
    `${label}: graph clears legend and caption`
  ).toEqual([]);
  expect(state.overlayCollisions, `${label}: overlays do not overlap`).toEqual(
    []
  );
  expect(
    state.annotationEdgeContacts,
    `${label}: annotation glyphs clear edge strokes`
  ).toEqual([]);
  expect(
    Math.abs(state.horizontalOffset),
    `${label}: center includes labels and routed edges`
  ).toBeLessThanOrEqual(3);
  expect(
    Math.abs(state.captionHorizontalOffset),
    `${label}: centered footer`
  ).toBeLessThanOrEqual(1);
  expect(
    state.overlays.map(overlay => overlay.truncated),
    `${label}: all overlay text is readable`
  ).toEqual(['false', 'false']);
};

const expectFrameIdentity = (state, preset, index) => {
  expect(state.identities.map(({ id, label }) => ({ id, label }))).toEqual(
    preset.graph.nodes.map(node => ({ id: String(node.id), label: node.label }))
  );
  expect(state.annotations.map(({ id, text }) => ({ id, text }))).toEqual(
    preset.graph.nodes.flatMap(node => {
      const annotation = preset.steps[index].nodeOverrides[node.id]?.annotation;
      return annotation ? [{ id: String(node.id), text: annotation }] : [];
    })
  );
  expect(state.captionContent).toEqual(
    preset.steps[index].captionText
      .split(' · ')
      .map(part => part.replace(/\s+/g, ' ').trim())
  );
  expect(state.captionProgress).toBe(
    `${String(index + 1).padStart(2, '0')} / ${String(preset.steps.length).padStart(2, '0')}`
  );
};

const artifactPath = async (testInfo, filename) => {
  const directory = process.env.PRESET_AUDIT_DIR || testInfo.outputDir;
  await fs.mkdir(directory, { recursive: true });
  return path.join(directory, filename);
};

for (const theme of ['light', 'dark']) {
  test.describe(`${theme} preset presentation`, () => {
    test.use({ viewport: { width: 1280, height: 720 }, colorScheme: theme });

    for (const name of PRESETS) {
      test(`${name}: every frame keeps its camera, identity, and clear centered composition`, async ({
        page,
      }, testInfo) => {
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        page.on('console', message => {
          if (message.type() === 'error') errors.push(message.text());
        });
        await page.goto('/');
        await choosePreset(page, name);
        const preset = GRAPH_PRESETS[name];
        const cards = page.getByTestId('timeline-frame-card');
        await expect(cards).toHaveCount(preset.steps.length);
        const snapshots = [];
        for (let index = 0; index < preset.steps.length; index += 1) {
          await cards.nth(index).click();
          await expect(cards.nth(index)).toHaveAttribute(
            'data-current',
            'true'
          );
          await settleFrame(page);
          const state = await canvas(page).evaluate(measurePresentation);
          snapshots.push({ frame: index + 1, ...state });
          expectClearPresentation(
            state,
            `${name} / ${theme} / frame ${index + 1}`
          );
          expectFrameIdentity(state, preset, index);
          if (index === 0) {
            expect
              .soft(
                Math.min(...state.identities.map(node => node.fontSize)),
                `${name}: laptop-sized identity labels`
              )
              .toBeGreaterThanOrEqual(10);
          }
          if (index) {
            expect(
              state.camera,
              `${name}: timeline navigation never moves the camera`
            ).toBe(snapshots[0].camera);
            for (const property of ['left', 'top', 'width', 'height']) {
              expect(
                state.caption[property],
                `${name}: footer ${property} is stable`
              ).toBeCloseTo(snapshots[0].caption[property], 1);
            }
          }
          if (index === 0 || index === preset.steps.length - 1) {
            await page.screenshot({
              path: await artifactPath(
                testInfo,
                `after-${name}-${theme}-${index === 0 ? 'first' : 'last'}-1280x720.png`
              ),
            });
          }
        }
        // Revisit frames out of order to catch stale per-frame annotations.
        for (const index of [
          0,
          Math.floor(preset.steps.length / 2),
          preset.steps.length - 1,
        ]) {
          await cards.nth(index).click();
          await settleFrame(page);
          const state = await canvas(page).evaluate(measurePresentation);
          expectFrameIdentity(state, preset, index);
          expect(state.camera).toBe(snapshots[0].camera);
        }
        expect(errors).toEqual([]);
        await fs.writeFile(
          await artifactPath(testInfo, `${name}-${theme}-frames.json`),
          `${JSON.stringify(snapshots, null, 2)}\n`
        );
      });
    }
  });
}

test('walkthrough caption controls keep short display text and full notes separate after export and reload', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto('/');
  await choosePreset(page, 'bfs');
  const display = page.getByRole('textbox', {
    name: 'Display caption',
    exact: true,
  });
  const notes = page.getByRole('textbox', {
    name: 'Frame Description',
    exact: true,
  });
  const visible = page.getByRole('checkbox', {
    name: 'Show caption',
    exact: true,
  });
  const caption = page.getByTestId('frame-caption-overlay');
  await expect(page.getByLabel('Caption Style')).toHaveValue('walkthrough');
  await expect(page.getByLabel('Caption Position')).toHaveValue(
    'bottom-center'
  );
  await expect(
    page.getByRole('checkbox', { name: 'Separate caption text', exact: true })
  ).toBeChecked();
  await expect(display).toHaveValue(GRAPH_PRESETS.bfs.steps[0].captionText);
  await expect(notes).toHaveValue(GRAPH_PRESETS.bfs.steps[0].description);
  const captionText = 'Visit A · Queue: B → C';
  const fullNotes =
    'Remove A from the front of the FIFO queue. Inspect its neighbors, mark B and C as discovered, and append them to the queue before processing the next distance layer.';
  await display.fill(captionText);
  await notes.fill(fullNotes);
  await visible.uncheck();
  await expect(caption).toBeHidden();
  await visible.check();
  await expect(caption).toBeVisible();
  await expect(display).toHaveValue(captionText);
  await expect(notes).toHaveValue(fullNotes);
  await page.getByLabel('Caption Position').selectOption('bottom-left');
  await expect(caption).toHaveAttribute('data-caption-position-x', '0');
  await page.getByLabel('Caption Position').selectOption('bottom-center');
  await expect(caption).toHaveAttribute('data-caption-position-x', '0.5');
  await page.getByTestId('open-export-menu').click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByTestId('project-export-button').click();
  const download = await downloadPromise;
  const projectPath = await artifactPath(
    testInfo,
    'caption-controls.graphviz.json'
  );
  await download.saveAs(projectPath);
  const project = JSON.parse(await fs.readFile(projectPath, 'utf8'));
  expect(project.timeline.steps[0]).toMatchObject({
    captionText,
    description: fullNotes,
  });
  expect(project.settings.captionOverlay).toMatchObject({
    enabled: true,
    style: 'walkthrough',
    position: { x: 0.5, y: 1 },
  });
  await page.reload();
  await expect(display).toHaveValue(captionText);
  await expect(notes).toHaveValue(fullNotes);
  await expect(page.getByLabel('Caption Position')).toHaveValue(
    'bottom-center'
  );
  await expect(page.getByLabel('Caption Style')).toHaveValue('walkthrough');
  await expect(visible).toBeChecked();
});

for (const theme of ['light', 'dark']) {
  test.describe(`${theme} native presentation export`, () => {
    test.use({ viewport: { width: 1600, height: 1000 }, colorScheme: theme });

    for (const name of PRESETS) {
      test(`${name}: native 16:9 SVG and PNG preserve the reviewed editor`, async ({
        page,
        context,
      }, testInfo) => {
        await page.goto('/');
        await choosePreset(page, name);
        await page.getByTestId('timeline-frame-card').last().click();
        await settleFrame(page);
        const before = await canvas(page).evaluate(measurePresentation);
        expectClearPresentation(before, `${name} / ${theme} / larger editor`);
        await page.screenshot({
          path: await artifactPath(
            testInfo,
            `after-${name}-${theme}-last-1600x1000.png`
          ),
        });
        await page.getByTestId('open-export-menu').click();
        const menu = page.getByTestId('export-menu-modal');
        await menu.getByLabel('Image Framing').selectOption('presentation');
        await expect(menu.getByTestId('png-export-button')).toBeEnabled();
        const preview = menu.getByTestId('export-preview-image');
        await expect(preview).toBeVisible();
        const previewText = await preview.evaluate(async image =>
          (await fetch(image.src)).text()
        );
        const svgDownload = page.waitForEvent('download');
        await menu.getByTestId('svg-export-button').click();
        const svgFile = await svgDownload;
        const svgPath = await artifactPath(
          testInfo,
          `${name}-${theme}-presentation.svg`
        );
        await svgFile.saveAs(svgPath);
        const svgText = await fs.readFile(svgPath, 'utf8');
        expect(svgText, 'native SVG matches the reviewed preview').toBe(
          previewText
        );
        const inspected = await context.newPage();
        try {
          await inspected.setContent(
            `<html><body style="margin:0">${svgText}</body></html>`
          );
          const exported = inspected.locator('svg').first();
          const viewBox = (await exported.getAttribute('viewBox'))
            .split(/\s+/)
            .map(Number);
          expect(viewBox[2] / viewBox[3]).toBeCloseTo(16 / 9, 4);
          const state = await exported.evaluate(measurePresentation);
          expectClearPresentation(
            state,
            `${name} / ${theme} / native 16:9 export`
          );
          expect(state.camera).toBe(before.camera);
          expect(state.identities.map(node => node.label)).toEqual(
            before.identities.map(node => node.label)
          );
          expect(state.annotations.map(node => node.text)).toEqual(
            before.annotations.map(node => node.text)
          );
          expect(state.captionContent).toEqual(before.captionContent);
          expect(state.captionProgress).toBe(before.captionProgress);
          expectFrameIdentity(
            state,
            GRAPH_PRESETS[name],
            GRAPH_PRESETS[name].steps.length - 1
          );
          const pngDownload = page.waitForEvent('download');
          await menu.getByTestId('png-export-button').click();
          const pngFile = await pngDownload;
          const pngPath = await artifactPath(
            testInfo,
            `${name}-${theme}-presentation-2x.png`
          );
          await pngFile.saveAs(pngPath);
          const png = await fs.readFile(pngPath);
          expect([...png.subarray(0, 8)]).toEqual([
            137, 80, 78, 71, 13, 10, 26, 10,
          ]);
          expect(png.readUInt32BE(16)).toBe(
            Number(await exported.getAttribute('width')) * 2
          );
          expect(png.readUInt32BE(20)).toBe(
            Number(await exported.getAttribute('height')) * 2
          );
          await fs.writeFile(
            await artifactPath(testInfo, `${name}-${theme}-export.json`),
            `${JSON.stringify({ editor: before, exported: state }, null, 2)}\n`
          );
        } finally {
          await inspected.close();
        }
      });
    }
  });
}
