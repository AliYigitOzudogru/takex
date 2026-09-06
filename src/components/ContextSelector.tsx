import { Check, FileText, Folder, X } from 'lucide-react'
import { useState } from 'react'
import type { WorkspaceEntry } from '../types/workspace'

type ContextSelectorProps = {
  workspace: WorkspaceEntry
  onClose: () => void
  onStart: (paths: string[]) => Promise<void>
}

export function ContextSelector({ workspace, onClose, onStart }: ContextSelectorProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [starting, setStarting] = useState(false)

  function toggle(path: string) {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  async function start() {
    if (!selected.size || starting) return
    setStarting(true)
    try {
      await onStart([...selected])
    } finally {
      setStarting(false)
    }
  }

  function renderEntry(entry: WorkspaceEntry, depth: number): React.ReactNode {
    if (entry.kind === 'note') return <label key={entry.path} style={{ paddingLeft: `${depth * 18 + 12}px` }} className="flex cursor-pointer items-center gap-3 border-b border-zinc-800/60 py-2.5 pr-3 text-sm text-zinc-300 transition hover:bg-zinc-800/50"><input type="checkbox" checked={selected.has(entry.path)} onChange={() => toggle(entry.path)} className="accent-emerald-400" /><FileText size={14} className="shrink-0 text-zinc-500" /><span className="truncate">{entry.name}</span></label>
    return <div key={entry.path}><div style={{ paddingLeft: `${depth * 18 + 12}px` }} className="flex items-center gap-2 border-b border-zinc-800/60 py-2 text-xs font-medium text-emerald-300"><Folder size={14} />{entry.name}</div>{entry.children.map((child) => renderEntry(child, depth + 1))}</div>
  }

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-5 backdrop-blur-sm"><section role="dialog" aria-modal="true" aria-labelledby="context-selector-title" className="flex max-h-[min(680px,90vh)] w-full max-w-xl flex-col border border-zinc-700 bg-zinc-950 shadow-2xl shadow-black/50"><header className="flex items-start justify-between border-b border-zinc-800 px-6 py-5"><div><p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-400">Yerel bağlam</p><h2 id="context-selector-title" className="text-xl font-semibold text-zinc-100">Notlarını seç</h2><p className="mt-1 text-xs text-zinc-500">Sohbetin cevapları seçtiğin notlara dayanacak.</p></div><button type="button" onClick={onClose} title="Kapat" className="rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"><X size={18} /></button></header><div className="min-h-0 flex-1 overflow-y-auto py-2">{workspace.children.length ? workspace.children.map((entry) => renderEntry(entry, 0)) : <p className="px-6 py-10 text-center text-sm text-zinc-600">Workspace içinde Markdown notu yok.</p>}</div><footer className="flex items-center justify-between border-t border-zinc-800 px-6 py-4"><span className="text-xs text-zinc-600">{selected.size} not seçildi</span><button type="button" onClick={() => void start()} disabled={!selected.size || starting} className="inline-flex items-center gap-2 bg-emerald-400 px-4 py-2.5 text-xs font-semibold text-zinc-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"><Check size={14} />{starting ? 'Hazırlanıyor...' : 'Sohbeti Başlat'}</button></footer></section></div>
}