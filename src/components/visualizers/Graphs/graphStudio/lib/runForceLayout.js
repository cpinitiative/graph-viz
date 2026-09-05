export const runForceLayout = (graph, options, signal) =>
  new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL('./graphLayoutWorker.js', import.meta.url),
      { type: 'module' }
    );
    let settled = false;
    const finish = (error, result) => {
      if (settled) return;
      settled = true;
      worker.terminate();
      clearTimeout(timer);
      signal?.removeEventListener('abort', cancel);
      if (error) reject(error);
      else resolve(result);
    };
    const cancel = () =>
      finish(new DOMException('Layout cancelled', 'AbortError'));
    const timer = setTimeout(
      () => finish(new Error('Layout took too long. Try a smaller graph.')),
      30000
    );
    signal?.addEventListener('abort', cancel, { once: true });
    if (signal?.aborted) {
      cancel();
      return;
    }
    worker.onmessage = ({ data }) =>
      finish(data.error ? new Error(data.error) : null, data.graph);
    worker.onerror = event =>
      finish(new Error(event.message || 'Layout failed'));
    worker.postMessage({ graph, options });
  });
