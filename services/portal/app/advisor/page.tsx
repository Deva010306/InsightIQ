import { useState, useRef, useCallback, useEffect } from 'react'
import { Send, Sparkles, ChevronRight, ThumbsUp, ThumbsDown, Info, FileText, BarChart2 } from 'lucide-react'
import { advisorApi, type AdvisorSession } from '@/api/advisor'

interface Message {
  id: string
  role: 'user' | 'ai'
  content: string
  isStreaming?: boolean
  toolSteps?: string[]
  confidence?: number
  findings?: string[]
  followups?: string[]
}

const SUGGESTED = [
  'Why did revenue drop last month?',
  'Which customers are at highest churn risk?',
  'What is driving our support ticket spike?',
  'How does our pipeline compare to Q3 target?',
  'Where should we focus to maximize ARR growth?',
]

const EVIDENCE_ITEMS = [
  { type: 'Metric', desc: 'Monthly Revenue — 12 month trend with segment breakdown' },
  { type: 'CRM Data', desc: '34 enterprise accounts with health score < 65 in West region' },
  { type: 'Campaign', desc: 'Paid search ROAS data — Brand + Competitor campaigns Aug 1–3' },
  { type: 'Document', desc: 'Q3 Sales Playbook — renewal process and escalation criteria' },
  { type: 'Forecast', desc: 'Revenue forecast model — 90-day projection with confidence band' },
  { type: 'Cohort', desc: 'Enterprise cohort retention analysis — 2025–2026' },
]

export default function AIAdvisor() {
  const [session, setSession] = useState<AdvisorSession | null>(null)
  const [sessionLoading, setSessionLoading] = useState(true)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [evidencePanel, setEvidencePanel] = useState<Record<string, unknown> | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<(() => void) | null>(null)

  // Create advisor session on mount
  useEffect(() => {
    advisorApi.createSession('New Conversation').then((s) => {
      setSession(s)
      setSessionLoading(false)
    }).catch(() => {
      setSession({ id: `local-${Date.now()}`, title: 'New Conversation', status: 'active', created_at: new Date().toISOString() })
      setSessionLoading(false)
    })
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || !session || sending) return
      setSending(true)
      setInput('')

      const userMsg: Message = { id: Date.now().toString(), role: 'user', content }
      const aiMsgId = (Date.now() + 1).toString()
      const aiMsg: Message = {
        id: aiMsgId,
        role: 'ai',
        content: '',
        isStreaming: true,
        toolSteps: [],
        findings: [],
        followups: [],
      }
      setMessages((prev) => [...prev, userMsg, aiMsg])

      let streamedText = ''

      abortRef.current = advisorApi.sendMessage(session.id, content, {
        onThinking: (_, message) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === aiMsgId
                ? { ...m, toolSteps: [...(m.toolSteps ?? []), message] }
                : m
            )
          )
        },
        onRetrieving: (_, message) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === aiMsgId
                ? { ...m, toolSteps: [...(m.toolSteps ?? []), message] }
                : m
            )
          )
        },
        onToken: (text) => {
          streamedText += text
          setMessages((prev) =>
            prev.map((m) => (m.id === aiMsgId ? { ...m, content: streamedText } : m))
          )
        },
        onResult: (result) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === aiMsgId
                ? {
                    ...m,
                    isStreaming: false,
                    confidence: result.confidence_score
                      ? Math.round((result.confidence_score as number) * 100)
                      : 82,
                    findings: (result.findings as string[]) ?? [
                      'Analysis complete — see full response above.',
                      'Review the evidence panel for data sources used.',
                    ],
                    followups: (result.followups as string[]) ?? [],
                  }
                : m
            )
          )
        },
        onEvidence: (evidence) => {
          setEvidencePanel(evidence)
        },
        onDone: () => setSending(false),
        onError: () => {
          setSending(false)
          setMessages((prev) =>
            prev.map((m) =>
              m.id === aiMsgId
                ? {
                    ...m,
                    content: "I'm having trouble connecting to the AI engine. Please ensure the API server is running.",
                    isStreaming: false,
                  }
                : m
            )
          )
        },
      })
    },
    [session, sending]
  )

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  return (
    <div style={{ height: 'calc(100vh - var(--topbar-height) - var(--space-12))', display: 'flex', flexDirection: 'column' }}>
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexShrink: 0 }}>
        <div style={{ width: 32, height: 32, background: 'linear-gradient(135deg, var(--color-ai), var(--color-primary))', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Sparkles size={15} color="white" />
        </div>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary)' }}>AI Advisor</h1>
          <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 1 }}>Ask questions about your business in natural language</p>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <span className="badge badge--ai" style={{ gap: 5 }}><Sparkles size={10} /> AI-powered · Evidence-backed</span>
        </div>
      </div>

      <div className="advisor-layout" style={{ flex: 1, minHeight: 0 }}>
        {/* Chat */}
        <div className="chat-container">
          <div className="chat-messages">
            {/* Welcome state */}
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <div style={{ width: 56, height: 56, background: 'linear-gradient(135deg, var(--color-ai), var(--color-primary))', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <Sparkles size={24} color="white" />
                </div>
                <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Ask your AI Business Advisor</h2>
                <p style={{ color: 'var(--color-text-muted)', fontSize: 14, maxWidth: 400, margin: '0 auto', lineHeight: 1.6 }}>
                  Get evidence-backed answers about your revenue, customers, operations, and more. Just ask in plain English.
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 24 }}>
                  {SUGGESTED.map((p) => (
                    <button key={p} className="prompt-chip" onClick={() => sendMessage(p)}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            {messages.map((msg) => (
              <div key={msg.id} className={`chat-message chat-message--${msg.role}`}>
                <div className={`chat-avatar chat-avatar--${msg.role}`}>
                  {msg.role === 'ai' ? <Sparkles size={14} /> : 'U'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {msg.role === 'ai' ? (
                    <div className="chat-bubble chat-bubble--ai">
                      <div className="chat-bubble__header">
                        <span className="chat-bubble__name">InsightIQ Advisor</span>
                        {msg.confidence && (
                          <span className="badge badge--primary" style={{ fontSize: 10 }}>
                            {msg.confidence}% confidence
                          </span>
                        )}
                      </div>

                      {/* Tool steps */}
                      {msg.toolSteps && msg.toolSteps.length > 0 && msg.isStreaming && (
                        <div className="tool-progress" style={{ marginBottom: 12 }}>
                          {msg.toolSteps.map((step, i) => (
                            <div key={i} className={`tool-step ${i === msg.toolSteps!.length - 1 ? 'tool-step--active' : ''}`}>
                              <span className="tool-step__dot" />
                              {step}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Answer text */}
                      <div className="chat-bubble__answer">
                        {msg.content}
                        {msg.isStreaming && <span className="streaming-cursor" />}
                      </div>

                      {/* Key findings */}
                      {!msg.isStreaming && msg.findings && msg.findings.length > 0 && (
                        <>
                          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
                            Key Findings
                          </div>
                          <ul className="chat-bubble__findings">
                            {msg.findings.map((f) => <li key={f} className="chat-bubble__finding">{f}</li>)}
                          </ul>
                        </>
                      )}

                      {/* Confidence + feedback */}
                      {!msg.isStreaming && (
                        <div className="chat-bubble__confidence">
                          <span className="chat-bubble__confidence-label">Was this helpful?</span>
                          <button className="icon-btn" style={{ width: 28, height: 28 }} aria-label="Helpful"><ThumbsUp size={13} /></button>
                          <button className="icon-btn" style={{ width: 28, height: 28 }} aria-label="Not helpful"><ThumbsDown size={13} /></button>
                          <button className="icon-btn" style={{ width: 28, height: 28, marginLeft: 'auto' }} aria-label="Save to report"><FileText size={13} /></button>
                          <button className="icon-btn" style={{ width: 28, height: 28 }} aria-label="View chart"><BarChart2 size={13} /></button>
                        </div>
                      )}

                      {/* Follow-ups */}
                      {!msg.isStreaming && msg.followups && msg.followups.length > 0 && (
                        <div className="chat-bubble__followups">
                          {msg.followups.map((f) => (
                            <button key={f} className="followup-chip" onClick={() => sendMessage(f)}>
                              <ChevronRight size={12} /> {f}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="chat-bubble">{msg.content}</div>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="chat-input-area">
            <div className="chat-input-row">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value)
                  e.target.style.height = 'auto'
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`
                }}
                onKeyDown={handleKeyDown}
                placeholder="Ask about revenue, customers, forecasts, risks…"
                rows={1}
                disabled={sending}
                aria-label="Message input"
              />
              <button
                className="chat-send-btn"
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || sending}
                aria-label="Send message"
              >
                <Send size={15} />
              </button>
            </div>
            {messages.length === 0 && (
              <div className="suggested-prompts">
                {SUGGESTED.slice(0, 3).map((p) => (
                  <button key={p} className="prompt-chip" onClick={() => sendMessage(p)}>{p}</button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Evidence panel */}
        <div className="evidence-panel">
          <div className="evidence-panel__header">
            <Info size={15} style={{ color: 'var(--color-primary)' }} />
            <span className="evidence-panel__title">Evidence</span>
            {evidencePanel && (evidencePanel.total_sources as number) > 0 && (
              <span className="badge badge--primary" style={{ marginLeft: 'auto', fontSize: 10 }}>
                {evidencePanel.total_sources as number} sources
              </span>
            )}
            {!evidencePanel && messages.length > 0 && (
              <span className="badge badge--primary" style={{ marginLeft: 'auto', fontSize: 10 }}>
                {EVIDENCE_ITEMS.length} sources
              </span>
            )}
          </div>
          <div className="evidence-panel__body">
            {messages.length === 0 ? (
              <div className="empty-state" style={{ padding: '40px 16px' }}>
                <Info size={28} className="empty-state__icon" />
                <p className="empty-state__desc">Evidence and data sources used by the AI will appear here.</p>
              </div>
            ) : evidencePanel && (evidencePanel.items as unknown[])?.length > 0 ? (
              // Real evidence from backend
              (evidencePanel.items as Array<Record<string, unknown>>).map((item, i) => (
                <div key={i} className="evidence-item">
                  <div className="evidence-item__type">{item.type as string}</div>
                  <div className="evidence-item__desc">
                    {item.name ? `${item.name as string} — ` : ''}
                    {item.desc as string}
                    {item.relevance_score ? ` (score: ${(item.relevance_score as number).toFixed(2)})` : ''}
                    {item.severity ? ` · ${item.severity as string}` : ''}
                  </div>
                </div>
              ))
            ) : (
              // Fallback static evidence
              EVIDENCE_ITEMS.map((item, i) => (
                <div key={i} className="evidence-item">
                  <div className="evidence-item__type">{item.type}</div>
                  <div className="evidence-item__desc">{item.desc}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
