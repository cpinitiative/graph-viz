import NativeSelect from './NativeSelect';

const NODE_STATUS_OPTIONS = [
  ['default', 'Default'],
  ['active', 'Active'],
  ['queued', 'Queued'],
  ['visited', 'Visited'],
  ['discarded', 'Discarded'],
];

const panelClass =
  'h-full space-y-5 overflow-y-auto bg-[#F8F9FA] p-4 text-sm dark:bg-[#111827]';
const sectionTitleClass =
  'font-manrope text-[11px] font-bold uppercase tracking-[0.14em] text-[#0F2747] dark:text-[#F8FAFC]';
const bodyTextClass = 'text-xs text-[#334155] dark:text-[#E2E8F0]';
const helperTextClass =
  'border-l-2 border-[#D6A84B] pl-2 text-[10px] leading-relaxed text-[#64748B] dark:text-[#94A3B8]';
const fieldLabelClass =
  'text-[10px] font-semibold uppercase tracking-[0.08em] text-[#64748B] dark:text-[#94A3B8]';
const inputClass =
  'h-10 w-full rounded-sm border border-[#CBD5E1] bg-[#FFFFFF] px-3 py-2 text-xs font-medium text-[#1E293B] transition-colors focus:border-[#0F2747] focus:outline-none focus:ring-1 focus:ring-[#0F2747] dark:border-[#475569] dark:bg-[#1E293B] dark:text-[#F8FAFC] dark:focus:border-[#3B82F6] dark:focus:ring-[#3B82F6]';
const actionButtonClass =
  'min-h-[44px] w-full rounded-sm border border-[#D7DEE8] bg-[#FFFFFF] px-3 py-2.5 text-left text-xs font-semibold text-[#334155] transition-colors hover:bg-[#EEF2F6] dark:border-[#475569] dark:bg-[#1E293B] dark:text-[#E2E8F0] dark:hover:bg-[#334155] md:min-h-9 md:py-2';
const deleteButtonClass =
  'mt-1 min-h-[44px] w-full rounded-sm border border-[#FECACA] bg-[#FEF2F2] px-3 py-2.5 text-left text-xs font-bold text-[#B91C1C] transition-colors hover:border-[#FCA5A5] hover:bg-[#FEE2E2] dark:border-[#7F1D1D] dark:bg-[#450A0A] dark:text-[#FCA5A5] dark:hover:bg-[#7F1D1D] md:min-h-9 md:py-2';
const listButtonClass =
  'min-h-[44px] w-full whitespace-normal break-words rounded-sm border border-[#D7DEE8] bg-[#FFFFFF] px-2.5 py-2 text-left text-xs leading-relaxed text-[#334155] transition-colors hover:bg-[#EEF2F6] dark:border-[#475569] dark:bg-[#1E293B] dark:text-[#E2E8F0] dark:hover:bg-[#334155] md:min-h-9 md:py-1.5';
const toggleRowClass =
  'flex min-h-[44px] cursor-pointer items-center justify-between rounded-sm border border-[#D7DEE8] bg-[#FFFFFF] px-3 py-2 transition-colors hover:bg-[#EEF2F6] dark:border-[#475569] dark:bg-[#1E293B] dark:hover:bg-[#334155] md:min-h-9';
const checkboxClass =
  'h-4 w-4 rounded-sm accent-[#0F2747] focus:ring-[#0F2747] dark:accent-[#3B82F6] dark:focus:ring-[#3B82F6]';

const joinClasses = (...classes) => classes.filter(Boolean).join(' ');

const PanelShell = ({ children }) => (
  <div className={panelClass} data-testid="property-panel">
    {children}
  </div>
);

const Section = ({ title, children }) => (
  <section className="space-y-3 border-b border-[#D7DEE8] pb-5 last:border-b-0 dark:border-[#334155]">
    <div className={sectionTitleClass}>{title}</div>
    {children}
  </section>
);

const Field = ({ label, children }) => (
  <label className="block space-y-1.5">
    <span className={fieldLabelClass}>{label}</span>
    {children}
  </label>
);

const TextInput = ({ value, onChange, placeholder }) => (
  <input
    className={inputClass}
    value={value}
    onChange={event => onChange(event.target.value)}
    placeholder={placeholder}
  />
);

const ColorField = ({ label, value, fallback, placeholder, onChange }) => (
  <Field label={label}>
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={value.startsWith('#') ? value : fallback}
        onChange={event => onChange(event.target.value)}
        className="h-10 w-10 cursor-pointer rounded bg-transparent p-0 md:h-8 md:w-8"
      />
      <TextInput value={value} onChange={onChange} placeholder={placeholder} />
    </div>
  </Field>
);

const ToggleRow = ({ label, checked, onChange }) => (
  <label className={toggleRowClass}>
    <span className={fieldLabelClass}>{label}</span>
    <input
      type="checkbox"
      checked={checked}
      onChange={event => onChange(event.target.checked)}
      className={checkboxClass}
    />
  </label>
);

const ActionButton = ({ children, className, ...props }) => (
  <button
    type="button"
    className={joinClasses(actionButtonClass, className)}
    {...props}
  >
    {children}
  </button>
);

const DeleteButton = ({ children, onClick }) => (
  <button type="button" className={deleteButtonClass} onClick={onClick}>
    {children}
  </button>
);

const RangeControl = ({ label, value, min, max, step, onChange }) => (
  <label className="block space-y-1.5">
    <div className="flex justify-between">
      <span className={fieldLabelClass}>{label}</span>
      <span className="text-xs font-semibold text-[#64748B] dark:text-[#94A3B8]">
        {value}
      </span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={event => onChange(Number(event.target.value))}
      className="h-2 w-full accent-blue-500"
    />
  </label>
);

const LinkedList = ({ items, emptyLabel, renderItem, onSelect }) => {
  if (!items?.length) {
    return (
      <div className="text-xs italic text-[#64748B] dark:text-[#94A3B8]">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {items.map(item => (
        <button
          key={item.id}
          type="button"
          className={listButtonClass}
          onClick={() => onSelect?.(item.id)}
        >
          {renderItem(item)}
        </button>
      ))}
    </div>
  );
};

const MultiSelectionPanel = ({
  selectedCount,
  onApplyToSelection,
  onDeleteSelection,
}) => (
  <PanelShell>
    <Section title="Selection">
      <p className={bodyTextClass}>{selectedCount} items selected</p>
      <div className="space-y-2">
        <ActionButton onClick={() => onApplyToSelection({ status: 'visited' })}>
          Set visited
        </ActionButton>
        <ActionButton onClick={() => onApplyToSelection({ status: 'active' })}>
          Set active
        </ActionButton>
        <ActionButton onClick={() => onApplyToSelection({ color: '#22c55e' })}>
          Color green
        </ActionButton>
        <DeleteButton onClick={onDeleteSelection}>Delete selected</DeleteButton>
      </div>
    </Section>
  </PanelShell>
);

const NodeInspector = ({
  selectedNode,
  connectedEdges,
  onUpdateNode,
  onSelectEdge,
  onDeleteSelection,
}) => {
  const nodeColor = selectedNode.color ?? '';

  return (
    <PanelShell>
      <Section title="Node Inspector">
        <p className={helperTextClass}>
          Label: all frames · Status/color: current frame
        </p>
        <div className="space-y-4">
          <Field label="Label">
            <TextInput
              value={selectedNode.label ?? ''}
              onChange={value => onUpdateNode({ label: value })}
            />
          </Field>
          <Field label="Status">
            <NativeSelect
              value={String(selectedNode.status ?? 'default')}
              onChange={event => onUpdateNode({ status: event.target.value })}
            >
              {NODE_STATUS_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <ColorField
            label="Highlight color"
            value={nodeColor}
            fallback="#3b82f6"
            placeholder="#22c55e or blank"
            onChange={value => onUpdateNode({ color: value })}
          />
        </div>
      </Section>

      <Section title="Connected Edges">
        <LinkedList
          items={connectedEdges}
          emptyLabel="No connected edges"
          onSelect={onSelectEdge}
          renderItem={edge => {
            const label = edge.label ? ` • w:${edge.label}` : '';
            const direction = edge.directed ? '→' : '—';
            return (
              <>
                {edge.id}: {edge.from} {direction} {edge.to}
                {label}
              </>
            );
          }}
        />
      </Section>

      <DeleteButton onClick={onDeleteSelection}>Delete node</DeleteButton>
    </PanelShell>
  );
};

const EdgeInspector = ({
  selectedEdge,
  connectedNodes,
  onUpdateEdge,
  onSelectNode,
  onDeleteSelection,
}) => {
  const edgeColor = selectedEdge.color ?? '#64748b';

  return (
    <PanelShell>
      <Section title="Edge Inspector">
        <p className={helperTextClass}>
          Weight/direction: all frames · Color: current frame
        </p>
        <div className="space-y-4">
          <Field label="Weight / Label">
            <TextInput
              value={selectedEdge.label ?? ''}
              onChange={value => onUpdateEdge({ label: value })}
              placeholder="e.g. 7"
            />
          </Field>
          <ToggleRow
            label="Directed"
            checked={Boolean(selectedEdge.directed)}
            onChange={checked => onUpdateEdge({ directed: checked })}
          />
          <ColorField
            label="Highlight color"
            value={edgeColor}
            fallback="#64748b"
            placeholder="#64748b"
            onChange={value => onUpdateEdge({ color: value })}
          />
        </div>
      </Section>

      <Section title="Connected Nodes">
        <LinkedList
          items={connectedNodes}
          emptyLabel="No connected nodes"
          onSelect={onSelectNode}
          renderItem={node => (
            <>
              {node.label ?? node.id} (id: {node.id})
            </>
          )}
        />
      </Section>

      <DeleteButton onClick={onDeleteSelection}>Delete edge</DeleteButton>
    </PanelShell>
  );
};

const GlobalSettingsPanel = ({ globalSettings, onUpdateGlobal }) => (
  <PanelShell>
    <Section title="Global Settings">
      <div className="space-y-4">
        <RangeControl
          label="Gravity (force)"
          value={globalSettings.forceStrength}
          min="0.2"
          max="2"
          step="0.1"
          onChange={forceStrength => onUpdateGlobal({ forceStrength })}
        />
        <RangeControl
          label="Edge curvature"
          value={globalSettings.edgeCurvature}
          min="0"
          max="120"
          step="5"
          onChange={edgeCurvature => onUpdateGlobal({ edgeCurvature })}
        />
        <RangeControl
          label="Node size"
          value={globalSettings.nodeSize ?? 22}
          min="12"
          max="44"
          step="1"
          onChange={nodeSize => onUpdateGlobal({ nodeSize })}
        />
        <RangeControl
          label="Edge width"
          value={globalSettings.edgeWidth ?? 2.2}
          min="1"
          max="8"
          step="0.2"
          onChange={edgeWidth => onUpdateGlobal({ edgeWidth })}
        />
      </div>
    </Section>
    <div className="border border-[#D7DEE8] bg-[#FFFFFF] p-3 dark:border-[#475569] dark:bg-[#1E293B]">
      <div className="text-center text-xs text-[#475569] dark:text-[#CBD5E1]">
        Select a node or edge to inspect it.
      </div>
    </div>
  </PanelShell>
);

const PropertyPanel = ({
  selectedNode,
  selectedEdge,
  connectedEdges,
  connectedNodes,
  multiSelection,
  globalSettings,
  onUpdateNode,
  onUpdateEdge,
  onSelectEdge,
  onSelectNode,
  onApplyToSelection,
  onDeleteSelection,
  onUpdateGlobal,
}) => {
  if (multiSelection.length > 1) {
    return (
      <MultiSelectionPanel
        selectedCount={multiSelection.length}
        onApplyToSelection={onApplyToSelection}
        onDeleteSelection={onDeleteSelection}
      />
    );
  }

  if (selectedNode) {
    return (
      <NodeInspector
        selectedNode={selectedNode}
        connectedEdges={connectedEdges}
        onUpdateNode={onUpdateNode}
        onSelectEdge={onSelectEdge}
        onDeleteSelection={onDeleteSelection}
      />
    );
  }

  if (selectedEdge) {
    return (
      <EdgeInspector
        selectedEdge={selectedEdge}
        connectedNodes={connectedNodes}
        onUpdateEdge={onUpdateEdge}
        onSelectNode={onSelectNode}
        onDeleteSelection={onDeleteSelection}
      />
    );
  }

  return (
    <GlobalSettingsPanel
      globalSettings={globalSettings}
      onUpdateGlobal={onUpdateGlobal}
    />
  );
};

export default PropertyPanel;
