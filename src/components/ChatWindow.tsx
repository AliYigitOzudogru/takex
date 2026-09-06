import ReactMarkdown from 'react-markdown'
import { ArrowLeft, ArrowUp, Bot, LoaderCircle, UserRound } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { ChatMessage, ChatSession } from '../types/chat'

type ChatWindowProps = {
  chat: ChatSession
  onSend: (question: string) => Promise<void>
  onBackToNotes: () => void
}

export function ChatWindow({ chat, onSend, onBackToNotes }: ChatWindowProps) {
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), [chat.messages.length])

  async function send() {
    const question = input.trim()
    if (!question || sending) return
    setInput('')
    setSending(true)
    setError('')
    try {
      await onSend(question)
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Yanıt alınamadı.')
    } finally {
      setSending(false)
    }
  }

  return <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-zinc-950"><header className="flex shrink-0 items-center gap-4 border-b border-zinc-800/80 px-6 py-4"><button type="button" onClick={onBackToNotes} title="Notlara dön" className="inline-flex shrink-0 items-center gap-2 border border-zinc-700 px-3 py-2 text-xs font-medium text-zinc-300 transition hover:border-emerald-400/60 hover:bg-emerald-400/10 hover:text-emerald-300"><ArrowLeft size={15} />Notlara Dön</button><div className="min-w-0"><p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-400">Yerel sohbet</p><h1 className="truncate text-xl font-semibold text-zinc-100">{chat.title}</h1><p className="mt-1 truncate text-xs text-zinc-600">{chat.noteNames.join(' · ')}</p></div></header><div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-7 md:px-10"><div className="mx-auto max-w-3xl space-y-6">{chat.messages.length === 0 && <div className="border-l-2 border-emerald-400/60 bg-emerald-400/5 px-5 py-4 text-sm leading-6 text-zinc-400">Seçtiğin notlar hakkında soru sor. Cevaplar yalnızca bu sohbetin yerel bağlamını kullanır.</div>}{chat.messages.map((message) => <Message key={message.id} message={message} />)}{sending && <div className="flex items-center gap-3 text-xs text-zinc-500"><Bot size={17} className="text-emerald-400" /><LoaderCircle size={14} className="animate-spin" />Yerel model yanıt üretiyor...</div>}{error && <p className="border border-red-400/20 bg-red-400/5 px-4 py-3 text-xs leading-5 text-red-300">{error}</p>}<div ref={endRef} /></div></div><div className="sticky bottom-0 shrink-0 border-t border-zinc-800/80 bg-zinc-950 px-5 py-5 md:px-10"><div className="mx-auto flex max-w-3xl items-end gap-3 border border-zinc-700 bg-zinc-900/70 p-2 focus-within:border-emerald-400/50"><textarea value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void send() } }} disabled={sending} rows={2} placeholder="Notların hakkında bir soru sor..." className="min-h-12 flex-1 resize-none overflow-y-auto bg-transparent px-2 py-1 text-sm leading-6 text-zinc-200 outline-none placeholder:text-zinc-600" /><button type="button" onClick={() => void send()} disabled={!input.trim() || sending} title="Gönder" className="flex h-9 w-9 shrink-0 items-center justify-center bg-emerald-400 text-zinc-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-30"><ArrowUp size={17} /></button></div></div></section>
}

function Message({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user'
  return <div className={`flex gap-3 ${isUser ? 'justify-end' : ''}`}><div className={`flex h-7 w-7 shrink-0 items-center justify-center ${isUser ? 'order-2 bg-zinc-800 text-zinc-400' : 'bg-emerald-400/10 text-emerald-300'}`}>{isUser ? <UserRound size={14} /> : <Bot size={15} />}</div><div className={`max-w-[min(85%,680px)] ${isUser ? 'bg-zinc-800 px-4 py-3 text-zinc-200' : 'text-zinc-300'}`}><div className="markdown-content text-sm leading-6"><ReactMarkdown>{message.content}</ReactMarkdown></div></div></div>
}