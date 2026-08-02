'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import {
  Panel,
  Group as PanelGroup,
  Separator as PanelResizeHandle,
} from 'react-resizable-panels';
import ExportFrameRenderer from './ExportFrameRenderer';
import GraphCanvas from './GraphCanvas';
import LeftSidebar from './LeftSidebar';
import PropertyPanel from './PropertyPanel';
import TimelinePanel from './TimelinePanel';
import { DEFAULT_SCRIPT } from './data/defaultScript';
import ExportModal from './modals/ExportModal';
import ExportVideoModal from './modals/ExportVideoModal';
import ImportModal from './modals/ImportModal';
import LegendModal from './modals/LegendModal';
import LocalDraftRecoveryModal from './modals/LocalDraftRecoveryModal';
import ParserModal from './modals/ParserModal';
import ProjectJsonPasteModal from './modals/ProjectJsonPasteModal';
import ScriptModal from './modals/ScriptModal';

const PANEL_TOGGLE_CLASS =
  'rounded-md bg-surface-container p-2 transition-colors hover:bg-surface-container-high dark:bg-dark-surface-container dark:hover:bg-dark-surface-container-high';
const RESIZE_HANDLE_CLASS =
  'graphstudio-resize w-1 bg-outline-variant/30 transition-colors hover:bg-primary/50 dark:bg-slate-800 dark:hover:bg-primary/50';
const SIDE_PANEL_CLASS =
  'graphstudio-side-panel min-h-0 bg-[#F8F9FA] dark:bg-[#111827]';
const STATUS_ERROR_PATTERN = /\b(error|failed|failure|invalid|unsupported)\b/i;
const STATUS_SUCCESS_PATTERN =
  /\b(parsed|imported|restored|exported|generated|copied|loaded|added|deleted|applied|complete|success)\b/i;
const MODE_LABELS = {
  select: 'Select',
  pan: 'Pan',
  add: 'Add Node',
  draw: 'Draw Edge',
};

const getModeGuidance = ({ mode, drawFrom }) => {
  const modeLabel = MODE_LABELS[mode] ?? MODE_LABELS.select;
  if (mode === 'pan') return { modeLabel, action: 'Drag canvas' };
  if (mode === 'add') return { modeLabel, action: 'Click canvas' };
  if (mode !== 'draw') return null;
  if (drawFrom !== null && drawFrom !== undefined) {
    return {
      modeLabel,
      action: 'Choose target',
      accessibleAction: `Source node ${drawFrom} selected; choose target`,
    };
  }
  return { modeLabel, action: 'Choose source, then target' };
};

const getTimelineEditScope = ({ mode, currentFrame = 0 }) =>
  mode === 'add' || mode === 'draw'
    ? `New items start on Frame ${Math.max(0, Number(currentFrame) || 0) + 1}`
    : '';

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
  return `pointer-events-none absolute bottom-3 left-3 right-3 z-20 select-none rounded-sm border px-2 py-1 text-[11px] leading-snug shadow-sm break-words ${toneClass}`;
};

const canvasHudStackClass =
  'pointer-events-none absolute right-3 top-3 z-30 flex w-80 max-w-[90%] flex-col items-end gap-2';
const recoveryShellClass =
  'pointer-events-auto w-80 max-w-full border border-[#CBD5E1] bg-[#FFFFFF] text-[#0F172A] shadow-[0_6px_18px_#0F172A14] dark:border-[#475569] dark:bg-[#111827] dark:text-[#F8FAFC]';
const recoveryToggleClass =
  'flex min-h-8 w-full items-center justify-between gap-3 px-3 py-2 text-left text-xs font-semibold text-[#334155] transition-colors hover:bg-[#F8F9FA] focus:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[#0F2747] dark:text-[#E2E8F0] dark:hover:bg-[#1E293B] dark:focus-visible:ring-[#60A5FA]';
const recoveryActionClass =
  'min-h-7 border border-[#CBD5E1] bg-[#FFFFFF] px-2 text-[10px] font-semibold text-[#334155] transition-colors hover:bg-[#EEF2F6] focus:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[#0F2747] dark:border-[#475569] dark:bg-[#1E293B] dark:text-[#CBD5E1] dark:hover:bg-[#334155] dark:focus-visible:ring-[#60A5FA]';

const getRecoverySignature = entries =>
  (entries ?? [])
    .map(entry => `${entry.type}:${entry.id}:${entry.note ?? ''}`)
    .join('|');

const PresenceRecoveryAffordance = ({ recovery }) => {
  const entries = Array.isArray(recovery?.entries) ? recovery.entries : [];
  const [expandedSignature, setExpandedSignature] = useState('');
  const recoverySignature = getRecoverySignature(entries);

  if (!entries.length) return null;

  const expanded = expandedSignature === recoverySignature;
  const objectLabel = entries.length === 1 ? 'object' : 'objects';

  return (
    <div
      className={recoveryShellClass}
      data-testid="presence-recovery-affordance"
    >
      <button
        type="button"
        className={recoveryToggleClass}
        aria-expanded={expanded}
        onClick={() =>
          setExpandedSignature(prev =>
            prev === recoverySignature ? '' : recoverySignature
          )
        }
      >
        <span>
          {entries.length} {objectLabel} hidden on this frame
        </span>
        <span aria-hidden="true" className="text-[#64748B] dark:text-[#94A3B8]">
          {expanded ? 'Collapse' : 'Expand'}
        </span>
      </button>
      {expanded && (
        <div className="max-h-56 overflow-y-auto border-t border-[#D7DEE8] p-2 dark:border-[#334155]">
          <div className="space-y-1.5">
            {entries.map(entry => (
              <div
                key={`${entry.type}-${entry.id}`}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border border-[#E2E8F0] bg-[#F8F9FA] px-2 py-1.5 dark:border-[#334155] dark:bg-[#1E293B]"
              >
                <div className="min-w-0">
                  <div className="truncate text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                    {entry.label}
                  </div>
                  {entry.note && (
                    <div className="truncate text-[10px] font-medium text-[#64748B] dark:text-[#94A3B8]">
                      {entry.note}
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    className={recoveryActionClass}
                    onClick={() => {
                      recovery?.onShowHere?.(entry.type, entry.id);
                      setExpandedSignature('');
                    }}
                  >
                    Show on this frame
                  </button>
                  <button
                    type="button"
                    className={recoveryActionClass}
                    onClick={() => {
                      recovery?.onShowOnward?.(entry.type, entry.id);
                      setExpandedSignature('');
                    }}
                  >
                    Show from this frame
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
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
        className={`graphstudio-side-panel absolute bottom-0 top-0 w-80 max-w-[85vw] overflow-auto bg-[#F8F9FA] dark:bg-[#111827] ${sideClass}`}
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

const CanvasStage = ({ canvas, status, presenceRecovery }) => (
  <motion.div className="relative h-full" layoutId="graphstudio-main-canvas">
    <GraphCanvas {...canvas} />
    {Boolean(presenceRecovery?.entries?.length) && (
      <div className={canvasHudStackClass} data-testid="canvas-hud-stack">
        <PresenceRecoveryAffordance recovery={presenceRecovery} />
      </div>
    )}
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
  exportCapture,
  isImportMenuOpen,
  isExportMenuOpen,
  onCloseImportMenu,
  onCloseExportMenu,
}) => (
  <>
    <ExportFrameRenderer
      frameIndex={exportCapture?.frameIndex}
      captureToken={exportCapture?.captureToken}
      graph={exportCapture?.graph}
      step={exportCapture?.step}
      canvas={exportCapture?.canvas ?? canvas}
    />
    <LocalDraftRecoveryModal
      draft={modals.localDraft?.draft}
      onRestore={modals.localDraft?.onRestore}
      onDiscard={modals.localDraft?.onDiscard}
    />
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
      previewFrameIndex={sidebar.exportFrameIndex}
      onPreviewFrameChange={sidebar.onExportFrameChange}
      previewCaptureToken={exportCapture?.captureToken}
      isExporting={sidebar.isVisualExporting}
      steps={sidebar.steps}
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
  presenceRecovery,
  exportCapture,
  status,
}) => {
  const [isMobile, setIsMobile] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showPropertyPanel, setShowPropertyPanel] = useState(false);
  const [isImportMenuOpen, setIsImportMenuOpen] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const modeGuidance = getModeGuidance({
    mode: canvas.mode,
    drawFrom: canvas.drawFrom,
  });
  const timelineProps = {
    ...timeline,
    editScope: getTimelineEditScope({
      mode: canvas.mode,
      currentFrame: timeline.currentFrame,
    }),
  };
  const sidebarProps = {
    ...sidebar,
    modeGuidance,
    onOpenImportMenu: () => setIsImportMenuOpen(true),
    onOpenExportMenu: () => {
      if (sidebar.onBeginExportReview?.() === false) return;
      setIsExportMenuOpen(true);
    },
  };
  const closeExportMenu = () => {
    sidebar.onEndExportReview?.();
    setIsExportMenuOpen(false);
  };
  const modalStackProps = {
    modals,
    sidebar,
    canvas,
    exportCapture,
    isImportMenuOpen,
    isExportMenuOpen,
    onCloseImportMenu: () => setIsImportMenuOpen(false),
    onCloseExportMenu: closeExportMenu,
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
          <span className="min-w-0 text-center text-on-surface dark:text-dark-on-surface">
            <span className="block text-sm font-semibold">Graph Studio</span>
            {(canvas.lockCanvas || modeGuidance) && (
              <span
                className="block max-w-[220px] truncate text-[10px] font-medium text-[#64748B] dark:text-[#94A3B8]"
                data-testid="mobile-mode-guidance"
              >
                {canvas.lockCanvas
                  ? 'View locked'
                  : `${modeGuidance.modeLabel} · ${modeGuidance.action}`}
              </span>
            )}
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
          <CanvasStage
            canvas={canvas}
            presenceRecovery={presenceRecovery}
            status={status}
          />
        </div>

        <div className="min-h-[260px] flex-none border-t border-outline-variant/20 dark:border-dark-outline-variant/20">
          <TimelinePanel {...timelineProps} />
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
            <Panel defaultSize="18%" minSize="14%" className={SIDE_PANEL_CLASS}>
              <LeftSidebar {...sidebarProps} />
            </Panel>
            <PanelResizeHandle className={RESIZE_HANDLE_CLASS} />
            <Panel minSize="40%" defaultSize="60%">
              <CanvasStage
                canvas={canvas}
                presenceRecovery={presenceRecovery}
                status={status}
              />
            </Panel>
            <PanelResizeHandle className={RESIZE_HANDLE_CLASS} />
            <Panel defaultSize="22%" minSize="16%" className={SIDE_PANEL_CLASS}>
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
          <TimelinePanel {...timelineProps} />
        </Panel>
      </PanelGroup>
      <ModalStack {...modalStackProps} />
    </div>
  );
};

export default GraphStudioLayout;
