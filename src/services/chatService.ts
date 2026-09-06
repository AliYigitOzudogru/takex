const OLLAMA_URL = 'http://127.0.0.1:11435/api/chat'
const MODEL = 'qwen2.5-coder:3b'

type OllamaResponse = { message?: { content?: string } }

export async function askOllama(context: string, question: string): Promise<string> {
  let response: Response
  try {
    response = await fetch(OLLAMA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: `Sen kullanıcının seçtiği ders notları üzerinden yardımcı olan kıdemli bir asistansın. Yalnızca verilen bağlamı temel al; bağlamda cevap yoksa bunu açıkça belirt. Bağlam (Context):\n\n${context}` },
          { role: 'user', content: question },
        ],
        stream: false,
      }),
    })
  } catch {
    throw new Error("Yerel model çalışmıyor. Ollama'nın açık olduğundan emin olun (OLLAMA_HOST=127.0.0.1:11435).")
  }

  if (!response.ok) throw new Error(`Ollama isteği başarısız oldu (${response.status}).`)
  const data = await response.json() as OllamaResponse
  if (!data.message?.content) throw new Error('Ollama geçerli bir yanıt döndürmedi.')
  return data.message.content
}