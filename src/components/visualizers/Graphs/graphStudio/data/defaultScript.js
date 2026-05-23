export const DEFAULT_SCRIPT = `// Use api.graph (base graph), then call helper events.
// Example BFS-style trace:
api.active(0);
api.queued(1);
api.push({ type: 'edge', id: 'e0', color: '#f59e0b', description: 'Explore e0' });
api.visited(1);
`;
