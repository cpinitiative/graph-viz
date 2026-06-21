import { expect, test } from '@playwright/test';

const graphCanvas = page =>
  page
    .getByTestId('graph-canvas-svg')
    .or(page.locator('svg#graph-studio-canvas-svg'));

test.describe('Graph Viz mobile smoke', () => {
  test('keeps the canvas and timeline usable around mobile overlays', async ({
    page,
  }) => {
    await page.goto('/');

    await expect(page.getByText('Graph Studio')).toBeVisible();
    await expect(graphCanvas(page)).toBeVisible();
    await expect(page.getByText('Timeline')).toBeVisible();

    await page
      .getByTestId('mobile-tools-toggle')
      .or(page.getByRole('button', { name: 'Open tools panel' }))
      .click();
    await expect(page.getByText('Tools')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add Node' })).toBeVisible();
    await page.getByRole('button', { name: 'Dismiss tools overlay' }).click();
    await expect(page.getByRole('button', { name: 'Add Node' })).toBeHidden();

    await page
      .getByTestId('mobile-properties-toggle')
      .or(page.getByRole('button', { name: 'Open properties panel' }))
      .click();
    await expect(page.getByText('Global Settings')).toBeVisible();
    await expect(page.getByText('Gravity (force)')).toBeVisible();
    await page
      .getByRole('button', { name: 'Dismiss properties overlay' })
      .click();
    await expect(page.getByText('Global Settings')).toBeHidden();

    await expect(graphCanvas(page)).toBeVisible();
    await expect(page.getByText('Timeline')).toBeVisible();
    await page.getByRole('button', { name: '+ Keyframe' }).click();
    await expect(page.getByText('Frame 2')).toBeVisible();

    await page.getByTestId('open-frame-browser').click();
    const frameBrowser = page.getByTestId('frame-browser');
    await expect(frameBrowser).toBeVisible();
    await expect(page.getByTestId('frame-browser-card-0')).toBeVisible();
    await expect(page.getByTestId('frame-browser-card-1')).toBeVisible();

    const browserBounds = await frameBrowser.boundingBox();
    expect(browserBounds.x).toBeGreaterThanOrEqual(0);
    expect(browserBounds.width).toBeLessThanOrEqual(393);

    await page.getByTestId('frame-browser-card-1').click();
    await expect(page.getByTestId('frame-browser-card-1')).toHaveAttribute(
      'aria-current',
      'step'
    );
    await page.getByRole('button', { name: 'Close frame browser' }).click();
    await expect(frameBrowser).toBeHidden();
  });
});
