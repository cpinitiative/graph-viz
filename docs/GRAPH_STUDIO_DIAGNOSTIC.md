# Graph Studio audit and implementation report

Updated September 4, 2026. Reviewed local source based on commit
`7418661eee9f240e22a5b2ad1a8f5249347ec66d`, then implemented the changes below
in the working tree. This report supersedes the July deployment diagnostic. It
describes the local application; production deployment and HTTP headers were not
verified.

The audit reproduced an import crash, missing keyboard graph operations,
inconsistent status colors, dialog focus escape, fragmented drag undo, and loss
of work on reload. The application now rejects malformed visual data, provides
keyboard graph editing and dialog focus management, uses consistent node state
cues, saves a local draft, and groups drag undo by gesture.

## Preset and export follow-up — September 5, 2026

All nine presets now include deliberate layouts, compact legends, 18 px node and
edge text, enabled captions, and 1.8–3 second frame holds. The animations show
intermediate traversal/selection steps and correct final results. Dijkstra
distances, topological indegrees, and component/root IDs use validated per-frame
annotations; project-wide node labels retain their existing meaning. The DSU
cycle edge clears the intermediate node, and the multigraph example no longer
claims an unweighted edge is optimal.

Fitting now reserves caption/legend space. Replacing a preset resets node motion
identity before measuring, preventing stale geometry from shrinking or shifting
the new graph. Status messages occupy their own row outside the canvas.

Image export defaults to the reviewed editor view. Capture retains the source
canvas dimensions and scales the whole composition once, preserving relative
graph, legend, and caption size. Video/slides use the same reviewed composition
inside 16:9 with a dedicated preview option and clipping at the original canvas
boundary. Timeline exports no longer refit each frame independently. Explicit
Fit graph and Slide 16:9 modes remain available for image reframing.

Validation: 86 unit tests pass. The 51-test browser run passed 50 tests and
identified a mobile resize defect; after correcting it, all five focused sizing,
preset visibility, and export-fidelity checks passed, including that mobile
test. Formatting, lint, and production build pass. Coverage includes preset
algorithm invariants, annotation round trips, all-preset visibility, and
editor/preview/SVG fidelity. Canvas measurements now use layout dimensions, so
temporary layout animation transforms cannot leave captions or fitting at the
old viewport size. Local screenshot artifacts are in
`qa-screenshots/presets-2026-09-04` (the review began September 4). The
remaining dependency and broader accessibility limitations below still apply.

## Findings and implemented changes

| Finding                                                              | Current behavior                                                                                                                                                                                                        | Status                                                                 |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Malformed imported colors could blank the application                | Shared validation checks base properties and temporal patches before replacement. Invalid imports preserve the current graph. Inspector color entry handles partial hex input, and an error boundary provides recovery. | Fixed for reproduced inputs                                            |
| Graph objects were pointer-only                                      | Nodes and edges expose names, state, selection, and keyboard focus. Arrows explore objects; Enter/Space selects; Alt + arrows moves nodes. Keyboard creation and connection are supported.                              | Implemented; real screen-reader verification remains                   |
| Default legend disagreed with rendered node states                   | Nodes and default legend share one palette. Active thickness and queued/visited/discarded dash patterns provide additional state cues.                                                                                  | Fixed                                                                  |
| Custom node fills could hide labels                                  | Node labels choose black or white from fill luminance, including exported SVG content. Supported colors are hex or default.                                                                                             | Fixed for node label contrast                                          |
| Dialogs let focus escape and controls lacked names                   | Shared portal dialogs trap focus, make background content inert, and restore focus. Script and inspector controls have labels.                                                                                          | Fixed in tested Chromium flows                                         |
| Imports and script output had insufficient bounds                    | Limits apply to text size, graph counts, frames, overrides, IDs, coordinates, descriptions, and visual values. Script output has event and serialized-size budgets.                                                     | Bounded; maximum-size memory profiling remains                         |
| Dragging produced many undo entries and cloned history repeatedly    | Pointer and range gestures become transactions. History shares immutable snapshots and uses reference signatures.                                                                                                       | Fixed in tested drag flow                                              |
| Reload discarded the current project                                 | Debounced device-local draft saving restores project, timeline, settings, and view. Storage failures are shown with an export recovery instruction.                                                                     | Implemented; browser quota still applies                               |
| Edge-list exports used incompatible raw IDs                          | IDs remap to consecutive integers; unsupported weights produce an error. Full project JSON preserves richer graph semantics.                                                                                            | Fixed for supported edge-list format                                   |
| Force layout blocked the UI thread                                   | A dedicated worker supports cancellation, timeout, and stale-result cleanup.                                                                                                                                            | UI blocking addressed; algorithm remains quadratic                     |
| Small screens left little canvas space                               | Mobile users can hide the timeline with Focus canvas. Canvas help occupies its own space on narrow screens. The application uses dynamic viewport height.                                                               | Improved                                                               |
| Script Mode was described as sandboxed                               | UI and docs explicitly describe trusted JavaScript with network/storage access. Closing the dialog terminates execution.                                                                                                | Trust boundary clarified, not isolated                                 |
| Export work eagerly resolved all frames and queued too much encoding | Frames resolve on demand from an immutable session. Video encoding periodically flushes and yields; video duration is bounded. Progress and cancellation controls are available. MP4 muxer loads lazily.                | Improved; final serialization and pending flush can delay cancellation |
| Dependency advisories and startup bundle size                        | Compatible dependency updates removed the development-tool advisories. Two high npm entries remain through PPTX image parsing. Optional MP4 code is split out.                                                          | Partially resolved                                                     |

Reduced-motion preferences are now honored by the animation provider and CSS.
Timeline frame buttons use a roving tab stop. Dark/light themes and mobile
layout received visual review, with final fixes for draft-status contrast and
canvas-help overlap.

## Validation

- 74 unit tests passed, including malformed visual-property and project-limit
  regressions; existing project JSON metadata round trips remain covered.
- 48 Playwright tests passed across desktop, mobile, and local build smoke
  projects. New regressions cover atomic import rejection, dialog focus
  containment/restoration, keyboard graph operations, drag undo, draft reload,
  status/contrast consistency, and cancelling a 1,000-node force layout.
- After the final visual layout adjustments, all 11 focused mobile, export, and
  audit regression browser tests passed again.
- Formatting, ESLint, and production build passed using Node 20.19.0.
- Local Chromium screenshots reviewed at 1440 × 1000 in both themes, at 390 ×
  844, and at 720 × 500. Export preview was also inspected. No browser
  exceptions were recorded in the visual probe.
- `npm audit --json` now reports 2 high affected-package entries, down from 11
  entries (7 high, 1 moderate, 3 low) before compatible updates.

Local visual artifacts are in
[`qa-screenshots/implementation-2026-09-04`](../qa-screenshots/implementation-2026-09-04/).
The initial diagnostic captures remain in
[`qa-screenshots/audit-2026-09-04`](../qa-screenshots/audit-2026-09-04/). These
directories are ignored by Git and are local review evidence.

## Remaining limitations and follow-up

**PPTX dependency advisories.** `pptxgenjs` 4.0.1 depends on `image-size` 1.2.1.
The registry reports denial-of-service issues in malformed
[ICNS](https://github.com/advisories/GHSA-w3rx-r6r6-pgpr) and
[JXL/HEIF](https://github.com/advisories/GHSA-5p2g-fcmc-qvqq) parsing. Current
slideshow export supplies internally generated PNGs; this review found no
untrusted-image route to those parsers. That reachability assessment does not
remove the advisories. npm proposes a breaking downgrade to PptxGenJS 1.1.5;
that downgrade was not applied. A supported dependency resolution remains open.

**Large-project performance.** The minified entry is approximately 550 kB (165
kB gzip), with separate PPTX and MP4 muxer chunks. Vite still reports its 500 kB
chunk warning. Force computation still has quadratic complexity inside the
worker; SVG rendering, autosave serialization, and large exports need measured
memory/latency budgets. The editor does not virtualize graph objects. Limits
constrain input size but do not guarantee smooth operation at all maxima.

**Storage and execution.** A local draft is a recovery aid with browser quota
limits, not a synchronized backup. Multiple tabs can overwrite the single draft.
Script Mode runs trusted code with worker capabilities; it is not a hostile-code
sandbox. Export cancellation is cooperative; PptxGenJS final serialization and
pending codec flushes can delay cancellation.

**Accessibility acceptance.** Keyboard and visual improvements do not constitute
full WCAG or assistive-technology certification. Real screen readers, Firefox,
Safari, grayscale comprehension, arbitrary custom edge/legend colors, long-label
layouts, and maximum-scale projects still require dedicated review. Relevant
acceptance references are [WCAG 2.2](https://www.w3.org/TR/WCAG22/) and the
[WAI modal dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/).
