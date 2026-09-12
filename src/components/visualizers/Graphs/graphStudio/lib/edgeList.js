import { NODE_RADIUS, VIEWBOX_HEIGHT, VIEWBOX_WIDTH } from '../constants.js';
import { clamp } from './graphGeometry.js';
import {
  PROJECT_LIMITS,
  requireLimit,
  requireTextBudget,
} from './projectLimits.js';

const WEIGHT_PATTERN = /^-?(?:\d+|\d+\.\d+|\.\d+)$/;

// The default remains the numeric, zero-based format used by Edge List export.
export const parseEdgeListText = (
  text,
  { indexBase = 0, edgeValues = 'weight' } = {}
) => {
  if (![0, 1].includes(indexBase))
    throw new Error('Choose zero-based or one-based vertex IDs.');
  if (!['weight', 'label'].includes(edgeValues))
    throw new Error('Choose numeric weights or text labels.');
  requireTextBudget(String(text ?? ''), 'Edge list');
  const source = String(text ?? '').trim();
  if (!source)
    throw new Error('Paste an edge list with header "n m" before importing.');
  const lines = source
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);
  const parseInteger = (token, label) => {
    if (!/^-?(0|[1-9]\d*)$/.test(token))
      throw new Error(`${label} must be an integer.`);
    const value = Number(token);
    if (!Number.isSafeInteger(value)) throw new Error(`${label} is too large.`);
    return value;
  };
  const header = lines[0].split(/\s+/);
  if (header.length !== 2)
    throw new Error('Header must be exactly two integers: n m.');
  const n = parseInteger(header[0], 'Header n');
  const m = parseInteger(header[1], 'Header m');
  if (n < 1) throw new Error('Header n must be at least 1.');
  if (m < 0) throw new Error('Header m must be at least 0.');
  requireLimit(n, PROJECT_LIMITS.nodes, 'Node count');
  requireLimit(m, PROJECT_LIMITS.edges, 'Edge count');
  if (lines.length - 1 !== m)
    throw new Error(
      `Header declares ${m} edge rows but found ${lines.length - 1}.`
    );
  const parseNodeId = (token, lineNumber) => {
    const value = parseInteger(token, `Line ${lineNumber} node id`);
    if (value < indexBase || value >= n + indexBase) {
      throw new Error(
        `Line ${lineNumber} node id ${value} is out of range ${indexBase}..${n - 1 + indexBase}.`
      );
    }
    return value;
  };
  const parsedEdges = lines.slice(1).map((line, index) => {
    const lineNumber = index + 2;
    const parts = line.split(/\s+/);
    if (parts.length < 2 || (edgeValues === 'weight' && parts.length > 3)) {
      throw new Error(
        `Line ${lineNumber} must be "u v" or "u v ${edgeValues === 'weight' ? 'weight' : 'label'}".`
      );
    }
    const from = parseNodeId(parts[0], lineNumber);
    const to = parseNodeId(parts[1], lineNumber);
    const label = parts.slice(2).join(' ');
    if (
      edgeValues === 'weight' &&
      label &&
      (!WEIGHT_PATTERN.test(label) || !Number.isFinite(Number(label)))
    ) {
      throw new Error(
        `Line ${lineNumber} weight must be numeric. Choose Text labels to import letters or words.`
      );
    }
    requireLimit(
      label.length,
      PROJECT_LIMITS.label,
      `Line ${lineNumber} edge label length`
    );
    return { from, to, label };
  });
  const radius = Math.max(180, Math.min(VIEWBOX_WIDTH, VIEWBOX_HEIGHT) / 2.8);
  const nodes = Array.from({ length: n }, (_, index) => {
    const nodeId = index + indexBase;
    const angle = (index / n) * Math.PI * 2;
    const x = VIEWBOX_WIDTH / 2 + (n === 1 ? 0 : Math.cos(angle) * radius);
    const y = VIEWBOX_HEIGHT / 2 + (n === 1 ? 0 : Math.sin(angle) * radius);
    return {
      id: nodeId,
      label: String(nodeId),
      annotationPlacement: 'below',
      x: clamp(x, NODE_RADIUS + 8, VIEWBOX_WIDTH - NODE_RADIUS - 8),
      y: clamp(y, NODE_RADIUS + 8, VIEWBOX_HEIGHT - NODE_RADIUS - 8),
      visible: true,
    };
  });
  const edges = parsedEdges.map((edge, index) => ({
    id: `e${index}`,
    ...edge,
    directed: false,
    color: '#64748b',
    duration: 450,
    visible: true,
    animationVersion: 0,
  }));
  return {
    graph: { nodes, edges },
    meta: `${nodes.length} nodes / ${edges.length} edges`,
  };
};

// Compatibility format: zero-based IDs, numeric weights, no styling/direction.
// Project JSON preserves string labels and the original vertex IDs.
export const exportEdgeListText = graph => {
  const nodes = graph?.nodes ?? [];
  const edges = graph?.edges ?? [];
  const nodeIndexById = new Map(
    nodes.map((node, index) => [String(node.id), index])
  );
  const rows = edges.flatMap(edge => {
    const from = nodeIndexById.get(String(edge.from));
    const to = nodeIndexById.get(String(edge.to));
    if (!Number.isInteger(from) || !Number.isInteger(to)) return [];
    const label = String(edge.label ?? '').trim();
    const weight =
      WEIGHT_PATTERN.test(label) && Number.isFinite(Number(label))
        ? ` ${label}`
        : '';
    return [`${from} ${to}${weight}`];
  });
  return [`${nodes.length} ${rows.length}`, ...rows].join('\n');
};
