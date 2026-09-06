import { join } from '@tauri-apps/api/path'
import { ChevronDown, ChevronRight, FilePlus, FileText, Folder, FolderOpen, FolderPlus, HardDrive, Sparkles, Trash2 } from 'lucide-react'
import { useEffect, useState, type MouseEvent } from 'react'
import { createDirectory, createNote } from '../services/tauriService'
import type { WorkspaceEntry } from '../types/workspace'

type SidebarProps = {
  workspace: WorkspaceEntry
  selectedPath?: string
  onSelectNote: (entry: WorkspaceEntry) => void
  onChangeWorkspace: () => void
  onWorkspaceChanged: () => Promise<void> | void
  onGenerateNote: (folder: WorkspaceEntry) => void
  onDelete: (entry: WorkspaceEntry) => Promise<void> | void
}

type EntryProps = {
  entry: WorkspaceEntry
  depth: number
  selectedPath?: string
  onSelectNote: (entry: WorkspaceEntry) => void
  onCreateDirectory: (parentPath: string) => Promise<void>
  onCreateNote: (parentPath: string) => Promise<void>
  onGenerateNote: (folder: WorkspaceEntry) => void
  onDelete: (entry: WorkspaceEntry) => Promise<void> | void
  onContextMenu: (event: MouseEvent, entry: WorkspaceEntry) => void
}

function cleanName(value: string): string {
  return value.trim().replace(/[\\/]/g, '')
}

function EntryTree({ entry, depth, selectedPath, onSelectNote, onCreateDirectory, onCreateNote, onGenerateNote, onDelete, onContextMenu }: EntryProps) {
  const [open, setOpen] = useState(true)
  const hasChildren = entry.children.length > 0
  const isSelected = entry.kind === 'note' && selectedPath === entry.path

  if (entry.kind === 'note') return <div onContextMenu={(event) => onContextMenu(event, entry)} style={{ paddingLeft: `${16 + depth * 14}px` }} className={`group flex items-center gap-2 rounded px-2 py-1.5 text-[13px] transition ${isSelected ? 'bg-zinc-800/80 text-emerald-300' : 'text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300'}`}><button type="button" onClick={() => onSelectNote(entry)} className="flex min-w-0 flex-1 items-center gap-2 text-left"><FileText size={14} className={isSelected ? 'text-emerald-400' : 'text-zinc-600'} /><span className="truncate">{entry.name}</span></button><button type="button" onClick={(event) => { event.stopPropagation(); void onDelete(entry) }} title="Sil" aria-label={`${entry.name} notunu sil`} className="rounded p-1 text-zinc-500 transition hover:bg-red-400/10 hover:text-red-300"><Trash2 size={13} /></button></div>

  return <div>
    <div onContextMenu={(event) => onContextMenu(event, entry)} style={{ paddingLeft: `${8 + depth * 14}px` }} className="group flex items-center gap-1 rounded px-2 py-1.5 text-sm text-zinc-300 hover:bg-zinc-900">
      <button type="button" onClick={() => setOpen((current) => !current)} className="flex min-w-0 flex-1 items-center gap-1 text-left"><span className="text-zinc-600">{hasChildren ? (open ? <ChevronDown size={13} /> : <ChevronRight size={13} />) : <span className="inline-block w-[13px]" />}</span>{open ? <FolderOpen size={15} className="text-emerald-400" /> : <Folder size={15} className="text-emerald-400" />}<span className="truncate">{entry.name}</span></button>
      <button type="button" onClick={(event) => { event.stopPropagation(); void onCreateDirectory(entry.path) }} title="Yeni klasör" className="rounded p-1 text-zinc-600 opacity-0 transition group-hover:opacity-100 hover:bg-zinc-800 hover:text-emerald-300"><FolderPlus size={14} /></button>
      <button type="button" onClick={(event) => { event.stopPropagation(); void onCreateNote(entry.path) }} title="Yeni not" className="rounded p-1 text-zinc-600 opacity-0 transition group-hover:opacity-100 hover:bg-zinc-800 hover:text-emerald-300"><FilePlus size={14} /></button><button type="button" onClick={(event) => { event.stopPropagation(); onGenerateNote(entry) }} title="AI ile Not Ekle" className="rounded p-1 text-zinc-600 opacity-0 transition group-hover:opacity-100 hover:bg-zinc-800 hover:text-emerald-300"><Sparkles size={14} /></button>{depth > 0 && <button type="button" onClick={(event) => { event.stopPropagation(); void onDelete(entry) }} title="Klasörü sil" aria-label={`${entry.name} klasörünü sil`} className="rounded p-1 text-zinc-500 transition hover:bg-red-400/10 hover:text-red-300"><Trash2 size={13} /></button>}
    </div>
    {open && entry.children.map((child) => <EntryTree key={child.path} entry={child} depth={depth + 1} selectedPath={selectedPath} onSelectNote={onSelectNote} onCreateDirectory={onCreateDirectory} onCreateNote={onCreateNote} onGenerateNote={onGenerateNote} onDelete={onDelete} onContextMenu={onContextMenu} />)}
  </div>
}

export function Sidebar({ workspace, selectedPath, onSelectNote, onChangeWorkspace, onWorkspaceChanged, onGenerateNote, onDelete }: SidebarProps) {
  const [error, setError] = useState('')
  const [contextMenu, setContextMenu] = useState<{ entry: WorkspaceEntry; x: number; y: number }>()

  useEffect(() => {
    const closeMenu = () => setContextMenu(undefined)
    window.addEventListener('click', closeMenu)
    return () => window.removeEventListener('click', closeMenu)
  }, [])

  function openContextMenu(event: MouseEvent, entry: WorkspaceEntry) {
    event.preventDefault()
    event.stopPropagation()
    if (entry.path === workspace.path) {
      setContextMenu(undefined)
      return
    }
    setContextMenu({ entry, x: event.clientX, y: event.clientY })
  }

  async function createFolder(parentPath: string) {
    const input = window.prompt('Yeni klasör adı')
    const name = input ? cleanName(input) : ''
    if (!name) return
    try {
      setError('')
      await createDirectory(await join(parentPath, name))
      await onWorkspaceChanged()
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Klasör oluşturulamadı.')
    }
  }

  async function createMarkdownNote(parentPath: string) {
    const input = window.prompt('Yeni not adı')
    const name = input ? cleanName(input) : ''
    if (!name) return
    const filename = name.toLowerCase().endsWith('.md') ? name : `${name}.md`
    try {
      setError('')
      await createNote(await join(parentPath, filename))
      await onWorkspaceChanged()
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Not oluşturulamadı.')
    }
  }

  return <aside className="flex w-[280px] shrink-0 flex-col border-r border-zinc-800/80 bg-zinc-950">
    <div className="flex h-16 items-center justify-between border-b border-zinc-800/80 px-5"><div className="flex items-center gap-2.5"><div className="flex h-7 w-7 items-center justify-center bg-emerald-400 text-xs font-bold text-zinc-950">T</div><span className="text-sm font-semibold tracking-wide text-zinc-100">TAKEX</span></div></div>
    <div className="flex items-center justify-between px-5 pb-2 pt-6"><span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">Workspace</span><div className="flex items-center gap-1"><button onClick={() => void createFolder(workspace.path)} title="Yeni klasör" className="rounded p-1 text-zinc-600 transition hover:bg-zinc-800 hover:text-emerald-300"><FolderPlus size={15} /></button><button onClick={() => void createMarkdownNote(workspace.path)} title="Yeni not" className="rounded p-1 text-zinc-600 transition hover:bg-zinc-800 hover:text-emerald-300"><FilePlus size={15} /></button><button onClick={onChangeWorkspace} title="Workspace değiştir" className="rounded p-1 text-zinc-600 transition hover:bg-zinc-800 hover:text-emerald-300"><HardDrive size={15} /></button></div></div>
    <div className="relative flex-1 overflow-y-auto px-3 pb-5"><EntryTree entry={workspace} depth={0} selectedPath={selectedPath} onSelectNote={onSelectNote} onCreateDirectory={createFolder} onCreateNote={createMarkdownNote} onGenerateNote={onGenerateNote} onDelete={onDelete} onContextMenu={openContextMenu} />{error && <p className="mt-4 px-2 text-xs leading-5 text-red-300">{error}</p>}{contextMenu && <div onClick={(event) => event.stopPropagation()} style={{ left: contextMenu.x, top: contextMenu.y }} className="fixed z-50 min-w-36 border border-zinc-700 bg-zinc-900 py-1 shadow-xl shadow-black/40"><button onClick={() => { setContextMenu(undefined); void onDelete(contextMenu.entry) }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-red-300 transition hover:bg-red-400/10"><Trash2 size={14} />Sil</button></div>}</div>
    <div className="border-t border-zinc-800/80 px-5 py-4 text-[11px] text-zinc-600"><span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />Dosyalar cihazında</div>
  </aside>
}
