import { FolderOpen, HardDrive } from 'lucide-react'
import { useState } from 'react'
import { selectWorkspaceFolder } from '../services/tauriService'

type WorkspacePickerProps = { onWorkspaceSelected: (path: string) => Promise<void> | void }

export function WorkspacePicker({ onWorkspaceSelected }: WorkspacePickerProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function chooseFolder() {
    setLoading(true)
    setError('')
    try {
      const path = await selectWorkspaceFolder()
      if (path) await onWorkspaceSelected(path)
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Workspace seçilemedi.')
    } finally {
      setLoading(false)
    }
  }

  return <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-6 text-zinc-100">
    <section className="w-full max-w-md border border-zinc-800 bg-zinc-900/70 p-10 text-center shadow-2xl shadow-black/20">
      <div className="mx-auto mb-7 flex h-14 w-14 items-center justify-center border border-emerald-400/30 bg-emerald-400/10 text-emerald-300"><HardDrive size={25} /></div>
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-400">Local-first notes</p>
      <h1 className="text-3xl font-semibold tracking-tight">Workspace’ini aç</h1>
      <p className="mt-4 text-sm leading-6 text-zinc-500">Markdown notlarının bulunduğu klasörü seç. Takex dosyalarını doğrudan cihazından okuyup kaydeder.</p>
      <button onClick={() => void chooseFolder()} disabled={loading} className="mt-8 inline-flex items-center gap-2 bg-emerald-400 px-5 py-3 text-sm font-medium text-zinc-950 transition hover:bg-emerald-300 disabled:cursor-wait disabled:opacity-60"><FolderOpen size={17} />{loading ? 'Açılıyor…' : 'Select Workspace Folder'}</button>
      {error && <p className="mt-5 text-xs text-red-300">{error}</p>}
    </section>
  </main>
}
