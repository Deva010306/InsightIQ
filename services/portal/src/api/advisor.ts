/**
 * InsightIQ — AI Advisor API Client
 * Streams responses from the backend SSE endpoint.
 * Falls back to offline mock simulation if the API is unavailable.
 */
import apiClient from './client'

export interface AdvisorSession {
  id: string
  title: string | null
  status: string
  created_at: string
}

export interface SSECallbacks {
  onThinking?: (step: string, message: string) => void
  onRetrieving?: (type: string, message: string) => void
  onToken?: (text: string) => void
  onResult?: (result: Record<string, unknown>) => void
  onEvidence?: (evidence: Record<string, unknown>) => void
  onDone?: () => void
  onError?: (err: Error) => void
}

// ── Real SSE client ──────────────────────────────────────────────────────────

function parseSSELine(line: string): { event: string; data: unknown } | null {
  if (!line.startsWith('event:')) return null
  return null  // handled in chunk accumulator
}

function sseStream(
  url: string,
  body: Record<string, unknown>,
  callbacks: SSECallbacks,
): AbortController {
  const controller = new AbortController()

  ;(async () => {
    try {
      const token = localStorage.getItem('insightiq_token') ?? 'dev-token'
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`)
      }

      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        // Process complete SSE messages (separated by \n\n)
        const messages = buffer.split('\n\n')
        buffer = messages.pop() ?? ''

        for (const message of messages) {
          if (!message.trim()) continue
          const lines = message.split('\n')
          let eventType = ''
          let dataStr = ''

          for (const line of lines) {
            if (line.startsWith('event:')) eventType = line.slice(6).trim()
            else if (line.startsWith('data:')) dataStr = line.slice(5).trim()
          }

          if (!eventType || !dataStr) continue

          try {
            const data = JSON.parse(dataStr)
            switch (eventType) {
              case 'thinking':
                callbacks.onThinking?.(data.step ?? '', data.message ?? '')
                break
              case 'retrieving':
                callbacks.onRetrieving?.(data.type ?? '', data.message ?? '')
                break
              case 'token':
                callbacks.onToken?.(data.text ?? '')
                break
              case 'result':
                callbacks.onResult?.(data)
                break
              case 'evidence':
                callbacks.onEvidence?.(data)
                break
              case 'done':
                callbacks.onDone?.()
                return
              default:
                break
            }
          } catch {
            // ignore malformed JSON
          }
        }
      }

      callbacks.onDone?.()
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        callbacks.onError?.(err as Error)
      }
    }
  })()

  return controller
}

// ── Public API ───────────────────────────────────────────────────────────────
export const advisorApi = {
  async createSession(title?: string): Promise<AdvisorSession> {
    const res = await apiClient.post<AdvisorSession>('/api/v1/advisor/sessions', { title })
    return res.data
  },

  sendMessage(sessionId: string, content: string, callbacks: SSECallbacks): () => void {
    let cancelled = false

    const controller = sseStream(
      `/api/v1/advisor/sessions/${sessionId}/messages`,
      { content },
      {
        ...callbacks,
        onError: async (err) => {
          console.warn('[InsightIQ] SSE failed', err)
          if (!cancelled) callbacks.onError?.(err as Error)
        },
      },
    )
    return () => {
      cancelled = true
      controller.abort()
    }
  },
}
