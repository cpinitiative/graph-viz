# Graph Viz

Graph Viz is a desktop-first authoring tool for turning graph algorithms into
clear, editable teaching visuals. It is built for USACO Guide authors, but works
for anyone creating step-by-step graph explanations.

Use the editor at [graph-viz.usaco.guide](https://graph-viz.usaco.guide/).

## What You Can Make

- Frame-by-frame animations with captions, timing, and a custom legend
- Static PNG and SVG figures
- PPTX slideshows with one slide per selected frame
- MP4 videos for lessons and presentations
- Editable `.graphviz.json` project files

Graph Viz is intended for authoring—not for running algorithms or analyzing an
input graph. The editor is designed around a mouse, keyboard, and desktop-sized
screen. Mobile layouts may be useful for review, but mobile editing is not a
primary support target.

## Author Workflow

1. Load an educational preset or choose **Blank Project** to start from scratch.
2. Edit labels, positions, weights, edge direction, colors, and styles.
3. Add frames and describe each meaningful step of the algorithm.
4. Adjust frame-specific appearance and visibility to show what changes.
5. Review the animation, then export the format your lesson needs.
6. Export the project JSON when you want a durable, shareable source file.

Presets are ready-made teaching examples rather than unlabeled graph shapes.
They include a labeled graph, explanatory frame sequence, and algorithm-specific
legend for topics including BFS, DFS, connected components, disjoint set union,
topological sort, Dijkstra's algorithm, and Kruskal's algorithm. Multi-edge and
self-loop examples are also available for testing graph structure and routing.

## How Frames Work

The editor separates information that defines the project from information that
changes during an explanation:

- **Project details**—such as labels, positions, and canvas settings—are shared
  by every frame.
- **Appearance**—such as state, color, and visibility—can differ on each frame.
- New nodes and edges begin on the frame where they are added.
- Visibility changes can target this frame or this and following frames.
- Frame-specific style changes can be promoted across all frames when they
  should become the project default.

This lets an author express an algorithm's progression without maintaining a
separate copy of the whole graph for every step.

Use the visible **Undo** and **Redo** controls, or press
<kbd>Ctrl</kbd>/<kbd>Command</kbd>+<kbd>Z</kbd> to undo and
<kbd>Ctrl</kbd>/<kbd>Command</kbd>+<kbd>Shift</kbd>+<kbd>Z</kbd> to redo. Text
fields retain their normal browser history while they are being edited.

## Saving and Recovery

Graph Viz keeps a recovery draft in this browser as you edit and restores it
automatically when you return. The graph, frames, current frame, legend, and
editor settings come back; the canvas is fit to the current workspace instead of
replaying pan and zoom coordinates from an older window size. Choose **Blank
Project** when you intentionally want to replace the recovered work.

A browser draft is a safety net, not a durable save:

- It stays on the current browser and device.
- Clearing site data or using a private browsing session may remove it.
- It is not synced to USACO Guide or shared with collaborators.

Use **Export Project** to download a `.graphviz.json` file for long-term
storage, version control, or handoff. **Import Project** restores the graph,
timeline, current frame, viewport, canvas settings, legend, and rendering
settings.

Project files are regular JSON, so they can also be generated or edited with
code or AI assistance before being imported for visual review. Edge-list import
and export is intentionally simpler: it transfers graph structure, not the
timeline or editor settings.

## Script Mode

Script Mode is an optional power-user workflow for building timeline frames from
small JavaScript traces. A script can mark nodes and edges, change their
appearance, and push structured frame updates. Scripts run in a Web Worker with
timeout protection, and their output is validated before it replaces the
timeline.

Basic editing does not require code. Start with the visual editor or a preset;
use Script Mode when a longer animation would be clearer and faster to generate
from an algorithm trace.

## Export Guide

- **PNG / SVG:** a selected frame for articles, problem statements, and notes
- **Export Slideshow:** selected frames as a PPTX for PowerPoint or Google
  Slides
- **Export MP4:** selected animation frames as a video
- **Export Project:** the complete editable project as `.graphviz.json`
- **Export Edge List:** graph structure only

Review the selected frames and export settings before rendering. Keep the
project JSON alongside published media so the visualization can be revised
later.

## Development

Use the Node version in `.nvmrc`, then install dependencies and start Vite:

```bash
npm ci
npm run dev
```

Before opening a pull request, run:

```bash
npm run test:unit
npm run check
npm run test:e2e:smoke
npm run test:e2e
```

Useful interactive E2E commands are also available:

```bash
npm run test:e2e:headed
npm run test:e2e:ui
npm run check:e2e
```

`npm run check` verifies formatting, ESLint, and the production build.
Playwright covers the editor shell and core graph, preset, timeline,
import/export, Script Mode, and rendering workflows.

To run the smoke test against production:

```bash
PLAYWRIGHT_BASE_URL=https://graph-viz.usaco.guide npm run test:e2e:smoke
```

To additionally confirm that a particular commit is deployed, provide its SHA:

```bash
PLAYWRIGHT_BASE_URL=https://graph-viz.usaco.guide EXPECTED_GRAPH_STUDIO_COMMIT_SHA=$(git rev-parse HEAD) npm run test:e2e:smoke
```

Production builds expose commit, build timestamp, and deployment metadata on the
`graph-studio-root` element. Build systems may override detected values with
`GRAPH_STUDIO_COMMIT_SHA`, `GRAPH_STUDIO_BUILD_TIMESTAMP`, and
`GRAPH_STUDIO_DEPLOYMENT`.

GitHub Actions runs validation and browser tests for pull requests and pushes to
`main`. When changing editor behavior, add deterministic unit coverage for state
logic and Playwright coverage for the author-visible workflow.
