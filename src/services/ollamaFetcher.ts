import type { AiService } from '../types/notes'

type OllamaResponse = { message?: { content?: string } }

export const ollamaService: AiService = async (topic) => {
  const response = await fetch('http://127.0.0.1:11435/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'qwen2.5-coder:3b',
      messages: [
        { role: 'system', content: 'Sen kıdemli bir bilgisayar mühendisliği profesörüsün. Sadece Markdown formatında ve teknik olarak kusursuz notlar üretirsin.' },
        { role: 'user', content: `Şu kavramı detaylıca açıkla: ${topic}` },
      ],
      stream: false,
    }),
  })

  if (!response.ok) throw new Error(`Ollama isteği başarısız oldu (${response.status}).`)
  const data = await response.json() as OllamaResponse
  if (!data.message?.content) throw new Error('Ollama geçerli bir not döndürmedi.')
  return data.message.content
}