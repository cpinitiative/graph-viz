'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import {
  Panel,
  Group as PanelGroup,
  Separator as PanelResizeHandle,
} from 'react-resizable-panels';
import GraphCanvas from './GraphCanvas';
import LeftSidebar from './LeftSidebar';
import PropertyPanel from './PropertyPanel';
import TimelinePanel from './TimelinePanel';
import { DEFAULT_SCRIPT } from './data/defaultScript';
import ExportModal from './modals/ExportModal';
import ExportVideoModal from './modals/ExportVideoModal';
import ImportModal from './modals/ImportModal';
import LegendModal from './modals/LegendModal';
import ParserModal from './modals/ParserModal';
import ProjectJsonPasteModal from './modals/ProjectJsonPasteModal';
import ScriptModal from './modals/ScriptModal';

const PANEL_TOGGLE_CLASS =
  'rounded-md bg-surface-container p-2 transition-colors hover:bg-surface-container-high dark:bg-dark-surface-container dark:hover:bg-dark-surface-container-high';
const RESIZE_HANDLE_CLASS =
  'graphstudio-resize w-1 bg-outline-variant/30 transition-colors hover:bg-primary/50 dark:bg-slate-800 dark:hover:bg-primary/50';
const STATUS_ERROR_PATTERN = /\b(error|failed|failure|invalid|unsupported)\b/i;
const STATUS_SUCCESS_PATTERN =
  /\b(parsed|imported|exported|generated|copied|loaded|added|deleted|applied|complete|success)\b/i;

const getStatusClassName = status => {
  const tone = STATUS_ERROR_PATTERN.test(status)
    ? 'error'
    : STATUS_SUCCESS_PATTERN.test(status)
      ? 'success'
      : 'neutral';
  const toneClass =
    tone === 'error'
      ? 'border-[#FCA5A5] bg-[#FEE2E2] text-[#7F1D1D] dark:border-[#F87171] dark:bg-[#450A0A] dark:text-[#FEE2E2]'
      : tone === 'success'
        ? 'border-[#A7F3D0] bg-[#ECFDF5] text-[#065F46] dark:border-[#34D399] dark:bg-[#052E16] dark:text-[#D1FAE5]'
        : 'border-[#D7DEE8] bg-[#F8F9FA] text-[#334155] dark:border-[#475569] dark:bg-[#1E293B] dark:text-[#E2E8F0]';
  return `pointer-events-none absolute bottom-3 left-3 right-3 z-20 rounded-sm border px-2 py-1 text-[11px] leading-snug shadow-sm break-words ${toneClass}`;
};

const MenuIcon = () => (
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
);

const SettingsIcon = () => (
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
);

const MobileHeaderButton = ({ label, onClick, testId, children }) => (
  <button
    type="button"
    aria-label={label}
    data-testid={testId}
    onClick={onClick}
    className={PANEL_TOGGLE_CLASS}
  >
    {children}
  </button>
);

const CloseIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const MobileOverlay = ({ side, closeLabel, onClose, children }) => {
  const sideClass = side === 'left' ? 'left-0' : 'right-0';

  return (
    <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose}>
      <div
        className={`absolute bottom-0 top-0 w-80 max-w-[85vw] overflow-auto bg-surface-container-low ${sideClass}`}
        onClick={event => event.stopPropagation()}
      >
        <button
          type="button"
          aria-label={closeLabel}
          onClick={onClose}
          className={`${PANEL_TOGGLE_CLASS} absolute right-3 top-3 z-10`}
        >
          <CloseIcon />
        </button>
        {children}
      </div>
    </div>
  );
};

const CanvasStage = ({ canvas, status }) => (
  <motion.div className="relative h-full" layoutId="graphstudio-main-canvas">
    <GraphCanvas {...canvas} />
    {status && (
      <div
        className={getStatusClassName(status)}
        data-testid="graph-studio-status"
        data-status-tone={
          STATUS_ERROR_PATTERN.test(status)
            ? 'error'
            : STATUS_SUCCESS_PATTERN.test(status)
              ? 'success'
              : 'neutral'
        }
        role="status"
        aria-live="polite"
      >
        {status}
      </div>
    )}
  </motion.div>
);

const ModalStack = ({
  modals,
  sidebar,
  canvas,
  isImportMenuOpen,
  isExportMenuOpen,
  onCloseImportMenu,
  onCloseExportMenu,
}) => (
  <>
    <ImportModal
      open={isImportMenuOpen}
      onClose={onCloseImportMenu}
      onOpenParser={sidebar.onOpenParser}
      onImportProjectFile={sidebar.onImportProjectFile}
      onOpenProjectJsonPaste={sidebar.onOpenProjectJsonPaste}
    />
    <ExportModal
      open={isExportMenuOpen}
      onClose={onCloseExportMenu}
      onExportText={sidebar.onExportText}
      onExportProject={sidebar.onExportProject}
      onExportSvg={sidebar.onExportSvg}
      onExportPng={sidebar.onExportPng}
      pngScale={sidebar.pngScale}
      onPngScaleChange={sidebar.onPngScaleChange}
      imageFraming={sidebar.imageFraming}
      onImageFramingChange={sidebar.onImageFramingChange}
      onExportVideo={sidebar.onExportVideo}
      onExportSlideshow={sidebar.onExportSlideshow}
      exportFrameRange={sidebar.exportFrameRange}
      onExportFrameRangeChange={sidebar.onExportFrameRangeChange}
      totalFrames={sidebar.totalFrames}
      currentFrame={sidebar.currentFrame}
      steps={sidebar.steps}
      getFrameGraph={sidebar.getFrameGraph}
      previewCanvas={canvas}
    />
    <ParserModal
      open={modals.parser.open}
      text={modals.parser.text}
      error={modals.parser.error}
      onTextChange={modals.parser.onTextChange}
      onClose={modals.parser.onClose}
      onSubmit={modals.parser.onSubmit}
    />
    <ProjectJsonPasteModal
      open={modals.projectJsonPaste.open}
      text={modals.projectJsonPaste.text}
      error={modals.projectJsonPaste.error}
      onTextChange={modals.projectJsonPaste.onTextChange}
      onClose={modals.projectJsonPaste.onClose}
      onSubmit={modals.projectJsonPaste.onSubmit}
    />
    <ScriptModal
      open={modals.script.open}
      text={modals.script.text}
      onTextChange={modals.script.onTextChange}
      onClose={modals.script.onClose}
      onSubmit={modals.script.onSubmit}
      defaultScript={DEFAULT_SCRIPT}
      error={modals.script.error}
      isRunning={modals.script.isRunning}
    />
    <ExportVideoModal
      open={modals.exportVideo.open}
      onClose={modals.exportVideo.onClose}
      onExport={modals.exportVideo.onExport}
    />
    <LegendModal
      open={modals.legend.open}
      customLegend={modals.legend.customLegend}
      setCustomLegend={modals.legend.setCustomLegend}
      onClose={modals.legend.onClose}
    />
  </>
);

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
  const [isImportMenuOpen, setIsImportMenuOpen] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const sidebarProps = {
    ...sidebar,
    onOpenImportMenu: () => setIsImportMenuOpen(true),
    onOpenExportMenu: () => setIsExportMenuOpen(true),
  };
  const modalStackProps = {
    modals,
    sidebar,
    canvas,
    isImportMenuOpen,
    isExportMenuOpen,
    onCloseImportMenu: () => setIsImportMenuOpen(false),
    onCloseExportMenu: () => setIsExportMenuOpen(false),
  };

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (isMobile) {
    return (
      <div className="flex h-full min-h-0 flex-col bg-surface font-inter text-on-surface">
        {/* Mobile Header with Toggle Buttons */}
        <div className="flex items-center justify-between border-b border-outline-variant/20 bg-surface-container-low p-3 dark:border-dark-outline-variant/20 dark:bg-dark-surface-container-low">
          <MobileHeaderButton
            label={showSidebar ? 'Close tools panel' : 'Open tools panel'}
            testId="mobile-tools-toggle"
            onClick={() => setShowSidebar(!showSidebar)}
          >
            <MenuIcon />
          </MobileHeaderButton>
          <span className="text-sm font-semibold text-on-surface dark:text-dark-on-surface">
            Graph Studio
          </span>
          <MobileHeaderButton
            label={
              showPropertyPanel
                ? 'Close inspector panel'
                : 'Open inspector panel'
            }
            testId="mobile-properties-toggle"
            onClick={() => setShowPropertyPanel(!showPropertyPanel)}
          >
            <SettingsIcon />
          </MobileHeaderButton>
        </div>

        {showSidebar && (
          <MobileOverlay
            side="left"
            closeLabel="Dismiss tools overlay"
            onClose={() => setShowSidebar(false)}
          >
            <LeftSidebar {...sidebarProps} />
          </MobileOverlay>
        )}

        {showPropertyPanel && (
          <MobileOverlay
            side="right"
            closeLabel="Dismiss inspector overlay"
            onClose={() => setShowPropertyPanel(false)}
          >
            <PropertyPanel {...property} />
          </MobileOverlay>
        )}

        <div className="relative min-h-0 flex-1">
          <CanvasStage canvas={canvas} status={status} />
        </div>

        <div className="min-h-[260px] flex-none border-t border-outline-variant/20 dark:border-dark-outline-variant/20">
          <TimelinePanel {...timeline} />
        </div>

        <ModalStack {...modalStackProps} />
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 bg-surface font-inter text-on-surface">
      <PanelGroup orientation="vertical" className="h-full min-h-0">
        <Panel minSize="360px" className="min-h-0">
          <PanelGroup orientation="horizontal" className="h-full min-h-0">
            <Panel defaultSize="18%" minSize="14%">
              <LeftSidebar {...sidebarProps} />
            </Panel>
            <PanelResizeHandle className={RESIZE_HANDLE_CLASS} />
            <Panel minSize="40%" defaultSize="60%">
              <CanvasStage canvas={canvas} status={status} />
            </Panel>
            <PanelResizeHandle className={RESIZE_HANDLE_CLASS} />
            <Panel defaultSize="22%" minSize="16%">
              <PropertyPanel {...property} />
            </Panel>
          </PanelGroup>
        </Panel>
        <PanelResizeHandle className="graphstudio-resize-horizontal h-1 bg-outline-variant/30 transition-colors hover:bg-primary/50 dark:bg-slate-800 dark:hover:bg-primary/50" />
        <Panel
          defaultSize="216px"
          minSize="208px"
          maxSize="320px"
          className="min-h-0"
        >
          <TimelinePanel {...timeline} />
        </Panel>
      </PanelGroup>
      <ModalStack {...modalStackProps} />
    </div>
  );
};

export default GraphStudioLayout;
