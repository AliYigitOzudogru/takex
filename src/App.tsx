import { AlertCircle, LoaderCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { AiGeneratorView } from './components/AiGeneratorView'
import { ChatWindow } from './components/ChatWindow'
import { ContextSelector } from './components/ContextSelector'
import { Editor } from './components/Editor'
import { Sidebar } from './components/Sidebar'
import { WorkspacePicker } from './components/WorkspacePicker'
import { askOllama } from './services/chatService'
import { loadChats, saveChats } from './services/chatStorage'
import type { ChatMessage, ChatSession } from './types/chat'
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
  const [activeView, setActiveView] = useState<'editor' | 'chat'>('editor')
  const [chats, setChats] = useState<ChatSession[]>([])
  const [selectedChatId, setSelectedChatId] = useState<string>()
  const [contextSelectorOpen, setContextSelectorOpen] = useState(false)

  async function loadWorkspace(path: string) {
    setLoading(true)
    setError('')
    try {
      const nextWorkspace = await getWorkspace(path)
      setWorkspace(nextWorkspace)
      setChats(await loadChats(path))
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
    setActiveView('editor')
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
    setActiveView('editor')
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

  async function handleStartChat(notePaths: string[]) {
    if (!workspace) return
    try {
      setError('')
      const notes = notePaths.map((path) => findEntry(workspace, path)).filter((entry): entry is WorkspaceEntry => Boolean(entry))
      const contents = await Promise.all(notes.map(async (note) => ({ note, content: await getNote(note.path) })))
      const context = contents.map(({ note, content }) => `# ${note.name}\n\n${content}`).join('\n\n---\n\n')
      const now = new Date().toISOString()
      const chat: ChatSession = { id: crypto.randomUUID(), title: notes.length === 1 ? notes[0].name.replace(/\.md$/i, '') : `${notes[0]?.name.replace(/\.md$/i, '') ?? 'Yeni'} + ${notes.length - 1} not`, notePaths: notes.map((note) => note.path), noteNames: notes.map((note) => note.name), context, messages: [], createdAt: now, updatedAt: now }
      const nextChats = [chat, ...chats]
      setChats(nextChats)
      await saveChats(workspacePath, nextChats)
      setSelectedChatId(chat.id)
      setActiveView('chat')
      setContextSelectorOpen(false)
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Sohbet başlatılamadı.')
    }
  }

  async function handleSendMessage(question: string) {
    const chat = chats.find((item) => item.id === selectedChatId)
    if (!chat) return
    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: question, createdAt: new Date().toISOString() }
    const withUserMessage = { ...chat, messages: [...chat.messages, userMessage], updatedAt: new Date().toISOString() }
    const chatsWithUser = chats.map((item) => item.id === chat.id ? withUserMessage : item)
    setChats(chatsWithUser)
    await saveChats(workspacePath, chatsWithUser)
    const assistantMessage: ChatMessage = { id: crypto.randomUUID(), role: 'assistant', content: await askOllama(chat.context, question), createdAt: new Date().toISOString() }
    const withAssistantMessage = { ...withUserMessage, messages: [...withUserMessage.messages, assistantMessage], updatedAt: new Date().toISOString() }
    const nextChats = chatsWithUser.map((item) => item.id === chat.id ? withAssistantMessage : item)
    setChats(nextChats)
    await saveChats(workspacePath, nextChats)
  }

  function changeWorkspace() {
    localStorage.removeItem(WORKSPACE_STORAGE_KEY)
    setWorkspacePath('')
    setWorkspace(undefined)
    setSelectedNote(undefined)
    setContent('')
    setChats([])
    setSelectedChatId(undefined)
    setActiveView('editor')
  }

  if (!workspacePath) return <WorkspacePicker onWorkspaceSelected={handleWorkspaceSelected} />
  if (loading || !workspace) return <main className="flex min-h-screen items-center justify-center bg-zinc-950 text-emerald-300"><LoaderCircle className="animate-spin" size={22} /></main>

  const selectedChat = chats.find((chat) => chat.id === selectedChatId)
  return <div className="flex h-screen min-h-[560px] min-w-0 overflow-hidden bg-zinc-950"><Sidebar workspace={workspace} activeView={activeView} onViewChange={setActiveView} chats={chats} selectedChatId={selectedChatId} onNewChat={() => setContextSelectorOpen(true)} onSelectChat={(chat) => { setSelectedChatId(chat.id); setActiveView('chat') }} selectedPath={selectedNote?.path} onSelectNote={(entry) => void handleSelectNote(entry)} onChangeWorkspace={changeWorkspace} onWorkspaceChanged={() => refreshWorkspace(workspacePath)} onGenerateNote={handleGenerateNote} onDelete={handleDelete} /><main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">{error && <div className="flex shrink-0 items-center gap-2 border-b border-red-400/20 bg-red-400/5 px-6 py-3 text-xs text-red-300"><AlertCircle size={14} />{error}</div>}{activeView === 'chat' && selectedChat ? <ChatWindow chat={selectedChat} onSend={handleSendMessage} onBackToNotes={() => setActiveView('editor')} /> : targetFolder ? <AiGeneratorView targetFolderPath={targetFolder.path} targetFolderLabel={folderLabel(workspace, targetFolder.path)} onGenerated={handleGeneratedNote} /> : selectedNote ? <Editor path={selectedNote.path} name={selectedNote.name} content={content} onSaved={setContent} /> : <div className="flex min-h-0 flex-1 items-center justify-center text-sm text-zinc-600">Bu workspace içinde .md notu yok.</div>}</main>{contextSelectorOpen && <ContextSelector workspace={workspace} onClose={() => setContextSelectorOpen(false)} onStart={handleStartChat} />}</div>
}

export default function App() { return <AppShell /> }
