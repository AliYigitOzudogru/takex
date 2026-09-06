import { invoke } from '@tauri-apps/api/core'
import { open } from '@tauri-apps/plugin-dialog'
import type { WorkspaceEntry } from '../types/workspace'

export async function selectWorkspaceFolder(): Promise<string | null> {
  const selected = await open({ directory: true, multiple: false, title: 'Workspace klasörünü seç' })
  return typeof selected === 'string' ? selected : null
}

export function getWorkspace(path: string): Promise<WorkspaceEntry> {
  return invoke<WorkspaceEntry>('read_workspace', { path })
}

export function getNote(path: string): Promise<string> {
  return invoke<string>('read_note', { path })
}

export function saveNote(path: string, content: string): Promise<void> {
  return invoke('save_note', { path, content })
}

export function createDirectory(path: string): Promise<void> {
  return invoke('create_directory', { path })
}

export function createNote(path: string): Promise<void> {
  return invoke('create_note', { path })
}

export function rename(oldPath: string, newPath: string): Promise<void> {
  return invoke('rename_item', { oldPath, newPath })
}

export function deleteItem(path: string): Promise<void> {
  return invoke('delete_item', { path })
}
