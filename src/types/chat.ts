export type ChatRole = 'user' | 'assistant'

export type ChatMessage = {
  id: string
  role: ChatRole
  content: string
  createdAt: string
}

export type ChatSession = {
  id: string
  title: string
  notePaths: string[]
  noteNames: string[]
  context: string
  messages: ChatMessage[]
  createdAt: string
  updatedAt: string
}