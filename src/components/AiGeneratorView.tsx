import { join } from '@tauri-apps/api/path'
import { ArrowUp, BrainCircuit, LoaderCircle, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { aiService } from '../services/aiService'

type AiGeneratorViewProps = {
  targetFolderPath: string
  targetFolderLabel: string
  onGenerated: (filename: string, content: string) => Promise<void>
}

export function AiGeneratorView({ targetFolderPath, targetFolderLabel, onGenerated }: AiGeneratorViewProps) {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function generate() {
    const userInput = input.trim()
    if (!userInput || loading) return
    setLoading(true)
    setError('')
    try {
      const content = await aiService.generateNote(userInput)
      const filename = `${slugify(userInput) || 'yeni-not'}.md`
      await onGenerated(await join(targetFolderPath, filename), content)
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Not üretilemedi.')
    } finally {
      setLoading(false)
    }
  }

  return <section className="flex flex-1 items-center justify-center overflow-y-auto bg-zinc-950 px-8 py-16"><div className="w-full max-w-2xl">
    <div className="mb-8 text-center"><div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center border border-emerald-400/30 bg-emerald-400/10 text-emerald-300"><BrainCircuit size={23} /></div><p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-emerald-400">AI study partner</p><h1 className="text-3xl font-semibold tracking-tight text-zinc-100">Hangi kavramı öğrenmek istiyorsun?</h1></div>
    <div className="mb-5 flex items-center gap-2 border-b border-zinc-800 pb-3 text-xs text-zinc-600"><Sparkles size={14} className="text-emerald-400" /><span>→ {targetFolderLabel} içine kaydedilecek</span></div>
    <div className="border border-zinc-700 bg-zinc-900/70 p-2 shadow-2xl shadow-black/20 focus-within:border-emerald-400/50"><textarea value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void generate() } }} disabled={loading} placeholder="Örn. SLAM algoritması" rows={5} className="w-full resize-none bg-transparent px-3 py-2 text-sm leading-6 text-zinc-200 outline-none placeholder:text-zinc-600" /><div className="flex items-center justify-between px-2 pb-1 pt-2"><span className="text-[11px] text-zinc-600">{loading ? 'Yerel model (Qwen 2.5 Coder) yanıt üretiyor...' : 'Qwen 2.5 Coder · Local Ollama'}</span><button onClick={() => void generate()} disabled={!input.trim() || loading} className="inline-flex h-9 items-center gap-2 bg-emerald-400 px-4 text-sm font-medium text-zinc-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-30">{loading ? <LoaderCircle size={16} className="animate-spin" /> : <ArrowUp size={17} />}Notu Üret</button></div></div>
    {error && <p className="mt-4 border border-red-400/20 bg-red-400/5 px-4 py-3 text-xs leading-5 text-red-300">{error}</p>}
  </div></section>
}

function slugify(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '')
}
