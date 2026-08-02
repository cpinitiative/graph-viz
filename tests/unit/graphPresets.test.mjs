import assert from 'node:assert/strict';
import test from 'node:test';
import { GRAPH_PRESETS } from '../../src/components/visualizers/Graphs/graphStudio/data/graphPresets.js';

const assertUniqueIds = (items, label) => {
  const ids = items.map(item => String(item.id));
  assert.equal(
    new Set(ids).size,
    ids.length,
    `${label} must not contain duplicate ids`
  );
};

test('worked presets contain valid graph and timeline references', () => {
  for (const [presetName, preset] of Object.entries(GRAPH_PRESETS)) {
    const nodes = preset.graph?.nodes ?? [];
    const edges = preset.graph?.edges ?? [];
    const steps = preset.steps ?? [];
    const nodeIds = new Set(nodes.map(node => String(node.id)));
    const edgeIds = new Set(edges.map(edge => String(edge.id)));

    assert.ok(nodes.length > 0, `${presetName} needs at least one node`);
    assert.ok(
      steps.length >= 4,
      `${presetName} needs a useful worked timeline`
    );
    assertUniqueIds(nodes, `${presetName} nodes`);
    assertUniqueIds(edges, `${presetName} edges`);
    assertUniqueIds(steps, `${presetName} steps`);

    for (const edge of edges) {
      assert.ok(
        nodeIds.has(String(edge.from)),
        `${presetName} edge ${edge.id} has a missing source`
      );
      assert.ok(
        nodeIds.has(String(edge.to)),
        `${presetName} edge ${edge.id} has a missing target`
      );
    }

    for (const step of steps) {
      for (const nodeId of Object.keys(step.nodeOverrides ?? {})) {
        assert.ok(
          nodeIds.has(String(nodeId)),
          `${presetName} step ${step.id} overrides missing node ${nodeId}`
        );
      }
      for (const edgeId of Object.keys(step.edgeOverrides ?? {})) {
        assert.ok(
          edgeIds.has(String(edgeId)),
          `${presetName} step ${step.id} overrides missing edge ${edgeId}`
        );
      }
    }
  }
});

test('worked presets use explanatory captions and teaching legends', () => {
  for (const [presetName, preset] of Object.entries(GRAPH_PRESETS)) {
    for (const step of preset.steps) {
      const description = String(step.description ?? '').trim();
      assert.ok(
        description.length >= 24,
        `${presetName} step ${step.id} needs a more explanatory caption`
      );
      assert.doesNotMatch(
        description,
        /^step\s+\d+$/i,
        `${presetName} step ${step.id} uses a placeholder caption`
      );
    }

    const legend = preset.legend;
    assert.ok(legend, `${presetName} needs a teaching legend`);
    assert.ok(
      String(legend.title ?? '').trim().length >= 4,
      `${presetName} needs a descriptive legend title`
    );
    assert.doesNotMatch(
      legend.title,
      /\blegend\b/i,
      `${presetName} legend title should name the concept, not the component`
    );
    assert.equal(legend.position, 'bottom-right');
    assert.ok(
      legend.entries.some(entry => entry.kind === 'node'),
      `${presetName} legend needs a node explanation`
    );
    assert.ok(
      legend.entries.some(entry => entry.kind === 'edge'),
      `${presetName} legend needs an edge explanation`
    );
    assert.equal(
      new Set(legend.entries.map(entry => entry.label)).size,
      legend.entries.length,
      `${presetName} legend labels must be unique`
    );
    for (const entry of legend.entries) {
      assert.ok(
        String(entry.label ?? '').trim().length >= 4,
        `${presetName} has an unclear legend label`
      );
      assert.match(
        entry.color,
        /^#[0-9a-f]{6}$/i,
        `${presetName} legend colors must be six-digit hex values`
      );
    }
  }
});
