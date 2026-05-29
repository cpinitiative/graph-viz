"use client";

import { motion } from "framer-motion";
import {
  Panel,
  Group as PanelGroup,
  Separator as PanelResizeHandle,
} from "react-resizable-panels";
import LeftSidebar from "./LeftSidebar";
import GraphCanvas from "./GraphCanvas";
import TimelinePanel from "./TimelinePanel";
import PropertyPanel from "./PropertyPanel";
import ParserModal from "./modals/ParserModal";
import ScriptModal from "./modals/ScriptModal";
import ExportVideoModal from "./modals/ExportVideoModal";
import { DEFAULT_SCRIPT } from "./data/defaultScript";

const GraphStudioLayout = ({
  sidebar,
  canvas,
  property,
  timeline,
  modals,
  status,
}) => {
  return (
    <div className="h-full min-h-0 bg-surface font-inter text-on-surface">
      <PanelGroup orientation="vertical" className="h-full">
        <Panel defaultSize="76%" minSize="52%">
          <PanelGroup orientation="horizontal" className="h-full">
            <Panel defaultSize="18%" minSize="14%">
              <LeftSidebar {...sidebar} />
            </Panel>
            <PanelResizeHandle className="graphstudio-resize" />
            <Panel minSize="40%" defaultSize="60%">
              <motion.div
                className="relative h-full"
                layoutId="graphstudio-main-canvas"
              >
                <GraphCanvas {...canvas} />
                <div className="absolute left-3 bottom-3 z-20 px-2 py-1 rounded bg-surface-container-low/90 text-[11px] text-on-surface">
                  {status}
                </div>
              </motion.div>
            </Panel>
            <PanelResizeHandle className="graphstudio-resize" />
            <Panel defaultSize="22%" minSize="16%">
              <PropertyPanel {...property} />
            </Panel>
          </PanelGroup>
        </Panel>
        <PanelResizeHandle className="graphstudio-resize-horizontal" />
        <Panel defaultSize="24%" minSize="14%">
          <TimelinePanel {...timeline} />
        </Panel>
      </PanelGroup>
      <ParserModal
        open={modals.parser.open}
        text={modals.parser.text}
        onTextChange={modals.parser.onTextChange}
        onClose={modals.parser.onClose}
        onSubmit={modals.parser.onSubmit}
      />
      <ScriptModal
        open={modals.script.open}
        text={modals.script.text}
        onTextChange={modals.script.onTextChange}
        onClose={modals.script.onClose}
        onSubmit={modals.script.onSubmit}
        defaultScript={DEFAULT_SCRIPT}
      />
      <ExportVideoModal
        open={modals.exportVideo.open}
        labelPos={modals.exportVideo.labelPos}
        onLabelPosChange={modals.exportVideo.onLabelPosChange}
        onClose={modals.exportVideo.onClose}
        onExport={modals.exportVideo.onExport}
      />
    </div>
  );
};

export default GraphStudioLayout;
