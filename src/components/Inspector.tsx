import { useMemo } from 'react'
import type { VaultEntry } from '../types'
import './Inspector.css'

interface InspectorProps {
  collapsed: boolean
  onToggle: () => void
  entry: VaultEntry | null
  content: string | null
  entries: VaultEntry[]
  allContent: Record<string, string>
  onNavigate: (target: string) => void
}

const STATUS_COLORS: Record<string, string> = {
  Active: '#4caf50',
  Done: '#2196f3',
  Paused: '#ff9800',
  Archived: '#9e9e9e',
  Dropped: '#f44336',
}

function formatDate(timestamp: number | null): string {
  if (!timestamp) return '—'
  const d = new Date(timestamp * 1000)
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function countWords(content: string | null): number {
  if (!content) return 0
  // Strip YAML frontmatter
  const stripped = content.replace(/^---[\s\S]*?---\n?/, '')
  const words = stripped.trim().split(/\s+/).filter((w) => w.length > 0)
  return words.length
}

/** Extract display name from a wikilink like "[[responsibility/grow-newsletter]]" */
function wikilinkDisplay(ref: string): string {
  const inner = ref.replace(/^\[\[|\]\]$/g, '')
  // Take last path segment and convert to title case
  const last = inner.split('/').pop() ?? inner
  return last.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

/** Extract the raw target for navigation from a wikilink ref */
function wikilinkTarget(ref: string): string {
  return ref.replace(/^\[\[|\]\]$/g, '').split('/').pop()?.replace(/-/g, ' ') ?? ref
}

function RelationshipGroup({ label, refs, onNavigate }: { label: string; refs: string[]; onNavigate: (target: string) => void }) {
  if (refs.length === 0) return null
  return (
    <div className="inspector__rel-group">
      <span className="inspector__rel-label">{label}</span>
      <div className="inspector__rel-links">
        {refs.map((ref) => (
          <button
            key={ref}
            className="inspector__rel-link"
            onClick={() => onNavigate(wikilinkTarget(ref))}
          >
            {wikilinkDisplay(ref)}
          </button>
        ))}
      </div>
    </div>
  )
}

function RelationshipsPanel({ entry, onNavigate }: { entry: VaultEntry; onNavigate: (target: string) => void }) {
  const hasAny = entry.belongsTo.length > 0 || entry.relatedTo.length > 0

  if (!hasAny) {
    return (
      <div className="inspector__section">
        <h4>Relationships</h4>
        <p className="inspector__empty">No relationships</p>
      </div>
    )
  }

  return (
    <div className="inspector__section">
      <h4>Relationships</h4>
      <RelationshipGroup label="Belongs to" refs={entry.belongsTo} onNavigate={onNavigate} />
      <RelationshipGroup label="Related to" refs={entry.relatedTo} onNavigate={onNavigate} />
    </div>
  )
}

function PropertiesPanel({ entry, content }: { entry: VaultEntry; content: string | null }) {
  const statusColor = entry.status ? STATUS_COLORS[entry.status] ?? '#888' : undefined
  const wordCount = countWords(content)

  return (
    <div className="inspector__section">
      <h4>Properties</h4>
      <div className="inspector__props">
        {entry.isA && (
          <div className="inspector__prop">
            <span className="inspector__prop-label">Type</span>
            <span className="inspector__prop-value">{entry.isA}</span>
          </div>
        )}
        {entry.status && (
          <div className="inspector__prop">
            <span className="inspector__prop-label">Status</span>
            <span
              className="inspector__status-pill"
              style={{ backgroundColor: statusColor }}
            >
              {entry.status}
            </span>
          </div>
        )}
        {entry.owner && (
          <div className="inspector__prop">
            <span className="inspector__prop-label">Owner</span>
            <span className="inspector__prop-value">{entry.owner}</span>
          </div>
        )}
        {entry.cadence && (
          <div className="inspector__prop">
            <span className="inspector__prop-label">Cadence</span>
            <span className="inspector__prop-value">{entry.cadence}</span>
          </div>
        )}
        <div className="inspector__prop">
          <span className="inspector__prop-label">Modified</span>
          <span className="inspector__prop-value">{formatDate(entry.modifiedAt)}</span>
        </div>
        <div className="inspector__prop">
          <span className="inspector__prop-label">Words</span>
          <span className="inspector__prop-value">{wordCount}</span>
        </div>
      </div>
      <button className="inspector__add-prop" disabled>
        + Add property
      </button>
    </div>
  )
}

/** Find all entries whose content contains a wikilink to the current note */
function useBacklinks(
  entry: VaultEntry | null,
  entries: VaultEntry[],
  allContent: Record<string, string>
): VaultEntry[] {
  return useMemo(() => {
    if (!entry) return []
    // Build patterns to match: [[title]], [[filename-without-ext]], [[path-segment/filename-without-ext]]
    const title = entry.title
    const stem = entry.filename.replace(/\.md$/, '')
    // Also match by aliases
    const targets = [title, ...entry.aliases]
    // Also match path-based links like [[project/26q1-laputa-app]]
    const pathStem = entry.path.replace(/^.*\/Laputa\//, '').replace(/\.md$/, '')

    return entries.filter((e) => {
      if (e.path === entry.path) return false
      const content = allContent[e.path]
      if (!content) return false
      // Check for any [[target]] pattern in the content
      for (const t of targets) {
        if (content.includes(`[[${t}]]`)) return true
      }
      if (content.includes(`[[${stem}]]`)) return true
      if (content.includes(`[[${pathStem}]]`)) return true
      return false
    })
  }, [entry, entries, allContent])
}

function BacklinksPanel({ backlinks, onNavigate }: { backlinks: VaultEntry[]; onNavigate: (target: string) => void }) {
  return (
    <div className="inspector__section">
      <h4>Backlinks {backlinks.length > 0 && <span className="inspector__count">{backlinks.length}</span>}</h4>
      {backlinks.length === 0 ? (
        <p className="inspector__empty">No backlinks</p>
      ) : (
        <div className="inspector__backlinks">
          {backlinks.map((e) => (
            <button
              key={e.path}
              className="inspector__backlink"
              onClick={() => onNavigate(e.title)}
            >
              <span className="inspector__backlink-title">{e.title}</span>
              {e.isA && <span className="inspector__backlink-type">{e.isA}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function Inspector({ collapsed, onToggle, entry, content, entries, allContent, onNavigate }: InspectorProps) {
  const backlinks = useBacklinks(entry, entries, allContent)

  return (
    <aside className={`inspector ${collapsed ? 'inspector--collapsed' : ''}`}>
      <div className="inspector__header">
        <button className="inspector__toggle" onClick={onToggle}>
          {collapsed ? '\u25C0' : '\u25B6'}
        </button>
        {!collapsed && <h3>Inspector</h3>}
      </div>
      {!collapsed && (
        <div className="inspector__content">
          {entry ? (
            <>
              <PropertiesPanel entry={entry} content={content} />
              <RelationshipsPanel entry={entry} onNavigate={onNavigate} />
              <BacklinksPanel backlinks={backlinks} onNavigate={onNavigate} />
            </>
          ) : (
            <>
              <div className="inspector__section">
                <h4>Properties</h4>
                <p className="inspector__empty">No note selected</p>
              </div>
              <div className="inspector__section">
                <h4>Relationships</h4>
                <p className="inspector__empty">No relationships</p>
              </div>
              <div className="inspector__section">
                <h4>Backlinks</h4>
                <p className="inspector__empty">No backlinks</p>
              </div>
            </>
          )}
        </div>
      )}
    </aside>
  )
}
