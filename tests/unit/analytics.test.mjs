import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createProjectUsageTracker,
  shouldEnableWebAnalytics,
  stripAnalyticsUrlDetails,
  trackUsageEvent,
  USAGE_EVENTS,
} from '../../src/analytics.js';

test('enables analytics only on the public production hostname', () => {
  assert.equal(shouldEnableWebAnalytics('graph.usaco.guide'), true);
  assert.equal(shouldEnableWebAnalytics('graph-viz.usaco.guide'), false);
  assert.equal(shouldEnableWebAnalytics('preview-name.vercel.app'), false);
  assert.equal(shouldEnableWebAnalytics('localhost'), false);
  assert.equal(shouldEnableWebAnalytics('127.0.0.1'), false);
  assert.equal(
    shouldEnableWebAnalytics('graph.usaco.guide.example.com'),
    false
  );
});

test('removes query strings and fragments before analytics events are sent', () => {
  assert.deepEqual(
    stripAnalyticsUrlDetails({
      type: 'pageview',
      url: 'https://graph.usaco.guide/?token=private#frame-4',
    }),
    {
      type: 'pageview',
      url: 'https://graph.usaco.guide/',
    }
  );
  assert.equal(
    stripAnalyticsUrlDetails({ type: 'pageview', url: 'not a URL' }),
    null
  );
});

test('allows only named events and allowlisted aggregate properties', () => {
  const calls = [];
  const capture = (...args) => calls.push(args);

  assert.equal(
    trackUsageEvent(
      USAGE_EVENTS.exportCompleted,
      { format: 'png', graphLabel: 'private label' },
      capture
    ),
    true
  );
  assert.deepEqual(calls, [[USAGE_EVENTS.exportCompleted, { format: 'png' }]]);

  assert.equal(
    trackUsageEvent(
      USAGE_EVENTS.exportCompleted,
      { format: 'unknown' },
      capture
    ),
    false
  );
  assert.equal(trackUsageEvent('Anything Else', {}, capture), false);
  assert.equal(calls.length, 1);
});

test('counts one project start and one timeline creation per lifecycle', () => {
  const events = [];
  const tracker = createProjectUsageTracker({
    emit: (name, properties) => {
      events.push([name, properties]);
      return true;
    },
  });

  assert.equal(tracker.markProjectStarted('canvas'), true);
  assert.equal(tracker.markProjectStarted('canvas'), false);
  assert.equal(tracker.markTimelineCreated('manual'), true);
  assert.equal(tracker.markTimelineCreated('manual'), false);
  tracker.recordExport('project');

  assert.deepEqual(events, [
    [USAGE_EVENTS.projectStarted, { source: 'canvas' }],
    [USAGE_EVENTS.timelineCreated, { source: 'manual' }],
    [USAGE_EVENTS.exportCompleted, { format: 'project' }],
  ]);
});

test('preset changes start a fresh lifecycle while imports do not count as new work', () => {
  const events = [];
  const tracker = createProjectUsageTracker({
    initialProjectStarted: true,
    initialHasTimeline: true,
    emit: (name, properties) => {
      events.push([name, properties]);
      return true;
    },
  });

  tracker.recordPresetLoaded('blank');
  tracker.recordExport('png');
  tracker.recordProjectImported({ hasTimeline: true });
  tracker.recordExport('svg');

  assert.deepEqual(events, [
    [USAGE_EVENTS.presetLoaded, { preset: 'blank' }],
    [USAGE_EVENTS.projectStarted, { source: 'export' }],
    [USAGE_EVENTS.exportCompleted, { format: 'png' }],
    [USAGE_EVENTS.projectImported, undefined],
    [USAGE_EVENTS.exportCompleted, { format: 'svg' }],
  ]);
});

test('successful parser generation starts a new project lifecycle', () => {
  const events = [];
  const tracker = createProjectUsageTracker({
    initialProjectStarted: true,
    emit: (name, properties) => {
      events.push([name, properties]);
      return true;
    },
  });

  tracker.recordGeneratedProject('parser');

  assert.deepEqual(events, [
    [USAGE_EVENTS.projectStarted, { source: 'parser' }],
  ]);
});
