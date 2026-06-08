# Graph Editor Animator - Design & Architecture Document

## 1. Core Philosophy

The Graph Editor Animator is designed as an interactive, keyframe-based
visualizer for algorithmic graph traversals and graph structures. The
fundamental architectural decision relies on separating the **Structural Data
(Base Graph)** from **Temporal State (Animation Keyframes)**.

1. **The Base Graph:** Represents the persistent structural topology of your
   graph across all time states. This involves X/Y coordinates, node/edge IDs,
   structural layout mappings, and inherent labels.
2. **The Timeline (Steps/Keyframes):** Represents the mutable animation state at
   any given point in an algorithm or presentation sequence. Instead of
   duplicating the entire graph per frame, each step contains an `edgeOverrides`
   and `nodeOverrides` mapping. This cleanly governs ephemeral UI states like
   `status`, `color`, or highlights.
3. **Declarative Rendering:** Driven heavily by `framer-motion` integrated
   closely within React. We lean on layout identifiers to magically interpolate
   layout/color interpolations spanning timeline frame changes, providing
   buttery smooth algorithmic step-throughs without heavy D3/Canvas boilerplate.

---

## 2. Functional Architecture

The standalone application is unified under `GraphStudioVisualizer.jsx`. This
acts as the Orchestrator for our four main functional quadrants:

### 2.1 Graph Canvas (`GraphCanvas.jsx`, `GraphNode.jsx`, `GraphEdge.jsx`)

The beating heart of the visualizer.

- **Coordinate System Matrix:** Defines bounds for the viewport and the
  mathematical "World Space". A complex interaction layer exists to seamlessly
  translate screen pointer interactions (X/Y) into panning translations and
  zooming semantics, ensuring mathematical consistency to keep content within
  `clampViewStateToPlayspace`.
- **Interchangeable Interaction Modes:**
  - _Select Mode:_ Click and drag for box selections, multi-selection bounds
    mapping.
  - _Pan Mode:_ Spatial navigation locking editing tools.
  - _Draw Mode:_ Allows algorithmic edge routing creation and dynamic new vertex
    placements on pointer release.
- **Dynamic Edge Routing:** Support for multiple edge tracing paths (Straight
  vs. Bezier/Curved). Features collision insets (`insetSegment`) so large
  strokes mathematically stop before overlapping vertex circular boundaries.
- **Framer Motion Intercepts:** Uses layout IDs and keyframe interpolations to
  smoothly transition radius, `cx/cy` coordinate updates (when triggered by
  layouts), and stroke path updates (`d` attributes on paths).

### 2.2 Core State Engine (`useGraphAnimation.js`)

The data-basing brain of the component.

- **Temporal Diffing:** Implements the aforementioned structural base vs.
  override paradigm. When rendering frame `N`, it dynamically composites the
  `computedGraph` by merging `baseGraph` structurally with
  `steps[N].nodeOverrides` & `steps[N].edgeOverrides`.
- **Normalization:** Robust data pipelines ensure ID hygiene (`createStepId()`,
  `cloneJson()`) guaranteeing every frame step has a valid duration,
  description, and mapping overrides to prevent crash exceptions.
- **Keyframe CRUD Operations:** Exposes unified hooks for `addStep`,
  `updateStep`, `duplicateStep`, `removeStep`, and `moveStep`.

### 2.3 Inspector & Properties (`PropertyPanel.jsx`)

Contextual properties inspector adapting heavily to application state.

- **Entity Contextualizing:** Depending on `multiSelection` arrays vs single
  component `selectedNode` / `selectedEdge`, the visualizer dynamically swaps
  the form fields available.
- **Property Mutations:** Facilitates overriding structural components (changing
  labels, edge directions) or temporal components (modifying active step status,
  node coloring).
- **Global Constraints:** Modifies algorithmic layout seeds like Force
  configuration (force directed strength), stroke widths, and global edge
  curvature rates.

### 2.4 Application Tooling (`LeftSidebar.jsx` & Utils)

Utility and IO operations binding the app features to real-world datasets.

- **Layout Engines:** Bundles execution environments for deterministic spatial
  mapping such as **Tree Layout**, **Circular Layout**, and D3 style
  **Force-Directed Layouts**, directly updating the `baseGraph` coordinate keys
  securely via dispatch diffing.
- **Programmatic Importers:** Exposes Edge List parsers to rapidly load unstyled
  topologies into the engine.
- **Script Tracing (`runScriptTrace`):** An embedded scripting sandbox executing
  context-aware JavaScript (via `api.active()`, `api.queued()`, etc.). This acts
  as a macro layer converting algorithmic logic directly into generated timeline
  Steps (simulating real graph traversals).
- **Exporting pipelines:** Supports video serialization integration via
  `mp4-muxer` natively from the DOM canvas representation.

---

## 3. Data Schema & Persistence

A core design tenet ensures the payload object represents a portable schema
block, natively transmittable JSON.

1. **State Snapshots:** Any timeline traversal generates state diffs mapped
   directly to `undoHistoryRef` allowing native `Cmd/Ctrl+Z` recovery mechanics
   with deep clone restoration up to 120 previous structural mutations.
2. **Payload Export Model:** By separating the `baseGraph` from `steps`, you
   minimize storage size heavily, which ensures graph visualizers can handle
   dense 200+ edge structures evolving across hundreds of frames without
   exponential memory inflation.
