export type WorkspaceEntryKind = 'folder' | 'note'

export type WorkspaceEntry = {
  name: string
  path: string
  kind: WorkspaceEntryKind
  children: WorkspaceEntry[]
}
