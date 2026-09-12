import { expect, test } from '@playwright/test';
import { Buffer } from 'node:buffer';

const draftKey = 'graph-viz:editor:draft:v1';
const canvas = page => page.locator('#graph-studio-canvas-svg');
const nodeCircle = (page, id) =>
  canvas(page).locator(`[data-node-id="${id}"] circle`).first();

const createProject = () => ({
  format: 'graph-viz-project',
  version: 1,
  graph: {
    nodes: ['A', 'B', 'C'].map((id, index) => ({
      id,
      label: id,
      x: 200 + index * 180,
      y: 250,
      stateId: 'seed-node',
      color: '#123456',
      visible: true,
    })),
    edges: [
      {
        id: 'e0',
        from: 'A',
        to: 'B',
        stateId: 'seed-edge',
        color: '#654321',
        visible: true,
      },
    ],
  },
  timeline: {
    currentFrame: 0,
    steps: [
      {
        id: 'initial',
        description: 'Original semantic styles',
        durationMs: 800,
        nodeOverrides: {},
        edgeOverrides: {},
      },
    ],
  },
  settings: {
    visualStates: [
      {
        id: 'seed-node',
        kind: 'node',
        label: 'Original node',
        color: '#123456',
      },
      {
        id: 'seed-edge',
        kind: 'edge',
        label: 'Original edge',
        color: '#654321',
      },
    ],
  },
});

const importProject = async (page, project) => {
  await page.getByRole('button', { name: 'Import...', exact: true }).click();
  await page.getByTestId('project-import-input').setInputFiles({
    name: 'state-contract.graphviz.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(project)),
  });
  await expect(canvas(page).locator('[data-node-id="A"]')).toBeVisible();
};

const runScript = async (page, source) => {
  await page.getByRole('button', { name: 'Script Mode', exact: true }).click();
  await page.locator('#script-source').fill(source);
  await page
    .getByRole('button', { name: 'Generate timeline', exact: true })
    .click();
  await expect(page.getByTestId('script-modal')).toBeHidden();
};

test('closing an unchanged legend preserves the redo action', async ({
  page,
}) => {
  await page.goto('/');
  const description = page.getByRole('textbox', {
    name: 'Frame Description',
    exact: true,
  });
  const initialDescription = await description.inputValue();
  const undo = page.getByRole('button', { name: 'Undo', exact: true });
  const redo = page.getByRole('button', { name: 'Redo', exact: true });
  await description.fill('Restore this caption with Redo');
  await undo.click();
  await expect(description).toHaveValue(initialDescription);
  await expect(undo).toBeDisabled();
  await expect(redo).toBeEnabled();

  await page.getByTestId('custom-legend-edit-toggle').click();
  const legend = page.getByTestId('custom-legend-modal');
  await expect(legend).toBeVisible();
  // Opening the legend groups its edits in a transaction on the next frame.
  await page.evaluate(
    () => new Promise(resolve => requestAnimationFrame(resolve))
  );
  await legend.getByRole('button', { name: 'Done', exact: true }).click();

  await expect(undo).toBeDisabled();
  await expect(redo).toBeEnabled();
  await redo.click();
  await expect(description).toHaveValue('Restore this caption with Redo');
});

test('script styles override a styled graph and survive local recovery', async ({
  page,
}) => {
  await page.goto('/');
  await importProject(page, createProject());
  await expect(nodeCircle(page, 'A')).toHaveAttribute('fill', '#123456');
  await runScript(
    page,
    "api.active('A'); api.queued('B'); api.visited('C'); api.edge('e0');"
  );
  await page.getByText('Frame 5', { exact: true }).click();
  const assertAppearance = async () => {
    await expect(nodeCircle(page, 'A')).toHaveAttribute('fill', '#3B82F6');
    await expect(nodeCircle(page, 'B')).toHaveAttribute('fill', '#EAB308');
    await expect(nodeCircle(page, 'C')).toHaveAttribute('fill', '#22C55E');
    await expect(
      canvas(page).locator('[data-edge-path-id="e0"]')
    ).toHaveAttribute('stroke', '#F59E0B');
  };
  await assertAppearance();
  await expect
    .poll(() =>
      page.evaluate(key => {
        const saved = JSON.parse(localStorage.getItem(key) || 'null');
        return saved?.project?.timeline?.currentFrame;
      }, draftKey)
    )
    .toBe(4);

  await page.reload();
  await expect(page.getByTestId('local-draft-status')).toContainText(
    'Restored locally'
  );
  await assertAppearance();
});

test('partial script patches keep frame text and independent edge properties', async ({
  page,
}) => {
  await page.goto('/');
  await importProject(page, createProject());
  await runScript(
    page,
    `api.push({type:'patch',nodeOverrides:{A:{status:'queued',annotation:'dist=2'}},edgeOverrides:{e0:{status:'rejected',color:'#DC2626',visible:false}}});
api.push({type:'patch',nodeOverrides:{A:{color:'#22C55E'}},edgeOverrides:{e0:{color:'#3B82F6'}}});
api.push({type:'patch',edgeOverrides:{e0:{visible:true}}});`
  );
  await page.getByText('Frame 3', { exact: true }).click();
  await expect(canvas(page).getByText('dist=2', { exact: true })).toBeVisible();
  await expect(nodeCircle(page, 'A')).toHaveAttribute('fill', '#22C55E');
  await expect(canvas(page).locator('[data-node-id="A"]')).toHaveAttribute(
    'data-node-status',
    'queued'
  );
  await expect(canvas(page).locator('[data-edge-id="e0"]')).toHaveCount(0);

  await page.getByText('Frame 4', { exact: true }).click();
  await expect(canvas(page).getByText('dist=2', { exact: true })).toBeVisible();
  const edge = canvas(page).locator('[data-edge-path-id="e0"]');
  await expect(edge).toHaveAttribute('stroke', '#3B82F6');
  await expect(edge).toHaveAttribute('stroke-dasharray', '6 4');
});

test('legacy status-only project files retain their original monochrome palette', async ({
  page,
}) => {
  const project = createProject();
  project.graph.nodes.forEach((node, index) => {
    delete node.stateId;
    delete node.color;
    node.status = ['active', 'queued', 'visited'][index];
  });
  await page.goto('/');
  await importProject(page, project);
  await expect(nodeCircle(page, 'A')).toHaveAttribute('fill', '#000000');
  await expect(nodeCircle(page, 'B')).toHaveAttribute('fill', '#EEEEEE');
  await expect(nodeCircle(page, 'C')).toHaveAttribute('fill', '#E2E2E2');
});
