"use client";

import { useState, useEffect } from "react";
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
  const [isMobile, setIsMobile] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showPropertyPanel, setShowPropertyPanel] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  if (isMobile) {
    return (
      <div className="h-full min-h-0 bg-surface font-inter text-on-surface flex flex-col">
        {/* Mobile Header with Toggle Buttons */}
        <div className="flex items-center justify-between p-3 bg-surface-container-low border-b border-outline-variant/20 dark:bg-dark-surface-container-low dark:border-dark-outline-variant/20">
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="p-2 rounded-md bg-surface-container hover:bg-surface-container-high transition-colors dark:bg-dark-surface-container dark:hover:bg-dark-surface-container-high"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <span className="text-sm font-semibold text-on-surface dark:text-dark-on-surface">
            Graph Studio
          </span>
          <button
            onClick={() => setShowPropertyPanel(!showPropertyPanel)}
            className="p-2 rounded-md bg-surface-container hover:bg-surface-container-high transition-colors dark:bg-dark-surface-container dark:hover:bg-dark-surface-container-high"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </div>

        {/* Mobile Sidebar Overlay */}
        {showSidebar && (
          <div
            className="fixed inset-0 z-50 bg-black/50"
            onClick={() => setShowSidebar(false)}
          >
            <div
              className="absolute left-0 top-0 bottom-0 w-80 max-w-[85vw] bg-surface-container-low overflow-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <LeftSidebar {...sidebar} />
            </div>
          </div>
        )}

        {/* Mobile Property Panel Overlay */}
        {showPropertyPanel && (
          <div
            className="fixed inset-0 z-50 bg-black/50"
            onClick={() => setShowPropertyPanel(false)}
          >
            <div
              className="absolute right-0 top-0 bottom-0 w-80 max-w-[85vw] bg-surface-container-low overflow-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <PropertyPanel {...property} />
            </div>
          </div>
        )}

        {/* Main Canvas Area */}
        <div className="flex-1 min-h-0 relative">
          <motion.div
            className="relative h-full"
            layoutId="graphstudio-main-canvas"
          >
            <GraphCanvas {...canvas} />
            <div className="absolute left-3 bottom-3 z-20 px-2 py-1 rounded bg-surface-container-low/90 text-[11px] text-on-surface">
              {status}
            </div>
          </motion.div>
        </div>

        {/* Mobile Timeline */}
        <div className="h-48 min-h-[192px] border-t border-outline-variant/20 dark:border-dark-outline-variant/20">
          <TimelinePanel {...timeline} />
        </div>

        {/* Modals */}
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
  }

  return (
    <div className="h-full min-h-0 bg-surface font-inter text-on-surface">
      <PanelGroup orientation="vertical" className="h-full">
        <Panel defaultSize="76%" minSize="52%">
          <PanelGroup orientation="horizontal" className="h-full">
            <Panel defaultSize="18%" minSize="14%">
              <LeftSidebar {...sidebar} />
            </Panel>
            <PanelResizeHandle className="w-1 bg-outline-variant/30 hover:bg-primary/50 dark:bg-slate-800 dark:hover:bg-primary/50 transition-colors graphstudio-resize" />
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
            <PanelResizeHandle className="w-1 bg-outline-variant/30 hover:bg-primary/50 dark:bg-slate-800 dark:hover:bg-primary/50 transition-colors graphstudio-resize" />
            <Panel defaultSize="22%" minSize="16%">
              <PropertyPanel {...property} />
            </Panel>
          </PanelGroup>
        </Panel>
        <PanelResizeHandle className="h-1 bg-outline-variant/30 hover:bg-primary/50 dark:bg-slate-800 dark:hover:bg-primary/50 transition-colors graphstudio-resize-horizontal" />
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
