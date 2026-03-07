import { useState, useCallback } from 'react'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  isStreaming?: boolean
}

export function useChat(conversationId?: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sendMessage = useCallback(async (content: string) => {
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, userMsg])

    const assistantMsgId = (Date.now() + 1).toString()
    const assistantMsg: ChatMessage = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
    }
    setMessages(prev => [...prev, assistantMsg])
    setIsStreaming(true)
    setError(null)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          conversationId,
          history: messages.slice(-10).map(m => ({ role: m.role, content: m.content })),
        }),
      })

      if (!response.ok) throw new Error('API 오류')
      if (!response.body) throw new Error('스트림 없음')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim()
            if (data === '[DONE]') continue
            try {
              const parsed = JSON.parse(data)
              if (parsed.type === 'text' || parsed.content) {
                const chunk = parsed.content || parsed.text || ''
                setMessages(prev =>
                  prev.map(m =>
                    m.id === assistantMsgId
                      ? { ...m, content: m.content + chunk }
                      : m
                  )
                )
              }
            } catch {
              // JSON 파싱 실패 무시
            }
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다')
      setMessages(prev => prev.filter(m => m.id !== assistantMsgId))
    } finally {
      setMessages(prev =>
        prev.map(m =>
          m.id === assistantMsgId ? { ...m, isStreaming: false } : m
        )
      )
      setIsStreaming(false)
    }
  }, [messages, conversationId])

  const clearMessages = useCallback(() => setMessages([]), [])

  return { messages, isStreaming, error, sendMessage, clearMessages }
}
