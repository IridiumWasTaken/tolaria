import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { MagnifyingGlass } from '@phosphor-icons/react'
import { ICON_OPTIONS, type IconEntry } from '../utils/iconRegistry'
import { ACCENT_COLORS } from '../utils/typeColors'
import { DISPLAY_MODE_ICONS, type PropertyDisplayMode, formatDateValue } from '../utils/propertyTypes'
import { AddPropertyForm } from './AddPropertyForm'
import {
  PROPERTY_PANEL_GRID_STYLE,
  PROPERTY_PANEL_LABEL_CLASS_NAME,
  PROPERTY_PANEL_LABEL_ICON_SLOT_CLASS_NAME,
  PROPERTY_PANEL_ROW_STYLE,
} from './propertyPanelLayout'
import { PROPERTY_CHIP_STYLE } from './propertyChipStyles'
import { StatusPill } from './StatusDropdown'
import { humanizePropertyKey } from '../utils/propertyLabels'
import { cn } from '@/lib/utils'

type FrontmatterScalar = string | number | boolean | null
type DefaultFrontmatterSchema = Record<string, { type: string; value?: FrontmatterScalar }>

function filterIcons(icons: IconEntry[], query: string): IconEntry[] {
  if (!query) return icons
  const lower = query.toLowerCase()
  return icons.filter((o) => o.name.includes(lower))
}

interface TypeCustomizePopoverProps {
  currentIcon: string | null
  currentColor: string | null
  currentTemplate: string | null
  currentDefaultFrontmatter: Record<string, string | number | boolean | null> | null
  currentDefaultFrontmatterTypes: Record<string, string> | null
  onChangeIcon: (icon: string) => void
  onChangeColor: (color: string) => void
  onChangeTemplate: (template: string) => void
  onChangeDefaultFrontmatter: (schema: DefaultFrontmatterSchema) => void
  onClose: () => void
}

interface DefaultFrontmatterRow {
  id: string
  key: string
  fieldType: string
  value: string
}

function parseScalarInput(raw: string, fieldType: string): FrontmatterScalar | undefined {
  const trimmed = raw.trim()
  if (!trimmed) return undefined
  if (fieldType === 'boolean') {
    if (trimmed.toLowerCase() === 'true') return true
    if (trimmed.toLowerCase() === 'false') return false
  }
  if (fieldType === 'number') {
    const parsed = Number(trimmed)
    if (Number.isFinite(parsed)) return parsed
  }
  if (trimmed.toLowerCase() === 'null') return null
  return trimmed
}

function buildRows(
  values: Record<string, FrontmatterScalar> | null,
  types: Record<string, string> | null,
): DefaultFrontmatterRow[] {
  const keys = new Set([...(Object.keys(types ?? {})), ...(Object.keys(values ?? {}))])
  return Array.from(keys).map((key, index) => {
    const value = values?.[key]
    return {
      id: `${key}-${index}`,
      key,
      fieldType: types?.[key] ?? 'text',
      value: value === null || value === undefined ? '' : String(value),
    }
  })
}

function buildSchema(rows: DefaultFrontmatterRow[]): DefaultFrontmatterSchema {
  const schema: DefaultFrontmatterSchema = {}
  for (const row of rows) {
    const key = row.key.trim()
    if (!key) continue
    const next: { type: string; value?: FrontmatterScalar } = { type: row.fieldType }
    const parsedValue = parseScalarInput(row.value, row.fieldType)
    if (parsedValue !== undefined) next.value = parsedValue
    schema[key] = next
  }
  return schema
}

function renderDefaultValuePreview(row: DefaultFrontmatterRow) {
  const trimmed = row.value.trim()
  if (!trimmed) {
    return <span className="text-[12px] text-muted-foreground/30">{'\u2014'}</span>
  }

  if (row.fieldType === 'status') {
    return <StatusPill status={trimmed} />
  }

  if (row.fieldType === 'date') {
    return (
      <span
        className="inline-flex min-w-0 items-center gap-1 border-none bg-muted text-accent-foreground"
        style={PROPERTY_CHIP_STYLE}
      >
        <span className="min-w-0 truncate">{formatDateValue(trimmed)}</span>
      </span>
    )
  }

  if (row.fieldType === 'boolean') {
    return (
      <span
        className="inline-flex min-w-0 items-center gap-1 border-none bg-muted/60 text-secondary-foreground"
        style={PROPERTY_CHIP_STYLE}
      >
        {trimmed.toLowerCase() === 'true' ? 'Yes' : 'No'}
      </span>
    )
  }

  if (row.fieldType === 'color') {
    return (
      <span className="inline-flex min-w-0 items-center gap-2">
        <span
          className="inline-block size-3 shrink-0 rounded-full border border-border"
          style={{ backgroundColor: trimmed }}
        />
        <span className="truncate text-[12px] text-foreground/80">{trimmed}</span>
      </span>
    )
  }

  if (row.fieldType === 'url') {
    return <span className="truncate text-[12px] text-primary/80 underline underline-offset-2">{trimmed}</span>
  }

  return <span className="truncate text-[12px] text-foreground/80">{trimmed}</span>
}

/** Debounce a callback by `delay` ms. Returns a stable ref-based wrapper. */
function useDebouncedCallback<T>(fn: (v: T) => void, delay: number): (v: T) => void {
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const fnRef = useRef(fn)
  useEffect(() => { fnRef.current = fn })

  useEffect(() => () => { clearTimeout(timerRef.current) }, [])

  return useCallback((v: T) => {
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => fnRef.current(v), delay)
  }, [delay])
}

export function TypeCustomizePopover({
  currentIcon,
  currentColor,
  currentTemplate,
  currentDefaultFrontmatter,
  currentDefaultFrontmatterTypes,
  onChangeIcon,
  onChangeColor,
  onChangeTemplate,
  onChangeDefaultFrontmatter,
  onClose,
}: TypeCustomizePopoverProps) {
  const [selectedColor, setSelectedColor] = useState(currentColor)
  const [selectedIcon, setSelectedIcon] = useState(currentIcon)
  const [search, setSearch] = useState('')
  const [templateText, setTemplateText] = useState(currentTemplate ?? '')
  const [showAddPropertyForm, setShowAddPropertyForm] = useState(false)
  const [addFormKey, setAddFormKey] = useState(0)
  const [editingRowId, setEditingRowId] = useState<string | null>(null)
  const [defaultFrontmatterRows, setDefaultFrontmatterRows] = useState(
    buildRows(currentDefaultFrontmatter, currentDefaultFrontmatterTypes),
  )

  const filteredIcons = useMemo(() => filterIcons(ICON_OPTIONS, search), [search])

  const handleColorClick = (key: string) => {
    setSelectedColor(key)
    onChangeColor(key)
  }

  const handleIconClick = (name: string) => {
    setSelectedIcon(name)
    onChangeIcon(name)
  }

  const debouncedSaveTemplate = useDebouncedCallback(onChangeTemplate, 500)

  useEffect(() => {
    setTemplateText(currentTemplate ?? '')
  }, [currentTemplate])

  useEffect(() => {
    setDefaultFrontmatterRows(buildRows(currentDefaultFrontmatter, currentDefaultFrontmatterTypes))
  }, [currentDefaultFrontmatter, currentDefaultFrontmatterTypes])

  const handleTemplateChange = (value: string) => {
    setTemplateText(value)
    debouncedSaveTemplate(value)
  }

  const handleDefaultFrontmatterChange = (nextRows: DefaultFrontmatterRow[]) => {
    setDefaultFrontmatterRows(nextRows)
  }

  const handleDone = () => {
    onChangeDefaultFrontmatter(buildSchema(defaultFrontmatterRows))
    onClose()
  }

  const removeDefaultRow = (id: string) => {
    handleDefaultFrontmatterChange(defaultFrontmatterRows.filter((row) => row.id !== id))
    if (editingRowId === id) setEditingRowId(null)
  }

  const handleSaveEditRow = (id: string, key: string, value: string, displayMode: PropertyDisplayMode) => {
    const trimmedKey = key.trim()
    if (!trimmedKey) return
    setDefaultFrontmatterRows((prev) =>
      prev.map((row) => row.id === id ? { ...row, key: trimmedKey, fieldType: displayMode, value } : row)
    )
    setEditingRowId(null)
  }

  const startEditRow = (id: string) => {
    setEditingRowId(id)
    setShowAddPropertyForm(false)
  }

  const handleAddDefaultProperty = (key: string, value: string, displayMode: PropertyDisplayMode) => {
    const trimmedKey = key.trim()
    if (!trimmedKey) return

    const id = `row-${Date.now()}-${Math.floor(Math.random() * 1000)}`
    const nextRow: DefaultFrontmatterRow = {
      id,
      key: trimmedKey,
      fieldType: displayMode,
      value,
    }

    const replaced = defaultFrontmatterRows.some((row) => row.key.toLowerCase() === trimmedKey.toLowerCase())
    const nextRows = replaced
      ? defaultFrontmatterRows.map((row) => row.key.toLowerCase() === trimmedKey.toLowerCase() ? { ...row, ...nextRow, id: row.id } : row)
      : [...defaultFrontmatterRows, nextRow]

    handleDefaultFrontmatterChange(nextRows)
    // Keep the same add-definition UI open and reset it for the next row.
    setAddFormKey((prev) => prev + 1)
    setShowAddPropertyForm(true)
    setEditingRowId(null)
  }

  return (
    <div
      className="bg-popover text-popover-foreground z-50 rounded-lg border shadow-md"
      style={{ width: 320, padding: 12 }}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.stopPropagation()}
    >
      {/* Color section */}
      <div className="font-mono-overline mb-2 text-muted-foreground">Color</div>
      <div className="flex gap-2 mb-3 flex-wrap">
        {ACCENT_COLORS.map((c) => (
          <button
            key={c.key}
            className={cn(
              "flex items-center justify-center rounded-full border-2 cursor-pointer transition-all",
              selectedColor === c.key ? "border-foreground scale-110" : "border-transparent hover:scale-105",
            )}
            style={{ width: 24, height: 24, backgroundColor: c.css, border: selectedColor === c.key ? '2px solid var(--foreground)' : '2px solid transparent' }}
            onClick={() => handleColorClick(c.key)}
            title={c.label}
          />
        ))}
      </div>

      {/* Icon section */}
      <div className="font-mono-overline mb-2 text-muted-foreground">Icon</div>

      {/* Search input */}
      <div className="relative mb-2">
        <MagnifyingGlass
          size={14}
          className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search icons…"
          className="w-full rounded border border-border bg-background pl-7 pr-2 py-1 text-[12px] text-foreground placeholder:text-muted-foreground outline-none focus:border-primary"
        />
      </div>

      {/* Icon grid */}
      <div className="flex flex-wrap gap-1 overflow-y-auto" style={{ maxHeight: 160 }}>
        {filteredIcons.length === 0 ? (
          <div className="w-full py-6 text-center text-[12px] text-muted-foreground">
            No icons found
          </div>
        ) : (
          filteredIcons.map(({ name, Icon }) => (
            <button
              key={name}
              className={cn(
                "flex items-center justify-center rounded cursor-pointer transition-colors",
                selectedIcon === name
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
              style={{ width: 30, height: 30 }}
              onClick={() => handleIconClick(name)}
              title={name}
            >
              <Icon size={16} />
            </button>
          ))
        )}
      </div>

      {/* Template section */}
      <div className="font-mono-overline mb-2 mt-3 text-muted-foreground">Template</div>
      <textarea
        value={templateText}
        onChange={(e) => handleTemplateChange(e.target.value)}
        placeholder="Markdown template for new notes of this type…"
        className="w-full rounded border border-border bg-background px-2 py-1.5 text-[12px] font-mono text-foreground placeholder:text-muted-foreground outline-none focus:border-primary resize-y"
        style={{ minHeight: 80, maxHeight: 200 }}
        data-testid="template-textarea"
      />

      <div className="font-mono-overline mb-2 mt-3 text-muted-foreground">Default Frontmatter</div>
      <div className="grid min-w-0 gap-x-2 gap-y-1.5" style={PROPERTY_PANEL_GRID_STYLE} data-testid="default-frontmatter-rows">
        {defaultFrontmatterRows.map((row) => {
          const RowIcon = DISPLAY_MODE_ICONS[row.fieldType as PropertyDisplayMode] ?? DISPLAY_MODE_ICONS.text

          if (editingRowId === row.id) {
            return (
              <AddPropertyForm
                key={`edit-${row.id}`}
                renderAsRow
                initialKey={row.key}
                initialValue={row.value}
                initialMode={row.fieldType as PropertyDisplayMode}
                onAdd={(key, value, displayMode) => handleSaveEditRow(row.id, key, value, displayMode)}
                onCancel={() => setEditingRowId(null)}
                vaultStatuses={[]}
                allowEmptyValue
              />
            )
          }

          return (
            <div
              key={row.id}
              className="group/prop grid min-h-7 min-w-0 grid-cols-2 items-center gap-2 rounded px-1.5 outline-none transition-colors hover:bg-muted cursor-pointer"
              style={PROPERTY_PANEL_ROW_STYLE}
              data-testid="default-frontmatter-row"
              onClick={() => startEditRow(row.id)}
            >
              <span className={PROPERTY_PANEL_LABEL_CLASS_NAME}>
                <span className={PROPERTY_PANEL_LABEL_ICON_SLOT_CLASS_NAME}>
                  <RowIcon className="size-3.5 text-muted-foreground" />
                </span>
                <span className="min-w-0 flex-1 truncate" data-testid="default-frontmatter-key-label">{humanizePropertyKey(row.key)}</span>
                <button
                  className="border-none bg-transparent p-0 text-sm leading-none text-muted-foreground opacity-0 transition-all hover:text-destructive group-hover/prop:opacity-100"
                  onClick={(e) => { e.stopPropagation(); removeDefaultRow(row.id) }}
                  title="Remove property"
                  data-testid="default-frontmatter-remove"
                >
                  ×
                </button>
              </span>
              <span className="min-w-0 truncate" data-testid="default-frontmatter-value-preview">{renderDefaultValuePreview(row)}</span>
            </div>
          )
        })}
        {!showAddPropertyForm && (
          <button
            className="mt-1 rounded border border-border bg-background px-2 py-1 text-[12px] text-muted-foreground hover:bg-accent hover:text-foreground"
            onClick={() => setShowAddPropertyForm(true)}
            data-testid="default-frontmatter-add"
          >
            Add property
          </button>
        )}
      </div>

      {showAddPropertyForm && (
        <div className="mt-2">
        <AddPropertyForm
          key={addFormKey}
          onAdd={handleAddDefaultProperty}
          onCancel={() => setShowAddPropertyForm(false)}
          vaultStatuses={[]}
          allowEmptyValue
          alignWithPropertyGrid
        />
        </div>
      )}

      {/* Done button */}
      <div className="mt-3 flex justify-end">
        <button
          className="rounded px-3 py-1 text-[12px] font-medium text-muted-foreground hover:text-foreground hover:bg-accent cursor-pointer transition-colors border-none bg-transparent"
          onClick={handleDone}
        >
          Done
        </button>
      </div>
    </div>
  )
}
