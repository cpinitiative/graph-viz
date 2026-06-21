export const VIEWBOX_WIDTH = 2200;
export const VIEWBOX_HEIGHT = 1400;
export const NODE_RADIUS = 22;
export const GRID_SIZE = 28;

export const NODE_STATUS_COLORS = {
  default: { fill: '#ffffff', stroke: '#1b1b1b', text: '#1b1b1b' },
  active: { fill: '#000000', stroke: '#000000', text: '#ffffff' },
  queued: { fill: '#eeeeee', stroke: '#c6c6c6', text: '#1b1b1b' },
  visited: { fill: '#e2e2e2', stroke: '#c6c6c6', text: '#1b1b1b' },
  discarded: { fill: '#ffffff', stroke: '#c6c6c6', text: '#c6c6c6' },
};

export const EDGE_ROUTING = {
  straight: 'straight',
  bezier: 'bezier',
};

export const DEFAULT_GRAPH = {
  nodes: [
    { id: 0, label: '0', x: 520, y: 420, visible: true },
    { id: 1, label: '1', x: 700, y: 360, visible: true },
    { id: 2, label: '2', x: 900, y: 430, visible: true },
    { id: 3, label: '3', x: 780, y: 600, visible: true },
    { id: 4, label: '4', x: 600, y: 620, visible: true },
  ],
  edges: [
    {
      id: 'e0',
      from: 0,
      to: 1,
      color: '#64748B',
      duration: 450,
      directed: false,
      label: '2',
      visible: true,
    },
    {
      id: 'e1',
      from: 1,
      to: 2,
      color: '#64748B',
      duration: 450,
      directed: false,
      label: '4',
      visible: true,
    },
    {
      id: 'e2',
      from: 0,
      to: 3,
      color: '#64748B',
      duration: 450,
      directed: false,
      label: '7',
      visible: true,
    },
    {
      id: 'e3',
      from: 3,
      to: 4,
      color: '#64748B',
      duration: 450,
      directed: false,
      label: '3',
      visible: true,
    },
  ],
};
