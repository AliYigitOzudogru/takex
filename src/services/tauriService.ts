import { invoke } from '@tauri-apps/api/core'
import { open } from '@tauri-apps/plugin-dialog'
import type { WorkspaceEntry } from '../types/workspace'

function requireTauriRuntime(): void {
  if (typeof window === 'undefined' || !('__TAURI_INTERNALS__' in window)) {
    throw new Error('Takex masaüstü uygulaması dışında çalışıyor. Bu özellikler için `pnpm tauri dev` komutunu kullanın.')
  }
}

export async function selectWorkspaceFolder(): Promise<string | null> {
  requireTauriRuntime()
  const selected = await open({ directory: true, multiple: false, title: 'Workspace klasörünü seç' })
  return typeof selected === 'string' ? selected : null
}

export function getWorkspace(path: string): Promise<WorkspaceEntry> {
  requireTauriRuntime()
  return invoke<WorkspaceEntry>('read_workspace', { path })
}

export function getNote(path: string): Promise<string> {
  requireTauriRuntime()
  return invoke<string>('read_note', { path })
}

export function saveNote(path: string, content: string): Promise<void> {
  requireTauriRuntime()
  return invoke('save_note', { path, content })
}

export function createDirectory(path: string): Promise<void> {
  requireTauriRuntime()
  return invoke('create_directory', { path })
}

export function createNote(path: string): Promise<void> {
  requireTauriRuntime()
  return invoke('create_note', { path })
}

export function rename(oldPath: string, newPath: string): Promise<void> {
  requireTauriRuntime()
  return invoke('rename_item', { oldPath, newPath })
}

export function deleteItem(path: string): Promise<void> {
  requireTauriRuntime()
  return invoke('delete_item', { path })
}
