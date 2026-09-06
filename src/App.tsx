import { AlertCircle, LoaderCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { AiGeneratorView } from './components/AiGeneratorView'
import { Editor } from './components/Editor'
import { Sidebar } from './components/Sidebar'
import { WorkspacePicker } from './components/WorkspacePicker'
import { createNote, deleteItem, getNote, getWorkspace, saveNote } from './services/tauriService'
import type { WorkspaceEntry } from './types/workspace'

const WORKSPACE_STORAGE_KEY = 'takex_workspace_path'

function firstNote(entry: WorkspaceEntry): WorkspaceEntry | undefined {
  if (entry.kind === 'note') return entry
  for (const child of entry.children) {
    const note = firstNote(child)
    if (note) return note
  }
  return undefined
}

function findEntry(entry: WorkspaceEntry, path: string): WorkspaceEntry | undefined {
  if (entry.path === path) return entry
  for (const child of entry.children) {
    const match = findEntry(child, path)
    if (match) return match
  }
  return undefined
}

function folderLabel(workspace: WorkspaceEntry, folderPath: string): string {
  const folder = findEntry(workspace, folderPath)
  if (!folder) return folderPath
  const relative = folderPath.startsWith(workspace.path) ? folderPath.slice(workspace.path.length).replace(/^[/\\]+/, '') : folderPath
  return relative || folder.name
}

function AppShell() {
  const [workspacePath, setWorkspacePath] = useState(() => localStorage.getItem(WORKSPACE_STORAGE_KEY) ?? '')
  const [workspace, setWorkspace] = useState<WorkspaceEntry>()
  const [selectedNote, setSelectedNote] = useState<WorkspaceEntry>()
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(Boolean(workspacePath))
  const [error, setError] = useState('')
  const [targetFolder, setTargetFolder] = useState<WorkspaceEntry>()

  async function loadWorkspace(path: string) {
    setLoading(true)
    setError('')
    try {
      const nextWorkspace = await getWorkspace(path)
      setWorkspace(nextWorkspace)
      const initialNote = firstNote(nextWorkspace)
      if (initialNote) {
        setSelectedNote(initialNote)
        setContent(await getNote(initialNote.path))
      } else {
        setSelectedNote(undefined)
        setContent('')
      }
    } catch (caughtError) {
      localStorage.removeItem(WORKSPACE_STORAGE_KEY)
      setWorkspacePath('')
      setError(caughtError instanceof Error ? caughtError.message : 'Workspace yüklenemedi.')
    } finally {
      setLoading(false)
    }
  }

  async function refreshWorkspace(path: string) {
    try {
      setWorkspace(await getWorkspace(path))
      setError('')
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Workspace yenilenemedi.')
    }
  }

  useEffect(() => {
    if (workspacePath) void loadWorkspace(workspacePath)
  }, [])

  async function handleWorkspaceSelected(path: string) {
    localStorage.setItem(WORKSPACE_STORAGE_KEY, path)
    setWorkspacePath(path)
    await loadWorkspace(path)
  }

  async function handleSelectNote(entry: WorkspaceEntry) {
    setError('')
    setTargetFolder(undefined)
    try {
      setSelectedNote(entry)
      setContent(await getNote(entry.path))
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Not okunamadı.')
    }
  }

  function handleGenerateNote(folder: WorkspaceEntry) {
    setError('')
    setTargetFolder(folder)
    setSelectedNote(undefined)
  }

  async function handleGeneratedNote(path: string, markdown: string) {
    await createNote(path)
    await saveNote(path, markdown)
    const nextWorkspace = await getWorkspace(workspacePath)
    const createdNote = findEntry(nextWorkspace, path)
    setWorkspace(nextWorkspace)
    if (!createdNote) throw new Error('Üretilen not workspace ağacında bulunamadı.')
    setTargetFolder(undefined)
    setSelectedNote(createdNote)
    setContent(markdown)
  }

  async function handleDelete(entry: WorkspaceEntry) {
    const itemType = entry.kind === 'folder' ? 'klasörü ve içindeki tüm notları' : 'notu'
    if (!window.confirm(`"${entry.name}" ${itemType} silinsin mi? Bu işlem geri alınamaz.`)) return

    try {
      setError('')
      await deleteItem(entry.path)
      const nextWorkspace = await getWorkspace(workspacePath)
      setWorkspace(nextWorkspace)
      const deletedSelected = selectedNote && (selectedNote.path === entry.path || selectedNote.path.startsWith(`${entry.path}/`) || selectedNote.path.startsWith(`${entry.path}\\`))
      if (deletedSelected) {
        setSelectedNote(undefined)
        setContent('')
      }
      if (targetFolder && (targetFolder.path === entry.path || targetFolder.path.startsWith(`${entry.path}/`) || targetFolder.path.startsWith(`${entry.path}\\`))) setTargetFolder(undefined)
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Öğe silinemedi.')
    }
  }

  function changeWorkspace() {
    localStorage.removeItem(WORKSPACE_STORAGE_KEY)
    setWorkspacePath('')
    setWorkspace(undefined)
    setSelectedNote(undefined)
    setContent('')
  }

  if (!workspacePath) return <WorkspacePicker onWorkspaceSelected={handleWorkspaceSelected} />
  if (loading || !workspace) return <main className="flex min-h-screen items-center justify-center bg-zinc-950 text-emerald-300"><LoaderCircle className="animate-spin" size={22} /></main>

  return <div className="flex h-screen min-h-[560px] overflow-hidden bg-zinc-950"><Sidebar workspace={workspace} selectedPath={selectedNote?.path} onSelectNote={(entry) => void handleSelectNote(entry)} onChangeWorkspace={changeWorkspace} onWorkspaceChanged={() => refreshWorkspace(workspacePath)} onGenerateNote={handleGenerateNote} onDelete={handleDelete} /><main className="flex min-w-0 flex-1 flex-col">{error && <div className="flex items-center gap-2 border-b border-red-400/20 bg-red-400/5 px-6 py-3 text-xs text-red-300"><AlertCircle size={14} />{error}</div>}{targetFolder ? <AiGeneratorView targetFolderPath={targetFolder.path} targetFolderLabel={folderLabel(workspace, targetFolder.path)} onGenerated={handleGeneratedNote} /> : selectedNote ? <Editor path={selectedNote.path} name={selectedNote.name} content={content} onSaved={setContent} /> : <div className="flex flex-1 items-center justify-center text-sm text-zinc-600">Bu workspace içinde .md notu yok.</div>}</main></div>
}

export default function App() { return <AppShell /> }
