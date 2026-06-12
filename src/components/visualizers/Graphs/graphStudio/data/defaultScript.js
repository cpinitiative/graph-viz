import { GRAPH_STATE_COLORS } from '../lib/stateColors';

export const DEFAULT_SCRIPT = `// Use api.graph (base graph), then call helper events.
// Example BFS-style trace:
api.active(0);
api.queued(1);
api.push({ type: 'edge', id: 'e0', color: '${GRAPH_STATE_COLORS.edgeHighlighted}', description: 'Explore e0' });
api.visited(1);
`;
