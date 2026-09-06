import ReactMarkdown from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'
import 'highlight.js/styles/github-dark.css'
import { Check, Clock3, Edit3, LoaderCircle } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { saveNote } from '../services/tauriService'

type EditorProps = { path: string; name: string; content: string; onSaved: (content: string) => Promise<void> | void }

export function Editor({ path, name, content, onSaved }: EditorProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(content)
  const [saving, setSaving] = useState(false)
  const editorRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => setDraft(content), [content, path])
  useEffect(() => {
    if (isEditing) editorRef.current?.focus()
  }, [isEditing])

  async function persist() {
    if (saving) return
    setSaving(true)
    try {
      await saveNote(path, draft)
      await onSaved(draft)
      setIsEditing(false)
    } finally {
      setSaving(false)
    }
  }

  async function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Escape') {
      await persist()
    }
    if (event.key.toLowerCase() === 's' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault()
      await persist()
    }
  }

  return <section className="flex min-w-0 flex-1 flex-col overflow-hidden bg-zinc-950">
    <div className="flex h-14 shrink-0 items-center justify-between border-b border-zinc-800/80 px-6 text-xs text-zinc-600"><div className="flex min-w-0 items-center gap-2"><Clock3 size={14} /><span className="truncate">{name}</span><span className="text-zinc-800">/</span><span>Markdown</span></div><div className="flex items-center gap-2">{saving && <LoaderCircle size={14} className="animate-spin text-emerald-400" />}{!isEditing && <button onClick={() => setIsEditing(true)} className="inline-flex items-center gap-1.5 rounded px-2 py-1.5 transition hover:bg-zinc-900 hover:text-zinc-300" title="Düzenle"><Edit3 size={14} />Düzenle</button>}{!isEditing && !saving && <Check size={14} className="text-emerald-400" />}</div></div>
    {isEditing ? <textarea ref={editorRef} value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => void handleKeyDown(event)} onBlur={() => void persist()} className="min-h-0 flex-1 resize-none bg-zinc-950 px-8 py-8 font-mono text-sm leading-7 text-zinc-300 outline-none md:px-16" spellCheck={false} aria-label="Markdown düzenleyici" /> : <div onDoubleClick={() => setIsEditing(true)} className="min-h-0 flex-1 cursor-text overflow-y-auto"><article className="markdown-content mx-auto max-w-3xl px-8 pb-24 pt-12 md:px-16"><ReactMarkdown rehypePlugins={[rehypeHighlight]}>{content}</ReactMarkdown></article></div>}
  </section>
}
