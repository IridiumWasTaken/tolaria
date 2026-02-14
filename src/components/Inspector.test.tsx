import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { Inspector } from './Inspector'
import type { VaultEntry } from '../types'

const mockEntry: VaultEntry = {
  path: '/vault/project/test.md',
  filename: 'test.md',
  title: 'Test Project',
  isA: 'Project',
  aliases: [],
  belongsTo: ['[[responsibility/grow-newsletter]]'],
  relatedTo: ['[[topic/software-development]]'],
  status: 'Active',
  owner: 'Luca Rossi',
  cadence: null,
  modifiedAt: 1707900000,
  fileSize: 1024,
}

const mockContent = `---
title: Test Project
is_a: Project
status: Active
---

# Test Project

This is a test note with some words to count.
`

const referrerEntry: VaultEntry = {
  path: '/vault/note/referrer.md',
  filename: 'referrer.md',
  title: 'Referrer Note',
  isA: 'Note',
  aliases: [],
  belongsTo: [],
  relatedTo: [],
  status: null,
  owner: null,
  cadence: null,
  modifiedAt: 1707900000,
  fileSize: 200,
}

const allContent: Record<string, string> = {
  '/vault/note/referrer.md': '# Referrer\n\nSee [[Test Project]] for details.',
  '/vault/project/test.md': '# Test Project\n\nSome content.',
}

const defaultProps = {
  collapsed: false,
  onToggle: () => {},
  entry: null as VaultEntry | null,
  content: null as string | null,
  entries: [] as VaultEntry[],
  allContent: {} as Record<string, string>,
  onNavigate: () => {},
}

describe('Inspector', () => {
  it('renders expanded state with "no note selected"', () => {
    render(<Inspector {...defaultProps} />)
    expect(screen.getByText('Inspector')).toBeInTheDocument()
    expect(screen.getByText('Properties')).toBeInTheDocument()
    expect(screen.getByText('No note selected')).toBeInTheDocument()
  })

  it('renders collapsed state without sections', () => {
    render(<Inspector {...defaultProps} collapsed={true} />)
    expect(screen.queryByText('Inspector')).not.toBeInTheDocument()
    expect(screen.queryByText('Properties')).not.toBeInTheDocument()
  })

  it('calls onToggle when toggle button clicked', () => {
    const onToggle = vi.fn()
    render(<Inspector {...defaultProps} onToggle={onToggle} />)
    fireEvent.click(screen.getByRole('button'))
    expect(onToggle).toHaveBeenCalledOnce()
  })

  it('shows properties when a note is selected', () => {
    render(<Inspector {...defaultProps} entry={mockEntry} content={mockContent} />)
    expect(screen.getByText('Project')).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
    expect(screen.getByText('Luca Rossi')).toBeInTheDocument()
    expect(screen.getByText('Type')).toBeInTheDocument()
    expect(screen.getByText('Status')).toBeInTheDocument()
    expect(screen.getByText('Owner')).toBeInTheDocument()
    expect(screen.getByText('Words')).toBeInTheDocument()
  })

  it('renders status as a colored pill', () => {
    render(<Inspector {...defaultProps} entry={mockEntry} content={mockContent} />)
    const pill = screen.getByText('Active')
    expect(pill).toHaveClass('inspector__status-pill')
    expect(pill).toHaveStyle({ backgroundColor: '#4caf50' })
  })

  it('computes word count from content minus frontmatter', () => {
    render(<Inspector {...defaultProps} entry={mockEntry} content={mockContent} />)
    // "# Test Project" + "This is a test note with some words to count." = 13 words
    expect(screen.getByText('13')).toBeInTheDocument()
  })

  it('shows "Add property" button as disabled placeholder', () => {
    render(<Inspector {...defaultProps} entry={mockEntry} content={mockContent} />)
    const btn = screen.getByText('+ Add property')
    expect(btn).toBeDisabled()
  })

  it('shows cadence when present', () => {
    const entryWithCadence = { ...mockEntry, cadence: 'Weekly' }
    render(<Inspector {...defaultProps} entry={entryWithCadence} content={mockContent} />)
    expect(screen.getByText('Cadence')).toBeInTheDocument()
    expect(screen.getByText('Weekly')).toBeInTheDocument()
  })

  it('shows relationships with clickable links', () => {
    render(<Inspector {...defaultProps} entry={mockEntry} content={mockContent} />)
    expect(screen.getByText('Belongs to')).toBeInTheDocument()
    expect(screen.getByText('Grow Newsletter')).toBeInTheDocument()
    expect(screen.getByText('Related to')).toBeInTheDocument()
    expect(screen.getByText('Software Development')).toBeInTheDocument()
  })

  it('navigates when a relationship link is clicked', () => {
    const onNavigate = vi.fn()
    render(<Inspector {...defaultProps} entry={mockEntry} content={mockContent} onNavigate={onNavigate} />)
    fireEvent.click(screen.getByText('Grow Newsletter'))
    expect(onNavigate).toHaveBeenCalledWith('grow newsletter')
  })

  it('shows "No relationships" when entry has no belongsTo/relatedTo', () => {
    const noRels = { ...mockEntry, belongsTo: [], relatedTo: [] }
    render(<Inspector {...defaultProps} entry={noRels} content={mockContent} />)
    expect(screen.getByText('No relationships')).toBeInTheDocument()
  })

  it('shows backlinks from notes that reference the current note', () => {
    render(
      <Inspector
        {...defaultProps}
        entry={mockEntry}
        content={mockContent}
        entries={[mockEntry, referrerEntry]}
        allContent={allContent}
      />
    )
    expect(screen.getByText('Referrer Note')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument() // count badge
  })

  it('shows "No backlinks" when no notes reference the current note', () => {
    render(
      <Inspector
        {...defaultProps}
        entry={mockEntry}
        content={mockContent}
        entries={[mockEntry]}
        allContent={{}}
      />
    )
    expect(screen.getByText('No backlinks')).toBeInTheDocument()
  })

  it('navigates when a backlink is clicked', () => {
    const onNavigate = vi.fn()
    render(
      <Inspector
        {...defaultProps}
        entry={mockEntry}
        content={mockContent}
        entries={[mockEntry, referrerEntry]}
        allContent={allContent}
        onNavigate={onNavigate}
      />
    )
    fireEvent.click(screen.getByText('Referrer Note'))
    expect(onNavigate).toHaveBeenCalledWith('Referrer Note')
  })
})
