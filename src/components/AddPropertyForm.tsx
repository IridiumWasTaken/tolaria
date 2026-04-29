import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CalendarIcon, Check, X } from 'lucide-react'
import {
  PROPERTY_PANEL_GRID_STYLE,
  PROPERTY_PANEL_ROW_STYLE,
} from './propertyPanelLayout'
import {
  type PropertyDisplayMode,
  formatDateValue,
  toISODate,
} from '../utils/propertyTypes'
import { StatusPill, StatusDropdown } from './StatusDropdown'
import { DISPLAY_MODE_OPTIONS, DISPLAY_MODE_ICONS } from '../utils/propertyTypes'
import { translate, type AppLocale } from '../lib/i18n'

function parseDateValue(value: string): Date | undefined {
  const iso = toISODate(value)
  const d = new Date(iso + 'T00:00:00')
  return isNaN(d.getTime()) ? undefined : d
}

function dateToISO(day: Date): string {
  const yyyy = day.getFullYear()
  const mm = String(day.getMonth() + 1).padStart(2, '0')
  const dd = String(day.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

const ADD_INPUT_CLASS = "h-[26px] min-w-[60px] flex-1 rounded border border-border bg-muted px-1.5 text-[12px] text-foreground outline-none focus:border-primary"

function isValidNumberValue(value: string): boolean {
  const trimmed = value.trim()
  if (trimmed === '') return false
  return Number.isFinite(Number(trimmed))
}

function canSubmitProperty({
  key,
  value,
  displayMode,
  allowEmptyValue,
}: {
  key: string
  value: string
  displayMode: PropertyDisplayMode
  allowEmptyValue: boolean
}): boolean {
  if (!key.trim()) return false
  if (allowEmptyValue && value.trim() === '') return true
  return displayMode !== 'number' || isValidNumberValue(value)
}

function AddBooleanInput({ value, locale, onChange }: { value: string; locale: AppLocale; onChange: (v: string) => void }) {
  const boolVal = value.toLowerCase() === 'true'
  return (
    <button
      className="h-[26px] min-w-[60px] flex-1 rounded border border-border bg-muted px-1.5 text-[12px] text-secondary-foreground transition-colors hover:bg-accent"
      onClick={() => onChange(boolVal ? 'false' : 'true')}
      data-testid="add-property-boolean-toggle"
    >
      {boolVal ? `\u2713 ${translate(locale, 'inspector.properties.yes')}` : `\u2717 ${translate(locale, 'inspector.properties.no')}`}
    </button>
  )
}

function AddDateInput({ value, locale, onChange }: { value: string; locale: AppLocale; onChange: (v: string) => void }) {
  const selectedDate = value ? parseDateValue(value) : undefined
  const formatted = value ? formatDateValue(value) : ''
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="inline-flex h-[26px] min-w-[60px] flex-1 cursor-pointer items-center gap-1 rounded border border-border bg-muted px-1.5 text-[12px] transition-colors hover:bg-accent"
          data-testid="add-property-date-trigger"
        >
          <CalendarIcon className="size-3 shrink-0 text-muted-foreground" />
          <span className={`min-w-0 truncate${!formatted ? ' text-muted-foreground' : ' text-foreground'}`}>
            {formatted || translate(locale, 'inspector.properties.pickDate')}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start" side="left">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(day) => { if (day) onChange(dateToISO(day)) }}
          defaultMonth={selectedDate}
        />
      </PopoverContent>
    </Popover>
  )
}

function AddStatusInput({ value, onChange, vaultStatuses }: { value: string; onChange: (v: string) => void; vaultStatuses: string[] }) {
  const [showDropdown, setShowDropdown] = useState(false)
  return (
    <span className="relative inline-flex min-w-[60px] flex-1 items-center">
      <button
        className="inline-flex h-[26px] min-w-[60px] flex-1 cursor-pointer items-center gap-1 rounded border border-border bg-muted px-1.5 text-[12px] transition-colors hover:bg-accent"
        onClick={() => setShowDropdown(true)}
        data-testid="add-property-status-trigger"
      >
        {value ? <StatusPill status={value} /> : <span className="text-muted-foreground">Status{'\u2026'}</span>}
      </button>
      {showDropdown && (
        <StatusDropdown
          value={value}
          vaultStatuses={vaultStatuses}
          onSave={(v) => { onChange(v); setShowDropdown(false) }}
          onCancel={() => setShowDropdown(false)}
        />
      )}
    </span>
  )
}

function AddNumberInput({ value, onChange, onKeyDown }: {
  value: string
  onChange: (v: string) => void
  onKeyDown: (e: React.KeyboardEvent) => void
}) {
  return (
    <Input
      className={`${ADD_INPUT_CLASS} font-mono tabular-nums`}
      type="text"
      inputMode="decimal"
      placeholder="0"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={onKeyDown}
      data-testid="add-property-number-input"
    />
  )
}

function AddPropertyValueInput({ displayMode, value, onChange, onKeyDown, vaultStatuses, locale }: {
  displayMode: PropertyDisplayMode; value: string; onChange: (v: string) => void
  onKeyDown: (e: React.KeyboardEvent) => void; vaultStatuses: string[]
  locale: AppLocale
}) {
  switch (displayMode) {
    case 'number':
      return <AddNumberInput value={value} onChange={onChange} onKeyDown={onKeyDown} />
    case 'boolean': return <AddBooleanInput value={value} locale={locale} onChange={onChange} />
    case 'date': return <AddDateInput value={value} locale={locale} onChange={onChange} />
    case 'status': return <AddStatusInput value={value} onChange={onChange} vaultStatuses={vaultStatuses} />
    case 'tags': return (
      <Input className={ADD_INPUT_CLASS} type="text" placeholder="tag1, tag2, ..." value={value}
        onChange={(e) => onChange(e.target.value)} onKeyDown={onKeyDown}
      />
    )
    default: return (
      <Input className={ADD_INPUT_CLASS} type="text" placeholder={translate(locale, 'inspector.properties.valuePlaceholder')} value={value}
        onChange={(e) => onChange(e.target.value)} onKeyDown={onKeyDown}
      />
    )
  }
}

export function AddPropertyForm({
  onAdd, onCancel, vaultStatuses, locale = 'en',
  allowEmptyValue = false, alignWithPropertyGrid = false, renderAsRow = false,
  initialKey = '', initialValue = '', initialMode = 'text',
}: {
  onAdd: (key: string, value: string, displayMode: PropertyDisplayMode) => void; onCancel: () => void
  vaultStatuses: string[]
  locale?: AppLocale
  allowEmptyValue?: boolean
  alignWithPropertyGrid?: boolean
  /** Render just the inner row div without an outer grid wrapper — for use inside an existing grid */
  renderAsRow?: boolean
  initialKey?: string
  initialValue?: string
  initialMode?: PropertyDisplayMode
}) {
  const [newKey, setNewKey] = useState(initialKey)
  const [newValue, setNewValue] = useState(initialMode === 'boolean' && !initialValue ? 'false' : initialValue)
  const [displayMode, setDisplayMode] = useState<PropertyDisplayMode>(initialMode)
  const canSubmit = canSubmitProperty({ key: newKey, value: newValue, displayMode, allowEmptyValue })

  const handleModeChange = (mode: PropertyDisplayMode) => {
    setDisplayMode(mode)
    if (mode === 'boolean') setNewValue('false')
    else if (mode !== displayMode) setNewValue('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && canSubmit) onAdd(newKey, newValue, displayMode)
    else if (e.key === 'Escape') onCancel()
  }

  const containerClassName = alignWithPropertyGrid
    ? 'grid min-w-0 gap-x-2 gap-y-1.5'
    : 'mt-1 flex flex-wrap items-center gap-1.5 rounded px-1.5 py-1'

  const formClassName = (alignWithPropertyGrid || renderAsRow)
    ? 'group/prop grid min-h-7 min-w-0 grid-cols-2 items-center gap-2 rounded px-1.5 outline-none transition-colors hover:bg-muted'
    : 'contents'

  const rowContent = (
    <div className={formClassName} style={(alignWithPropertyGrid || renderAsRow) ? PROPERTY_PANEL_ROW_STYLE : undefined}>
      <div className="flex min-w-0 items-center gap-1.5">
        <Input
          className="h-[26px] w-20 shrink-0 rounded border border-border bg-muted px-1.5 text-[12px] text-foreground outline-none focus:border-primary"
          type="text" placeholder={translate(locale, 'inspector.properties.propertyName')} value={newKey}
          onChange={(e) => setNewKey(e.target.value)} onKeyDown={handleKeyDown} autoFocus
          data-testid="add-property-key-input"
        />
        <Select value={displayMode} onValueChange={(v) => handleModeChange(v as PropertyDisplayMode)}>
          <SelectTrigger
            size="sm"
            className="h-[26px] w-[72px] shrink-0 gap-1 border-border bg-muted px-1.5 py-0 shadow-none"
            style={{ fontSize: 12, borderRadius: 4 }}
            data-testid="add-property-type-trigger"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper" side="left">
            {DISPLAY_MODE_OPTIONS.map(opt => {
              const OptIcon = DISPLAY_MODE_ICONS[opt.value]
              return (
                <SelectItem key={opt.value} value={opt.value}>
                  <OptIcon className="size-3.5 text-muted-foreground" />
                  {opt.label}
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
      </div>
      <div className="flex min-w-0 items-center gap-1.5">
        <AddPropertyValueInput displayMode={displayMode} value={newValue} onChange={setNewValue} onKeyDown={handleKeyDown} vaultStatuses={vaultStatuses} locale={locale} />
        <Button
          size="icon-xs" onClick={() => onAdd(newKey, newValue, displayMode)}
          disabled={!canSubmit} title={translate(locale, 'inspector.properties.addProperty')}
          data-testid="add-property-confirm"
        >
          <Check className="size-3.5" />
        </Button>
        <Button size="icon-xs" variant="outline" onClick={onCancel} title={translate(locale, 'common.cancel')} data-testid="add-property-cancel">
          <X className="size-3.5" />
        </Button>
      </div>
    </div>
  )

  if (renderAsRow) {
    return rowContent
  }

  return (
    <div className={containerClassName} style={alignWithPropertyGrid ? PROPERTY_PANEL_GRID_STYLE : undefined} data-testid="add-property-form">
      {rowContent}
    </div>
  )
}
