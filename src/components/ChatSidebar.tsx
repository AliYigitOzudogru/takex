import { MessageSquarePlus, MessagesSquare, Trash2 } from 'lucide-react'
import type { ChatSession } from '../types/chat'

type ChatSidebarProps = {
  chats: ChatSession[]
  selectedChatId?: string
  onNewChat: () => void
  onSelectChat: (chat: ChatSession) => void
  onDeleteChat: (chat: ChatSession) => Promise<void> | void
}

export function ChatSidebar({ chats, selectedChatId, onNewChat, onSelectChat, onDeleteChat }: ChatSidebarProps) {
  return <section className="flex min-h-0 flex-1 flex-col">
    <div className="border-b border-zinc-800/80 px-4 py-4"><button type="button" onClick={onNewChat} className="flex w-full items-center justify-center gap-2 bg-emerald-400 px-3 py-2.5 text-xs font-semibold text-zinc-950 transition hover:bg-emerald-300"><MessageSquarePlus size={15} />Yeni Sohbet Başlat</button></div>
    <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
      {chats.length === 0 ? <div className="px-2 py-8 text-center text-xs leading-5 text-zinc-600"><MessagesSquare size={22} className="mx-auto mb-3 text-zinc-700" />Henüz sohbet yok.</div> : <div className="space-y-1">{chats.map((chat) => <div key={chat.id} className={`group flex w-full items-center rounded transition ${selectedChatId === chat.id ? 'bg-zinc-800 text-emerald-300' : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'}`}><button type="button" onClick={() => onSelectChat(chat)} className="min-w-0 flex-1 px-3 py-2.5 text-left"><span className="block truncate text-[13px]">{chat.title}</span><span className="mt-1 block truncate text-[10px] text-zinc-600">{chat.noteNames.join(' · ')}</span></button><button type="button" onClick={(event) => { event.stopPropagation(); void onDeleteChat(chat) }} title="Sohbeti sil" aria-label={`${chat.title} sohbetini sil`} className="mr-2 rounded p-1.5 text-zinc-600 opacity-60 transition hover:bg-red-400/10 hover:text-red-300 group-hover:opacity-100"><Trash2 size={14} /></button></div>)}</div>}
    </div>
  </section>
}