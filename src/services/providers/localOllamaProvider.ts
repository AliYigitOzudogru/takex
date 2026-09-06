import type { AiProvider } from '../aiProvider'

const OLLAMA_URL = 'http://127.0.0.1:11435/api/chat'
const MODEL = 'qwen2.5-coder:3b'
const SYSTEM_PROMPT = 'Sen kıdemli bir bilgisayar mühendisliği profesörü ve teknik yazarsın. Kullanıcının verdiği kavramı akademik düzeyde, doğru teknik terminolojiyle, sade Markdown formatında açıkla. Sadece Markdown çıktısı ver, yorum veya gereksiz giriş cümlesi ekleme.'

type OllamaResponse = {
  message?: { content?: string }
}

export const localOllamaProvider: AiProvider = {
  async generateNote(userInput) {
    let response: Response
    try {
      response = await fetch(OLLAMA_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: `Şu kavramı detaylıca açıkla: ${userInput}` },
          ],
          stream: false,
        }),
      })
    } catch {
      throw new Error("Yerel model çalışmıyor. Ollama'nın açık olduğundan emin olun (OLLAMA_HOST=127.0.0.1:11435).")
    }

    if (!response.ok) {
      throw new Error(`Ollama isteği başarısız oldu (${response.status}).`)
    }

    const data = await response.json() as OllamaResponse
    if (!data.message?.content) throw new Error('Ollama geçerli bir Markdown notu döndürmedi.')
    return data.message.content
  },
}
