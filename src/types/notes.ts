export type Note = {
  id: string
  title: string
  content: string
  updatedAt: string
  accent: string
}

export type Folder = {
  id: string
  name: string
  color: string
  notes: Note[]
  children: Folder[]
}

export type Course = Folder

export type Workspace = {
  name: string
  courses: Folder[]
}

export type SelectedView =
  | { type: 'note'; folderId: string; noteId: string }
  | { type: 'generate'; folderId: string }

export type SearchResult = Note & { folderId: string; folderPath: string }

export type AiService = (topic: string, folderName: string) => Promise<string>
