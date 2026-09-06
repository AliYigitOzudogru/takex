import { invoke } from '@tauri-apps/api/core'
import type { ChatSession } from '../types/chat'

export async function loadChats(workspacePath: string): Promise<ChatSession[]> {
  const value = await invoke<string>('load_chats', { workspacePath })
  return JSON.parse(value) as ChatSession[]
}

export function saveChats(workspacePath: string, chats: ChatSession[]): Promise<void> {
  return invoke('save_chats', { workspacePath, chats: JSON.stringify(chats) })
}