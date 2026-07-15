# Graph Studio production/main diagnostic

Date: 2026-07-15

## Bottom line

The original mismatch was real but the local branch information was stale by the
time this work started.

- The deployed bundle had been identified as the tree built from `8741844`.
- Local `main` was still `e95edf3`, five commits behind that tree.
- A fresh fetch found upstream merge commit `f771186` (PR #72). Its parents are
  `e95edf3` and `8741844`, and its tree is byte-for-byte identical to the
  `8741844` tree.
- Local `main` was fast-forwarded to `f771186`. This PR is based on `f771186`.

Do not cherry-pick the five commits again. They are already in upstream `main`.
The remaining deployment gap is provenance: the currently deployed bundle has no
marker that identifies its source without downloading and comparing assets.

## Reconciliation audit

The five commits that were absent from stale `main` were, oldest first:

1. `14080a5` — Improve Graph Studio control trust
2. `b81ec78` — Fix Graph Studio e2e regressions
3. `639e9d6` — Refine Graph Studio mode indicators
4. `134abc3` — Calm Graph Studio tool mode styling
5. `8741844` — Move Graph Studio mode indicator into canvas

The range is linear: `e95edf3...8741844` reports `0 5`. Net change was 10 files,
334 insertions, and 99 deletions.

No production-only change was discarded. In particular:

- The force-layout recalibration in `14080a5` is a material behavior change and
  has deterministic unit coverage. It stays.
- The grid SVG rewrite in `b81ec78` is renderer/test robustness work. It stays.
- `639e9d6` and `134abc3` contain intermediate mode-indicator decisions. The
  final intended state is the compact canvas indicator in `8741844`, not either
  intermediate presentation.
- `8741844` intentionally removes the Add Node/Draw Edge helper paragraphs from
  the sidebar. Restoring tests for that copy would reintroduce the mismatch.

Verified merge facts:

```text
f771186 parents: e95edf3 8741844
8741844 tree:    f4b6f5d453ed424cefa215067193e8d1609c3212
f771186 tree:    f4b6f5d453ed424cefa215067193e8d1609c3212
```

## Test mismatch

Stale-main E2E tests expected exact sidebar instructions such as “Click canvas
to add a node…” and “Connect nodes to add an edge…”. Production removed those
paragraphs and moved mode feedback onto the canvas.

The tests merged by PR #72 now assert stable behavior instead:

- active tool state through `aria-pressed`
- canvas state through `data-mode`
- the visible `canvas-mode-indicator`
- draw-source ring behavior

This PR does not weaken those assertions or restore stale copy checks. The new
deployed smoke also uses stable roles/test IDs rather than the marketing tagline
or CSS color values.

## Build provenance

Vite now injects three values at build time and `graph-studio-root` exposes them
as invisible `data-build-*` attributes:

- `data-build-commit`
- `data-build-timestamp`
- `data-build-environment`

Commit detection prefers explicit Graph Studio/provider environment values and
falls back to `git rev-parse HEAD`. Timestamp falls back to the build time.
Environment falls back to the Vite mode. Deploy systems can set:

```text
GRAPH_STUDIO_COMMIT_SHA
GRAPH_STUDIO_BUILD_TIMESTAMP
GRAPH_STUDIO_DEPLOYMENT
```

Git-less source builds report commit `unknown` unless the build system injects
the SHA. The optional expected-SHA smoke check rejects `unknown`. This is
deliberately not a visible UI badge.

## Deployed smoke path

Run locally:

```bash
npm run test:e2e:smoke
```

Run against production:

```bash
PLAYWRIGHT_BASE_URL=https://graph-viz.usaco.guide npm run test:e2e:smoke
```

Require a specific deployed commit:

```bash
PLAYWRIGHT_BASE_URL=https://graph-viz.usaco.guide EXPECTED_GRAPH_STUDIO_COMMIT_SHA=$(git rev-parse HEAD) npm run test:e2e:smoke
```

The public deployment requires no secret. The smoke verifies HTTP 200 for the
document and same-origin core assets, nonblank shell layout, Graph Studio shell,
provenance fields, a rendered graph canvas with nodes and edges, theme toggling,
same-origin request failures, console errors, and page errors.

Current production result before this PR is deployed: the document, shell,
canvas, theme toggle, core assets, and browser-error checks pass. The test fails
only the four provenance assertions because the old bundle has no marker. That
failure is expected and should remain red until a build containing this PR is
deployed.

## Node decision

`.nvmrc` remains the canonical recommendation at Node `20.19.0`; both GitHub
workflows already consume it. The package engine range also admits Node 25, so
leaving a known-broken unit command would be dishonest.

`test:unit` now names the current unit files explicitly instead of passing the
directory:

```text
node --test tests/unit/effectiveVisibility.test.mjs tests/unit/graphLayouts.test.mjs tests/unit/temporalGraphState.test.mjs
```

The command passes all 21 tests on Node `20.19.0` and Node `25.2.1`. This is a
small compatibility correction, not a toolchain migration.

## Commands run and results

```text
git fetch origin --prune
  PASS — origin/main advanced from e95edf3 to f771186

git rev-list --left-right --count e95edf3...8741844
  PASS — 0 5

git rev-parse 8741844^{tree} f771186^{tree}
  PASS — identical tree IDs

git diff --quiet 8741844 f771186
  PASS — no tree diff

npm install
  PASS — dependencies already up to date

npm run test:unit                         # Node 20.19.0
  PASS — 21/21

PATH=/opt/homebrew/bin:/usr/bin:/bin /opt/homebrew/bin/npm run test:unit
  PASS — 21/21 on Node 25.2.1

npm run lint
  PASS

npm run build
  PASS — 384 modules transformed
  NOTE — existing >500 kB chunk warning remains

SOURCE_DATE_EPOCH=100000000000000 npm run build
  PASS — invalid out-of-range source dates fall back instead of crashing Vite

npm run test:e2e:smoke
  PASS — 1/1 against a local production build served by Vite preview

npm run test:e2e
  PASS — 31/31 across desktop, mobile, and focused smoke projects

PLAYWRIGHT_BASE_URL=https://graph-viz.usaco.guide npm run test:e2e:smoke
  EXPECTED FAIL — production lacks all four provenance fields; subsequent
  shell/canvas/theme/core-asset/browser-error checks complete without failure
```

All project commands above were run with Node `20.19.0` unless explicitly marked
as the Node 25 compatibility check.

## Remaining follow-ups

### P1

- Merge and deploy this PR, then run the production smoke with
  `EXPECTED_GRAPH_STUDIO_COMMIT_SHA` set to the deployed revision. Until that
  happens, production is healthy but cannot prove its source revision.

### P2

- Trigger the focused smoke from the deployment-complete event or a scheduled
  workflow. Do not gate an earlier push job on production; it can race the
  deployment and test the previous bundle.
- Replace remaining broad-suite assertions that couple to computed colors or HUD
  pixel ordering when those tests are next touched. They are more brittle than
  the new smoke but are outside this focused PR.
- Address the existing production chunk-size warning in a separate performance
  change. Export architecture/code splitting is explicitly out of scope here.
