import GraphCanvas from './GraphCanvas';
import { resolveStepCaptionEnabled } from './lib/captionOverlay';
import {
  EXPORT_CAPTURE_SVG_ELEMENT_ID,
  SLIDE_EXPORT_HEIGHT,
  SLIDE_EXPORT_WIDTH,
} from './lib/timelineFrameCapture';

const EMPTY_DIFF = {
  changedNodes: new Set(),
  changedEdges: new Set(),
};
const EMPTY_SELECTION = new Set();
const noop = () => {};

const ExportFrameRenderer = ({
  frameIndex,
  captureToken,
  graph,
  step,
  canvas,
}) => {
  if (!graph) return null;

  const baseCaptionOverlay =
    canvas?.baseCaptionOverlay ?? canvas?.captionOverlay;
  const captionOverlay = {
    ...(baseCaptionOverlay ?? {}),
    enabled: resolveStepCaptionEnabled(step, baseCaptionOverlay),
  };

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed left-[-10000px] top-0 overflow-hidden opacity-0"
      data-export-capture-frame={frameIndex}
      data-export-capture-token={captureToken}
      data-testid="export-capture-surface"
      style={{
        width: SLIDE_EXPORT_WIDTH,
        height: SLIDE_EXPORT_HEIGHT,
      }}
    >
      <GraphCanvas
        graph={graph}
        diff={EMPTY_DIFF}
        selectedObject={null}
        selectedNodeIds={EMPTY_SELECTION}
        drawFrom={null}
        mode="select"
        viewState={canvas?.viewState ?? { x: 0, y: 0, zoom: 1 }}
        setViewState={noop}
        showGrid={false}
        captionOverlay={captionOverlay}
        captionText={step?.description ?? ''}
        setCaptionOverlay={noop}
        customLegend={canvas?.customLegend}
        setCustomLegend={noop}
        snapEnabled={false}
        lockCanvas
        edgeRouting={canvas?.edgeRouting}
        edgeCurvature={canvas?.edgeCurvature}
        nodeRadius={canvas?.nodeRadius}
        edgeWidth={canvas?.edgeWidth}
        nodeLabelFontSize={canvas?.nodeLabelFontSize}
        edgeLabelFontSize={canvas?.edgeLabelFontSize}
        themeOverride={canvas?.theme}
        svgElementId={EXPORT_CAPTURE_SVG_ELEMENT_ID}
        svgTestId={null}
        svgResourcePrefix="export-capture"
        layoutIdPrefix="export-capture-"
        exportFrameIndex={frameIndex}
        exportCaptureToken={captureToken}
        canvasSizeOverride={{
          width: SLIDE_EXPORT_WIDTH,
          height: SLIDE_EXPORT_HEIGHT,
        }}
        onSelectNode={noop}
        onSelectEdge={noop}
        onSelectNodes={noop}
        onBackgroundClear={noop}
        onNodePointerDown={noop}
        onNodeMove={noop}
        onNodePointerUp={noop}
        onNodeClickForDraw={noop}
        onCanvasAddNode={noop}
        isExporting
      />
    </div>
  );
};

export default ExportFrameRenderer;
