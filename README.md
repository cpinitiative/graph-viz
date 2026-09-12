# Graph Viz

Graph Viz is a desktop-first authoring tool for turning graph algorithms into
clear, editable teaching visuals. It is built for USACO Guide authors, but works
for anyone creating step-by-step graph explanations.

Use the editor at [graph.usaco.guide](https://graph.usaco.guide/).

`graph-viz.usaco.guide` is a recovery address for existing browser saves.
Visitors without a save continue to the main address automatically. Visitors
with a save can download it and import it at the main address. The editor runs
at the main address. Keep both domains attached to the same production
deployment; do not add an HTTP redirect on the old domain, because its recovery
page needs to read that origin’s browser storage.

## What You Can Make

- Frame-by-frame animations with captions, timing, and a smart or custom legend
- Static PNG and SVG figures
- PPTX slideshows with one slide per selected frame
- MP4 videos for lessons and presentations
- Editable `.graphviz.json` project files

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
`node:root` or `node:group`. The inspector's **Frame annotation** field edits
these annotations independently of the project-wide node name.

Loading a preset applies its presentation sizes, enables its legend and caption,
and hides the grid. These settings remain editable. Authors can adjust the graph
and timeline, then export the result for guide modules, slides, classroom
material, or video explanations.

Graph Viz is intended for authoring—not for running algorithms or analyzing an
input graph. The editor is designed around a mouse, keyboard, and desktop-sized
screen. Mobile layouts may be useful for review, but mobile editing is not a
primary support target.

## Author Workflow

1. Load an educational preset or choose **Blank Project** to start from scratch.
2. Edit labels, positions, weights, edge direction, and reusable visual states.
3. Add frames and describe each meaningful step of the algorithm.
4. Adjust frame-specific appearance and visibility to show what changes.
5. Review the animation, then export the format your lesson needs.
6. Export the project JSON when you want a durable, shareable source file.

### Precise diagrams and contest input

Select a node to edit its **X** and **Y** coordinates in Project details.
Shift-click several nodes, then use **Align** or **Distribute** in the
inspector; each arrangement is one undo action and applies across frames. Nodes
can be circles, squares, rectangles, diamonds, or text anchors. Text anchors are
useful for coordinate labels and explanatory notes and remain selectable like
nodes.

New nodes keep their name inside the shape and show **Frame annotation** below
it. Older projects keep their existing appearance. Change **Annotation
placement** in Project details to switch between the existing replacement text
and a separate annotation; edit the annotation itself under Frame appearance.

Use **Import → Paste / Import ASCII Grid** for maze maps containing `#`, `.`,
`A`, `B`, and `M`. An optional first line can give the row and column counts, so
CSES sample inputs can be pasted directly. Walls remain visible square cells;
edges connect traversable horizontal and vertical neighbors. The 1,000-node
authoring limit includes walls.

**Paste / Import Edge List** accepts zero-based or one-based IDs. Choose **Text
labels** for letter-labeled inputs such as AtCoder ABC197 F, or keep **Numeric
weights** for weighted graphs. Invalid input leaves the current project intact.
Project JSON preserves labels, shapes, annotations, and frames; the simpler Edge
List export retains its numeric, zero-based contract.

### Notes and display captions

The frame description can contain the full explanation. Enable **Separate
caption text** to write a shorter caption for the canvas, images, slides, and
video while retaining those notes. A new keyframe starts with empty text;
Duplicate copies both fields. The editor warns when the current viewport
shortens a caption or legend. Use shorter display text, a smaller caption font,
or a wider canvas before exporting.

Blank projects start at a readable 100% zoom. Reload fits the graph only after
the caption and legend have been measured, and canvas notices occupy their own
space. On a phone, **Focus canvas** refits the graph to the available area,
including when panning is locked.

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

## Visual States and Legends

A visual state gives a color a project-specific meaning, such as **Front of
queue**, **Distance finalized**, or **Rejected edge**. Apply states from the
node and edge inspectors instead of repeatedly choosing raw colors. Renaming or
recoloring a state updates every frame that uses it.

The default **Smart** legend is derived from states used anywhere in the
project—not only the current frame—so its entries remain stable during playback.
Unused states stay out of the legend unless they are pinned. Use **Custom** mode
when the explanation needs entries that are independent from graph styling;
switching from Smart to Custom starts with a copy of the current smart entries.

Older project files and presets remain importable. Legacy node styles are
preserved and converted to project states where needed.

Use the visible **Undo** and **Redo** controls, or press
<kbd>Ctrl</kbd>/<kbd>Command</kbd>+<kbd>Z</kbd> to undo and
<kbd>Ctrl</kbd>/<kbd>Command</kbd>+<kbd>Shift</kbd>+<kbd>Z</kbd> to redo. Text
fields retain their normal browser history while they are being edited.

## Saving and Recovery

Graph Viz keeps a recovery draft in this browser as you edit and restores it
automatically when you return. The graph, frames, current frame, visual states,
legend, and editor settings come back; the canvas is fit to the current
workspace instead of replaying pan and zoom coordinates from an older window
size. Choose **Blank Project** when you intentionally want to replace the
recovered work.

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

Script Mode is an optional power-user workflow for building timeline frames from
small JavaScript traces. A script can mark nodes and edges, change their
appearance, and push structured frame updates. Scripts run in a Web Worker with
timeout protection, and their output is validated before it replaces the
timeline.

Basic editing does not require code. Start with the visual editor or a preset;
use Script Mode when a longer animation would be clearer and faster to generate
from an algorithm trace. Closing Script Mode cancels a running script. Only run
code you trust: a Web Worker can access network and browser storage; it is not a
security sandbox.

## Export Guide

- **PNG / SVG:** a selected frame for articles, problem statements, and notes
- **Export Slideshow:** selected frames as a PPTX for PowerPoint or Google
  Slides
- **Export MP4:** selected animation frames as a video
- **Export Project:** the complete editable project as `.graphviz.json`
- **Export Edge List:** graph structure only

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
PLAYWRIGHT_BASE_URL=https://graph.usaco.guide npm run test:e2e:smoke
```

To additionally confirm that a particular commit is deployed, provide its SHA:

```bash
PLAYWRIGHT_BASE_URL=https://graph.usaco.guide EXPECTED_GRAPH_STUDIO_COMMIT_SHA=$(git rev-parse HEAD) npm run test:e2e:smoke
```

Production builds expose commit, build timestamp, and deployment metadata on the
`graph-studio-root` element. Build systems may override detected values with
`GRAPH_STUDIO_COMMIT_SHA`, `GRAPH_STUDIO_BUILD_TIMESTAMP`, and
`GRAPH_STUDIO_DEPLOYMENT`.

### Production Hosting

Both public domains belong to the `graph-viz` project in the
[CP Initiative Vercel team](https://vercel.com/cpinitiative/graph-viz). Its
production branch is `main`. A project with the same name in a personal Vercel
team does not publish changes to these domains. Confirm the deployment in the CP
Initiative project and run the smoke test against `graph.usaco.guide` with the
expected commit SHA after publishing.

### Private Usage Analytics

The public production site uses Vercel Web Analytics for aggregate, internal
product metrics. Analytics are not rendered in the editor. Preview deployments,
localhost, and `127.0.0.1` do not load the analytics client, keeping team QA out
of adoption numbers.

Tracked custom events are deliberately limited to controlled metadata:

- **Project Started** records one meaningful start per in-memory project
  lifecycle. Restored and imported projects begin in an already-started state so
  a reload or import does not inflate this number.
- **Timeline Created** records the first manually or script-generated timeline
  in that lifecycle.
- **Preset Loaded** records only the preset identifier.
- **Project Imported** records a successful import without its filename or
  contents.
- **Export Completed** records only the format after a successful export.

Graph contents, labels, scripts, filenames, project JSON, and persistent user
identifiers are never included in custom events. Query strings and URL fragments
are removed before page-view or custom-event collection. To disable collection
in a particular browser, set `localStorage['va-disable']` to a non-empty value.

After this code is deployed, a Vercel project administrator must open
**Analytics** for the `graph-viz` project and enable Web Analytics. Page views
and anonymous visitor metrics are available on all plans; custom events require
a plan that supports them. Collection starts when analytics is enabled and
cannot backfill earlier traffic.

GitHub Actions runs validation and browser tests for pull requests and pushes to
`main`. When changing editor behavior, add deterministic unit coverage for state
logic and Playwright coverage for the author-visible workflow.
