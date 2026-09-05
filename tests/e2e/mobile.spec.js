import { expect, test } from '@playwright/test';

const graphCanvas = page =>
  page
    .getByTestId('graph-canvas-svg')
    .or(page.locator('svg#graph-studio-canvas-svg'));
const propertyPanel = page => page.getByTestId('property-panel');

test.describe('Graph Studio mobile smoke', () => {
  test('keeps the canvas and timeline usable around mobile overlays', async ({
    page,
  }) => {
    await page.goto('/');

    await expect(page.getByText('Graph Studio').first()).toBeVisible();
    await expect(graphCanvas(page)).toBeVisible();
    await expect(page.getByText('Timeline')).toBeVisible();

    await page
      .getByTestId('mobile-tools-toggle')
      .or(page.getByRole('button', { name: 'Open tools panel' }))
      .click();
    await expect(page.getByText('Build', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add Node' })).toBeVisible();
    await expect(page.getByText('Force strength')).toBeVisible();
    await page.getByRole('button', { name: 'Dismiss tools overlay' }).click();
    await expect(page.getByRole('button', { name: 'Add Node' })).toBeHidden();

    await page
      .getByTestId('mobile-properties-toggle')
      .or(page.getByRole('button', { name: 'Open inspector panel' }))
      .click();
    await expect(
      propertyPanel(page).getByText('INSPECTOR', { exact: true })
    ).toBeVisible();
    await expect(
      propertyPanel(page).getByText('Canvas settings')
    ).toBeVisible();
    await expect(page.getByText('Gravity (force)')).toHaveCount(0);
    await page
      .getByRole('button', { name: 'Dismiss inspector overlay' })
      .click();
    await expect(propertyPanel(page)).toHaveCount(0);

    await expect(graphCanvas(page)).toBeVisible();
    await expect(page.getByText('Timeline')).toBeVisible();
    await page.getByRole('button', { name: '+ Keyframe' }).click();
    await expect(page.getByText('Frame 2', { exact: true })).toBeVisible();
  });
});

test('canvas focus refits a teaching preset at a readable size', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Open tools panel' }).click();
  await page.getByLabel('Load graph preset').selectOption('bfs');
  await page.getByRole('button', { name: 'Dismiss tools overlay' }).click();
  await page.getByRole('button', { name: 'Focus canvas', exact: true }).click();
  await expect
    .poll(async () => {
      const box = await graphCanvas(page)
        .locator('[data-node-id] circle')
        .first()
        .boundingBox();
      return box?.width ?? 0;
    })
    .toBeGreaterThan(25);
  await expect(page.getByTestId('frame-caption-overlay')).toBeVisible();
  await expect(page.getByTestId('custom-export-legend')).toBeVisible();
});
