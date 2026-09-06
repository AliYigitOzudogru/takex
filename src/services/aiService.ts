import type { AiProvider } from './aiProvider'
import { localOllamaProvider } from './providers/localOllamaProvider'

// Gelecekte: import { claudeProvider } from './providers/claudeProvider' — tek satır değişecek.
export const aiService: AiProvider = localOllamaProvider
