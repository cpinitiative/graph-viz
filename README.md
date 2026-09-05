# Graph Viz

Graph Viz is a USACO Guide graph-animation authoring tool for creating, editing,
scripting, saving, and exporting graph algorithm visualizations.

## Live Demo

Use the deployed editor at:

https://graph-viz.usaco.guide

## Feature Overview

- Interactive graph editing with draggable nodes, edges, labels, weights, and
  directed-edge styling.
- Keyboard graph editing, visible focus, accessible dialogs, and a mobile canvas
  focus view.
- Readable node labels with shared status colors and non-color state cues.
- Timeline/frame animation for step-by-step algorithm explanations.
- Automatic local draft recovery and gesture-based undo.
- USACO-aligned graph presets for common teaching examples.
- Full project JSON import/export with editor state, timeline, viewport, and
  settings.
- PPTX slideshow export for slide-based lessons.
- MP4 export for embedding animations in written or video material.
- Edge-list import/export for simple graph structure exchange.
- Script Mode for generating timeline frames from small JavaScript traces.
- Visual state legend for active, queued, visited, highlighted, and selected
  elements.
- Playwright E2E coverage for key editor, import/export, preset, and export
  workflows.

## USACO Guide Alignment

Graph Viz is designed for USACO Guide authors and students who need clear,
repeatable graph algorithm visuals. The current preset set covers graph topics
such as:

- graph traversal and connected components
- disjoint set union
- topological sort
- shortest paths with non-negative weights
- minimum spanning trees

Presets include compact legends, larger labels, captions, and 1.8–3 second holds
for video. BFS and DFS expose queue/stack progress; Dijkstra shows
`node:distance`; topological sort shows `node:indegree`; DSU and components show
`node:root` or `node:group`. The inspector's **Frame text** field edits these
annotations independently of the project-wide node name.

Loading a preset applies its presentation sizes, enables its legend and caption,
and hides the grid. These settings remain editable. Authors can adjust the graph
and timeline, then export the result for guide modules, slides, classroom
material, or video explanations.

## Author Workflow

A typical author workflow looks like this:

1. Choose a USACO preset or create a graph from scratch.
2. Edit nodes, edges, labels, weights, routing, and visual states.
3. Build or revise timeline frames with descriptions for each step.
4. Save the work as a `.graphviz.json` project file.
5. Export the timeline as a PPTX slideshow or MP4 video.
6. Drop the slides or video into teaching material.

## Project JSON Workflow

`Export Project` saves the full editor state as a `.graphviz.json` file. This
includes the graph, timeline frames, current frame, viewport, canvas settings,
and rendering settings.

`Import Project` restores that saved state so authors can continue editing,
share examples, or keep reusable lesson assets in version control.

Project files are regular JSON. They can be edited manually or generated with AI
assistance, then imported into the editor for validation and visual review. This
is useful when drafting larger examples from an algorithm trace, lesson outline,
or existing explanation.

Edge-list import/export is separate and simpler. It is meant for basic graph
structure exchange, not full timeline or editor-state persistence.

## Editing and recovery

Tab into the graph, use arrow keys to explore nodes and edges, and press Enter
or Space to select. Alt + arrows moves a node. In Draw Edge mode, select each
endpoint with Enter; in Add Node mode, Enter on the canvas creates a node at the
center. On narrow screens, use `Focus canvas` to hide the timeline.

The editor saves one draft in this browser after a short pause and restores it
on reload. The status bar reports save failures, including unavailable storage
or quota limits. Export Project for a portable backup; browser storage can be
cleared and is not synchronized between devices or tabs.

Project imports are limited to 16 MiB, 1,000 nodes, 5,000 edges, 1,001 frames,
and 500,000 override entries. Colors accept `#RGB`, `#RRGGBB`, or an empty value
for the default. Invalid imports leave the current project intact. Edge-list
exports remap IDs to consecutive integers and require numeric weights; use
project JSON to preserve directions, labels, and animation settings.

Force layout runs in a cancellable worker. Each drag is a single undo action.

## Script Mode

Script Mode lets advanced authors write small JavaScript traces that generate
timeline frames. A script can mark nodes active, queued, or visited; highlight
edges; or push structured timeline patches.

Scripts run in a Web Worker and include timeout protection, so accidental
infinite loops do not lock the editor. Script output is validated before it is
used to replace the timeline. Closing Script Mode cancels a running script. Only
run code you trust: a Web Worker can access network and browser storage; it is
not a security sandbox.

Basic editing does not require Script Mode. It is a power-user workflow for
authors who want to produce many consistent frames from code.

## Exporting Animations

Graph Viz supports several export paths:

- `Export Slideshow` downloads a PPTX file with one slide per timeline frame.
- `Export MP4` opens video export settings and renders the timeline to an MP4.
- `Export Project` saves the editable `.graphviz.json` project, which is the
  best format for future revisions.
- `Export Edge List` copies a simple edge-list representation for graph
  structure only.

PPTX exports can be opened in PowerPoint or uploaded to Google Slides.

**Editor view** is the default PNG/SVG framing: it preserves graph scale,
labels, and overlay placement from the reviewed canvas. PNG scale changes
resolution only. Video and slides preserve that same composition inside 16:9;
use **Preview video / slides · 16:9** to review it. Extra space is padded rather
than stretching or refitting each frame. **Fit graph** and **Slide 16:9** are
explicit alternatives that resize the graph while reserving overlay space.
Timeline exports show progress and support cancellation between capture steps.
MP4 exports are limited to 10 minutes. Final PPTX serialization and a pending
video encoder flush may delay cancellation.

## Demo Media

Screenshots and GIFs will be added here later.

Suggested examples:

- main editor with a Dijkstra or Kruskal preset
- sidebar import/export controls
- Script Mode modal
- PPTX or MP4 export workflow

## Development

Use the Node version in `.nvmrc`.

```bash
npm ci
npm run dev
npm run test:unit
npm run check
npm run test:e2e:smoke
npm run test:e2e
npm run test:e2e:headed
npm run test:e2e:ui
npm run check:e2e
```

`npm run dev` starts the local Vite development server.

`npm run check` runs formatting checks, ESLint, and the production build. Unit
tests name the current test files explicitly so the command works on the
recommended Node 20.19 release and on newer Node releases that no longer accept
a test directory. Local Playwright builds and serves the production bundle
through Vite preview.

To run the focused smoke test against the deployed site:

```bash
PLAYWRIGHT_BASE_URL=https://graph-viz.usaco.guide npm run test:e2e:smoke
```

The deployment is public, so this command needs no secret. To also prove that a
specific commit is deployed, set the optional expected 7–40 character SHA:

```bash
PLAYWRIGHT_BASE_URL=https://graph-viz.usaco.guide EXPECTED_GRAPH_STUDIO_COMMIT_SHA=$(git rev-parse HEAD) npm run test:e2e:smoke
```

The smoke checks the document and core asset responses, the Graph Studio shell,
the graph canvas, theme toggling, browser errors, and the build marker. A
regular production build writes commit, build timestamp, and deployment label
metadata to `data-build-*` attributes on `graph-studio-root`. Build systems can
override the detected values with `GRAPH_STUDIO_COMMIT_SHA`,
`GRAPH_STUDIO_BUILD_TIMESTAMP`, and `GRAPH_STUDIO_DEPLOYMENT`. If a build has
neither repository metadata nor an injected commit, the marker reports
`unknown`; setting `EXPECTED_GRAPH_STUDIO_COMMIT_SHA` makes that a smoke
failure.

## Validation and CI

GitHub Actions runs CI and E2E workflows on pull requests and pushes to `main`.

- `npm run check` verifies formatting, linting, and production build output.
- `npm run test:unit` runs the deterministic graph-state and layout unit tests.
- `npm run test:e2e:smoke` runs the local/deployed shell smoke path.
- `npm run test:e2e` runs Playwright tests for core user flows.
- The E2E suite covers app load, graph editing, presets, timeline editing,
  project import/export, Script Mode timeout protection, self-loop rendering,
  directed arrowhead coloring, MP4 modal access, and PPTX slideshow export.
