const NODE_STATUS_OPTIONS = [
  ['default', 'Default'],
  ['active', 'Active'],
  ['queued', 'Queued'],
  ['visited', 'Visited'],
  ['discarded', 'Discarded'],
];

const panelClass =
  'h-full space-y-4 overflow-y-auto bg-surface-container-low p-4 text-sm dark:bg-dark-surface md:space-y-6 md:p-4';
const sectionTitleClass =
  'font-manrope text-xs font-semibold uppercase tracking-wider text-on-surface dark:text-dark-on-surface';
const bodyTextClass = 'text-xs text-on-surface dark:text-dark-on-surface';
const helperTextClass =
  'text-[10px] leading-tight text-outline dark:text-dark-outline';
const fieldLabelClass = 'text-xs text-on-surface dark:text-dark-on-surface';
const inputClass =
  'w-full border-b border-outline-variant/20 bg-surface-container-low px-3 py-3 text-xs text-on-surface transition-colors focus:border-b-primary focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-dark-outline-variant/20 dark:bg-gray-800 dark:text-dark-on-surface md:py-2';
const selectClass =
  'w-full border-b border-outline-variant/20 bg-surface-container-low py-3 pl-3 pr-10 text-xs text-on-surface transition-colors focus:border-b-primary focus:outline-none focus:ring-0 dark:border-dark-outline-variant/20 dark:bg-gray-800 dark:text-dark-on-surface md:py-2';
const actionButtonClass =
  'min-h-[44px] w-full rounded-md bg-surface-container px-3 py-3 text-left text-xs text-on-surface transition-colors hover:bg-surface-container-high dark:bg-dark-surface-container dark:text-dark-on-surface dark:hover:bg-dark-surface-container-high md:min-h-0 md:py-2';
const deleteButtonClass =
  'mt-4 min-h-[44px] w-full rounded-md bg-surface-container-high px-3 py-3 text-left text-xs text-primary transition-colors hover:bg-surface-container-highest dark:bg-dark-surface-container-high dark:text-dark-primary dark:hover:bg-dark-surface-container-highest md:min-h-0 md:py-2';
const listButtonClass =
  'min-h-[44px] w-full truncate rounded bg-surface-container px-2 py-2 text-left text-xs text-on-surface transition-colors hover:bg-surface-container-high dark:bg-dark-surface-container dark:text-dark-on-surface dark:hover:bg-dark-surface-container-high md:min-h-0 md:py-1.5';
const toggleRowClass =
  'flex cursor-pointer items-center justify-between rounded-md bg-surface-container p-3 transition-colors hover:bg-surface-container-high dark:bg-dark-surface-container dark:hover:bg-dark-surface-container-high md:p-2';
const checkboxClass =
  'h-5 w-5 rounded bg-surface-container-high text-blue-500 focus:ring-blue-500 focus:ring-offset-slate-800';

const joinClasses = (...classes) => classes.filter(Boolean).join(' ');

const PanelShell = ({ children }) => (
  <div className={panelClass} data-testid="property-panel">
    {children}
  </div>
);

const Section = ({ title, children }) => (
  <div className="space-y-3">
    <div className={sectionTitleClass}>{title}</div>
    {children}
  </div>
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
      <span className="text-xs text-outline dark:text-dark-outline">
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
      <div className="text-xs italic text-outline dark:text-dark-outline">
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
          Label is shared across all frames. Status/color are per-frame.
        </p>
        <div className="space-y-4">
          <Field label="Label">
            <TextInput
              value={selectedNode.label ?? ''}
              onChange={value => onUpdateNode({ label: value })}
            />
          </Field>
          <Field label="Status">
            <select
              className={selectClass}
              value={String(selectedNode.status ?? 'default')}
              onChange={event => onUpdateNode({ status: event.target.value })}
            >
              {NODE_STATUS_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
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
          Weight &amp; direction are shared across all frames. Color is
          per-frame.
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
    <div className="rounded-md bg-surface-container p-3 dark:bg-dark-surface-container">
      <div className="text-center text-xs text-on-surface dark:text-dark-on-surface">
        Select a node or edge to view its properties.
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
