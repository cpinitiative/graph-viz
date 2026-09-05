import { forceDirectedLayout } from './graphLayouts.js';

self.onmessage = ({ data }) => {
  try {
    self.postMessage({ graph: forceDirectedLayout(data.graph, data.options) });
  } catch (error) {
    self.postMessage({ error: error.message });
  }
};
