import {
  CUSTOM_LEGEND_POSITION_LABELS,
  CUSTOM_LEGEND_POSITIONS,
  DEFAULT_CUSTOM_LEGEND,
} from './lib/customLegend';
import NativeSelect from './NativeSelect';

const TOOL_OPTIONS = [
  { id: 'select', label: 'Select' },
  { id: 'pan', label: 'Pan' },
  { id: 'add', label: 'Add Node' },
  { id: 'draw', label: 'Draw Edge' },
];
const LAYOUT_OPTIONS = [
  ['circle', 'Circle'],
  ['tree', 'Tree'],
  ['force', 'Force'],
];
const PRESET_OPTIONS = [
  ['bfs', 'BFS'],
  ['dfs', 'DFS'],
  ['topological-sort', 'Topological Sort'],
  ['disjoint-set-union', 'Disjoint Set Union'],
  ['connected-components', 'Connected Components'],
  ['kruskal-mst', 'Kruskal MST'],
  ['dijkstra', 'Dijkstra'],
  ['dijkstra-shortest-paths', 'Dijkstra Shortest Paths'],
  ['multigraph', 'Multi-Edge / Loop'],
];

const sectionTitleClass =
  'font-manrope text-[11px] font-bold uppercase tracking-[0.14em] text-[#0F2747] dark:text-[#F8FAFC]';
const actionButtonBaseClass =
  'min-h-[44px] rounded-sm border px-2.5 py-2.5 text-xs font-semibold transition-colors md:min-h-9 md:py-2';
const actionButtonDefaultClass =
  'border-[#D7DEE8] bg-[#FFFFFF] text-[#334155] hover:bg-[#EEF2F6] dark:border-[#475569] dark:bg-[#1E293B] dark:text-[#E2E8F0] dark:hover:bg-[#334155]';
const iconButtonClass =
  'min-w-[44px] rounded-sm p-2 text-[#334155] transition-colors hover:bg-[#E2E8F0] dark:text-[#E2E8F0] dark:hover:bg-[#334155] md:min-w-8 md:p-1.5';
const toggleRowClass =
  'flex min-h-[44px] cursor-pointer items-center justify-between rounded-sm border border-[#D7DEE8] bg-[#FFFFFF] px-3 py-2 transition-colors hover:bg-[#EEF2F6] dark:border-[#475569] dark:bg-[#1E293B] dark:hover:bg-[#334155] md:min-h-9';
const checkboxClass =
  'h-4 w-4 rounded-sm accent-[#0F2747] focus:ring-[#0F2747] dark:accent-[#3B82F6] dark:focus:ring-[#3B82F6]';
const dataButtonClass =
  'min-h-[44px] rounded-sm border border-[#D7DEE8] bg-[#FFFFFF] py-2 text-xs font-semibold text-[#334155] transition-colors hover:bg-[#EEF2F6] disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#475569] dark:bg-[#1E293B] dark:text-[#E2E8F0] dark:hover:bg-[#334155] md:min-h-9';

const joinClasses = (...classes) => classes.filter(Boolean).join(' ');

const SectionTitle = ({ children }) => (
  <div className={sectionTitleClass}>{children}</div>
);

const SidebarSection = ({ children }) => (
  <section className="space-y-2.5 border-b border-[#D7DEE8] py-4 first:pt-0 last:border-b-0 dark:border-[#334155]">
    {children}
  </section>
);

const ActionButton = ({ children, className, ...props }) => (
  <button
    type="button"
    className={joinClasses(
      actionButtonBaseClass,
      actionButtonDefaultClass,
      className
    )}
    {...props}
  >
    {children}
  </button>
);

const IconButton = ({ title, children, ...props }) => (
  <button
    type="button"
    className={iconButtonClass}
    title={title}
    aria-label={title}
    {...props}
  >
    {children}
  </button>
);

const ToggleRow = ({ label, checked, onChange }) => (
  <label className={toggleRowClass}>
    <span className="text-xs text-on-surface dark:text-dark-on-surface">
      {label}
    </span>
    <input
      type="checkbox"
      checked={checked}
      onChange={event => onChange(event.target.checked)}
      className={checkboxClass}
    />
  </label>
);

const CenterViewIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 3h6v6H3z" />
    <path d="M15 3h6v6h-6z" />
    <path d="M15 15h6v6h-6z" />
    <path d="M3 15h6v6H3z" />
  </svg>
);

const ZoomOutIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const ZoomInIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const LeftSidebar = ({
  mode,
  setMode,
  routing,
  setRouting,
  snapEnabled,
  setSnapEnabled,
  showGrid,
  setShowGrid,
  customLegend = DEFAULT_CUSTOM_LEGEND,
  setCustomLegend,
  lockCanvas,
  setLockCanvas,
  onDrawEdge,
  drawFrom,
  onAutoLayout,
  onOpenImportMenu,
  onOpenExportMenu,
  onOpenLegendEditor,
  isLegendEditorOpen = false,
  onOpenScript,
  onApplyPreset,
  onCenterView,
  zoomPercent,
  onZoomIn,
  onZoomOut,
}) => {
  const drawHelpText =
    drawFrom !== null && drawFrom !== undefined
      ? `Source node ${drawFrom} selected. Click a target node.`
      : 'Click a source node, then a target node.';
  const legendEntries = Array.isArray(customLegend.entries)
    ? customLegend.entries
    : [];
  const legendPosition = CUSTOM_LEGEND_POSITIONS.includes(customLegend.position)
    ? customLegend.position
    : DEFAULT_CUSTOM_LEGEND.position;
  const legendSummary = `${legendEntries.length} ${
    legendEntries.length === 1 ? 'entry' : 'entries'
  } · ${CUSTOM_LEGEND_POSITION_LABELS[legendPosition] ?? 'Auto'}`;
  const patchCustomLegend = patch => {
    setCustomLegend?.(prev => ({
      ...DEFAULT_CUSTOM_LEGEND,
      ...(prev ?? {}),
      ...patch,
    }));
  };

  return (
    <div
      className="flex h-full flex-col overflow-auto bg-[#F8F9FA] p-4 text-sm dark:bg-[#111827]"
      data-testid="left-sidebar"
    >
      <div className="border-b border-[#D7DEE8] pb-4 dark:border-[#334155]">
        <div className="font-manrope text-sm font-bold text-[#0F2747] dark:text-[#F8FAFC]">
          Graph animation editor
        </div>
        <p className="mt-1 text-[11px] leading-relaxed text-[#64748B] dark:text-[#94A3B8]">
          Create and export graph animations for algorithm explanations.
        </p>
      </div>

      <SidebarSection>
        <SectionTitle>Tools</SectionTitle>
        <div className="grid grid-cols-2 gap-1 rounded-sm border border-[#D7DEE8] bg-[#E9EEF4] p-1 dark:border-[#475569] dark:bg-[#1E293B]">
          {TOOL_OPTIONS.map(tool => (
            <button
              key={tool.id}
              type="button"
              className={joinClasses(
                'min-h-[44px] rounded-sm px-2 py-2 text-xs font-semibold transition-colors md:min-h-8 md:py-1.5',
                mode === tool.id
                  ? 'bg-[#0F2747] text-[#FFFFFF] shadow-sm dark:bg-[#1D4ED8] dark:text-[#FFFFFF]'
                  : 'text-[#475569] hover:bg-[#FFFFFF] hover:text-[#0F2747] dark:text-[#CBD5E1] dark:hover:bg-[#334155] dark:hover:text-[#FFFFFF]'
              )}
              aria-pressed={mode === tool.id}
              onClick={() =>
                tool.id === 'draw' ? onDrawEdge() : setMode(tool.id)
              }
            >
              {tool.label}
            </button>
          ))}
        </div>
        {mode === 'add' && (
          <p className="text-[10px] leading-relaxed text-[#64748B] dark:text-[#94A3B8]">
            Click the canvas to add a node.
          </p>
        )}
        {mode === 'draw' && (
          <p className="text-[10px] leading-relaxed text-[#64748B] dark:text-[#94A3B8]">
            {drawHelpText}
          </p>
        )}
      </SidebarSection>

      <SidebarSection>
        <SectionTitle>Presets</SectionTitle>
        <NativeSelect
          aria-label="Load graph preset"
          onChange={event => {
            if (event.target.value) onApplyPreset(event.target.value);
            event.target.value = '';
          }}
        >
          <option value="">Choose preset...</option>
          {PRESET_OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </NativeSelect>
      </SidebarSection>

      <SidebarSection>
        <SectionTitle>Arrange</SectionTitle>
        <div className="grid grid-cols-3 gap-1">
          {LAYOUT_OPTIONS.map(([type, label]) => (
            <ActionButton
              key={type}
              disabled={!onAutoLayout}
              onClick={() => onAutoLayout?.(type)}
            >
              {label}
            </ActionButton>
          ))}
        </div>
      </SidebarSection>

      <SidebarSection>
        <SectionTitle>View &amp; Canvas</SectionTitle>
        <div className="flex items-center justify-between rounded-sm border border-[#D7DEE8] bg-[#FFFFFF] p-1.5 dark:border-[#475569] dark:bg-[#1E293B]">
          <IconButton title="Center View" onClick={onCenterView}>
            <CenterViewIcon />
          </IconButton>
          <div className="flex items-center gap-2">
            <IconButton title="Zoom Out" onClick={onZoomOut}>
              <ZoomOutIcon />
            </IconButton>
            <span className="w-10 text-center text-xs font-semibold text-[#334155] dark:text-[#E2E8F0]">
              {zoomPercent}%
            </span>
            <IconButton title="Zoom In" onClick={onZoomIn}>
              <ZoomInIcon />
            </IconButton>
          </div>
        </div>
        <div className="space-y-2">
          <div className="space-y-1.5">
            <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#64748B] dark:text-[#94A3B8]">
              Edge Routing
            </div>
            <NativeSelect
              value={routing}
              aria-label="Edge routing"
              onChange={event => setRouting(event.target.value)}
            >
              <option value="straight">Straight</option>
              <option value="bezier">Curved</option>
            </NativeSelect>
          </div>
          <ToggleRow
            label="Dot Grid"
            checked={showGrid}
            onChange={setShowGrid}
          />
          <ToggleRow
            label="Snap to Grid"
            checked={snapEnabled}
            onChange={setSnapEnabled}
          />
          <ToggleRow
            label="Lock View"
            checked={lockCanvas}
            onChange={setLockCanvas}
          />
        </div>
      </SidebarSection>

      <SidebarSection>
        <SectionTitle>Legend</SectionTitle>
        <div className="space-y-2.5" data-testid="custom-legend-controls">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-[#1E293B] dark:text-[#F8FAFC]">
                <input
                  type="checkbox"
                  aria-label="Legend"
                  checked={Boolean(customLegend.enabled)}
                  onChange={event =>
                    patchCustomLegend({ enabled: event.target.checked })
                  }
                  className={checkboxClass}
                />
                <span>Show legend</span>
              </label>
              <div
                className="mt-1 text-[10px] leading-relaxed text-[#64748B] dark:text-[#94A3B8]"
                data-testid="custom-legend-summary"
              >
                {legendSummary}
              </div>
            </div>
            <button
              type="button"
              aria-haspopup="dialog"
              aria-expanded={isLegendEditorOpen}
              aria-controls="custom-legend-editor"
              data-testid="custom-legend-edit-toggle"
              onClick={onOpenLegendEditor}
              className="min-h-8 shrink-0 rounded-sm border border-[#CBD5E1] bg-[#FFFFFF] px-2.5 text-[10px] font-semibold text-[#334155] transition-colors hover:bg-[#EEF2F6] dark:border-[#475569] dark:bg-[#1E293B] dark:text-[#E2E8F0] dark:hover:bg-[#334155]"
            >
              Edit
            </button>
          </div>
          <label
            className="block space-y-1.5"
            htmlFor="custom-legend-sidebar-position"
          >
            <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#64748B] dark:text-[#94A3B8]">
              Placement
            </span>
            <NativeSelect
              id="custom-legend-sidebar-position"
              value={legendPosition}
              aria-label="Legend Placement"
              data-testid="custom-legend-placement-select"
              onChange={event =>
                patchCustomLegend({ position: event.target.value })
              }
            >
              {CUSTOM_LEGEND_POSITIONS.map(position => (
                <option key={position} value={position}>
                  {CUSTOM_LEGEND_POSITION_LABELS[position]}
                </option>
              ))}
            </NativeSelect>
          </label>
        </div>
      </SidebarSection>

      <SidebarSection>
        <SectionTitle>Data</SectionTitle>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            className={dataButtonClass}
            data-testid="open-import-menu"
            onClick={onOpenImportMenu}
          >
            Import...
          </button>
          <button
            type="button"
            className={dataButtonClass}
            data-testid="open-export-menu"
            onClick={onOpenExportMenu}
          >
            Export...
          </button>
        </div>
      </SidebarSection>

      <SidebarSection>
        <SectionTitle>Advanced</SectionTitle>
        <ActionButton className="w-full" onClick={onOpenScript}>
          Script Mode
        </ActionButton>
      </SidebarSection>
    </div>
  );
};

export default LeftSidebar;
