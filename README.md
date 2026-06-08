# Graph Visualizer

Interactive graph algorithm visualizer for creating, editing, and animating
graph traversals. Part of the USACO Guide website.

## Features

- **Interactive Graph Canvas**: Create and edit graphs with drag-and-drop nodes
  and edges
- **Algorithm Animation**: Step-by-step visualization of graph algorithms (BFS,
  DFS, etc.)
- **Multiple Layouts**: Force-directed, tree, and circular layouts
- **Video Export**: Export animations as MP4 videos
- **Script Tracing**: Execute custom JavaScript to generate algorithmic steps

## Development

```bash
npm install
npm run dev
```

## Commands

```bash
npm run dev
npm run check
npm run test:e2e
npm run test:e2e:headed
npm run test:e2e:ui
npm run check:e2e
PLAYWRIGHT_BASE_URL=https://graph-viz.usaco.guide npm run test:e2e
```

## Build

```bash
npm run build
```

## CI

GitHub Actions runs CI checks and E2E tests on pull requests and pushes to
`main`.
