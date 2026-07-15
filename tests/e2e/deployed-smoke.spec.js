/* global process */
import { expect, test } from '@playwright/test';

const CORE_ASSET_SELECTOR = [
  'script[src]',
  'link[rel="stylesheet"][href]',
  'link[rel~="icon"][href]',
  'img[src]',
].join(',');
const CORE_RESOURCE_TYPES = new Set(['font', 'image', 'script', 'stylesheet']);
const COMMIT_SHA_PATTERN = /^[0-9a-f]{7,40}$/i;

test.describe('Graph Studio deployed smoke', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('serves a working shell, canvas, assets, and build marker', async ({
    page,
    request,
  }) => {
    const browserErrors = [];
    const failedRequests = [];
    const coreResponses = [];

    page.on('console', message => {
      if (message.type() === 'error') {
        browserErrors.push(`console.error: ${message.text()}`);
      }
    });
    page.on('pageerror', error => {
      browserErrors.push(`pageerror: ${error.message}`);
    });
    page.on('requestfailed', failedRequest => {
      failedRequests.push({
        url: failedRequest.url(),
        error: failedRequest.failure()?.errorText ?? 'unknown failure',
      });
    });
    page.on('response', response => {
      if (CORE_RESOURCE_TYPES.has(response.request().resourceType())) {
        coreResponses.push({
          url: response.url(),
          status: response.status(),
        });
      }
    });

    await page.addInitScript(() => {
      window.localStorage.setItem('theme', 'light');
    });

    const navigationResponse = await page.goto('/');
    expect(
      navigationResponse,
      'root navigation should return a response'
    ).not.toBeNull();
    expect(navigationResponse.status(), 'root document status').toBe(200);

    await expect(page).toHaveTitle(/Graph Studio/);
    const root = page.getByTestId('graph-studio-root');
    await expect(root).toBeVisible();
    await expect(page.getByText('Graph Studio', { exact: true })).toBeVisible();

    const rootBounds = await root.boundingBox();
    expect(
      rootBounds,
      'Graph Studio root should have layout bounds'
    ).not.toBeNull();
    expect(rootBounds.width).toBeGreaterThan(0);
    expect(rootBounds.height).toBeGreaterThan(0);

    expect
      .soft(await root.getAttribute('data-build-provenance'))
      .toBe('graph-studio');
    const provenance = await root.evaluate(element => ({
      commitSha: element.dataset.buildCommit,
      buildTimestamp: element.dataset.buildTimestamp,
      environment: element.dataset.buildEnvironment,
    }));
    expect
      .soft(provenance.commitSha ?? '')
      .toMatch(/^(?:unknown|[0-9a-f]{7,40})$/i);
    expect
      .soft(Number.isNaN(Date.parse(provenance.buildTimestamp ?? '')))
      .toBe(false);
    expect.soft(provenance.environment ?? '').toMatch(/\S/);

    const expectedCommit =
      process.env.EXPECTED_GRAPH_STUDIO_COMMIT_SHA?.trim().toLowerCase();
    if (expectedCommit) {
      expect(
        expectedCommit,
        'EXPECTED_GRAPH_STUDIO_COMMIT_SHA must be a 7-40 character hexadecimal SHA'
      ).toMatch(COMMIT_SHA_PATTERN);
      const deployedCommit = provenance.commitSha?.toLowerCase() ?? '';
      expect
        .soft(
          Boolean(deployedCommit) &&
            (deployedCommit.startsWith(expectedCommit) ||
              expectedCommit.startsWith(deployedCommit)),
          `deployed commit ${deployedCommit || '(missing)'} should match ${expectedCommit}`
        )
        .toBe(true);
    }

    const canvas = page.getByTestId('graph-canvas-svg');
    await expect(canvas).toBeVisible();
    const canvasBounds = await canvas.boundingBox();
    expect(
      canvasBounds,
      'graph canvas should have layout bounds'
    ).not.toBeNull();
    expect(canvasBounds.width).toBeGreaterThan(100);
    expect(canvasBounds.height).toBeGreaterThan(100);
    expect(
      await canvas.locator('g[data-export-content="true"] circle').count()
    ).toBeGreaterThan(0);
    expect(
      await canvas.locator('[data-edge-hit-target-id]').count()
    ).toBeGreaterThan(0);

    const themeToggle = page.getByRole('button', { name: 'Toggle theme' });
    await expect(page.locator('html')).not.toHaveClass(/dark/);
    await themeToggle.click();
    await expect(page.locator('html')).toHaveClass(/dark/);
    await expect(root).toBeVisible();
    await expect(canvas).toBeVisible();
    await themeToggle.click();
    await expect(page.locator('html')).not.toHaveClass(/dark/);

    const pageOrigin = new URL(page.url()).origin;
    const coreAssetUrls = await page.locator(CORE_ASSET_SELECTOR).evaluateAll(
      (elements, currentOrigin) =>
        Array.from(
          new Set(
            elements
              .map(element => element.src || element.href)
              .filter(Boolean)
              .filter(url => new URL(url).origin === currentOrigin)
          )
        ),
      pageOrigin
    );
    expect(coreAssetUrls.length).toBeGreaterThanOrEqual(2);
    for (const assetUrl of coreAssetUrls) {
      const assetResponse = await request.get(assetUrl, { maxRedirects: 0 });
      expect(assetResponse.status(), `core asset ${assetUrl}`).toBe(200);
    }

    const sameOriginCoreResponses = coreResponses.filter(
      response => new URL(response.url).origin === pageOrigin
    );
    expect(sameOriginCoreResponses.length).toBeGreaterThanOrEqual(2);
    expect(
      sameOriginCoreResponses.filter(response => response.status !== 200)
    ).toEqual([]);

    const sameOriginFailures = failedRequests.filter(
      failure => new URL(failure.url).origin === pageOrigin
    );
    expect(sameOriginFailures).toEqual([]);
    expect(browserErrors).toEqual([]);
  });
});
