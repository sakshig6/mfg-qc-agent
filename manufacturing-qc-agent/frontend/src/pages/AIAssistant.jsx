/**
 * AIAssistant.jsx — Conversational AI assistant using IBM Granite via RAG.
 * Users can ask questions about the manufacturing data in natural language.
 */
import React, { useEffect, useRef, useState } from 'react'
import { Send, MessageSquare, User, Bot, Sparkles } from 'lucide-react'
import { api } from '../api/api'

const SUGGESTED_QUESTIONS = [
  'Summarize today\'s quality issues.',
  'Which parameter is causing the most defects?',
  'Show abnormal production conditions.',
  'What corrective actions should I take?',
  'Explain the defect prediction model.',
  'How should I handle high vibration alerts?',
  'What does critical temperature mean?',
]

function Message({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div style={{
      display: 'flex', gap: '.75rem', alignItems: 'flex-start',
      flexDirection: isUser ? 'row-reverse' : 'row',
      marginBottom: '1rem',
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
        background: isUser ? 'var(--accent)' : 'var(--surface2)',
        border: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {isUser ? <User size={16} /> : <Bot size={16} color="var(--accent)" />}
      </div>
      <div style={{
        maxWidth: '75%',
        background: isUser ? 'var(--accent-dim)' : 'var(--surface2)',
        border: '1px solid var(--border)',
        borderRadius: 10, padding: '.65rem .9rem',
        fontSize: '.85rem', lineHeight: 1.6,
        whiteSpace: 'pre-wrap', wordBreak: 'break-word',
      }}>
        {msg.content}
        {msg.sources?.length > 0 && (
          <div style={{ marginTop: '.5rem', paddingTop: '.4rem', borderTop: '1px solid var(--border)', fontSize: '.72rem', color: 'var(--muted)' }}>
            <span style={{ fontWeight: 600 }}>Sources: </span>
            {msg.sources.join(', ')}
          </div>
        )}
      </div>
    </div>
  )
}

export default function AIAssistant() {
  const [history, setHistory] = useState([
    {
      role: 'assistant',
      content: 'Hello! I\'m your AI Quality Control Assistant powered by IBM Granite. I can answer questions about manufacturing quality, process parameters, defects, and corrective actions based on your uploaded data.\n\nTry asking one of the suggested questions below, or type your own.',
      sources: [],
    }
  ])
  const [input, setInput]     = useState('')
  const [loading, setLoading] = useState(false)
  const endRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [history])

  const sendMessage = async (text) => {
    const msg = text || input.trim()
    if (!msg || loading) return
    setInput('')

    const userMsg = { role: 'user', content: msg }
    setHistory(h => [...h, userMsg])
    setLoading(true)

    try {
      // Send only role+content to the API (not sources)
      const apiHistory = history
        .concat(userMsg)
        .slice(-8)
        .map(m => ({ role: m.role, content: m.content }))

      const res = await api.chat(msg, apiHistory)
      setHistory(h => [
        ...h,
        { role: 'assistant', content: res.data.answer, sources: res.data.sources || [] }
      ])
    } catch (e) {
      setHistory(h => [
        ...h,
        { role: 'assistant', content: `Error: ${e.message}`, sources: [] }
      ])
    } finally {
      setLoading(false)
    }
  }

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - var(--header-h) - 3.5rem)' }}>
      <div className="page-header">
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
          <Sparkles size={20} color="var(--accent)" />
          AI Quality Assistant
        </h1>
        <p>Ask questions about manufacturing quality, defects, and process health. Powered by IBM Granite + RAG.</p>
      </div>

      <div style={{ display: 'flex', gap: '1rem', flex: 1, minHeight: 0 }}>
        {/* Chat panel */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {/* Message area */}
          <div style={{
            flex: 1, overflowY: 'auto', padding: '1rem',
            background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8,
            marginBottom: '.75rem',
          }}>
            {history.map((msg, i) => <Message key={i} msg={msg} />)}
            {loading && (
              <div style={{ display: 'flex', gap: '.75rem', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--surface2)',
                              border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Bot size={16} color="var(--accent)" />
                </div>
                <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)',
                              borderRadius: 10, padding: '.65rem .9rem', display: 'flex', gap: '.3rem', alignItems: 'center' }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{
                      width: 6, height: 6, borderRadius: '50%', background: 'var(--muted)',
                      animation: `pulse 1.2s ${i * 0.2}s infinite ease-in-out`,
                    }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Input area */}
          <div style={{ display: 'flex', gap: '.5rem' }}>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Ask about quality issues, defects, corrective actions… (Enter to send)"
              disabled={loading}
              rows={2}
              style={{
                flex: 1, background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 8, padding: '.65rem .9rem', color: 'var(--text)',
                resize: 'none', fontSize: '.85rem', lineHeight: 1.5,
                outline: 'none',
              }}
            />
            <button
              className="btn btn-primary"
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              style={{ alignSelf: 'flex-end', height: 40 }}
            >
              <Send size={14} />
              Send
            </button>
          </div>

          <style>{`
            @keyframes pulse {
              0%, 100% { opacity: .3; transform: scale(.8); }
              50% { opacity: 1; transform: scale(1); }
            }
          `}</style>
        </div>

        {/* Suggested questions sidebar */}
        <div style={{ width: 240, flexShrink: 0 }}>
          <div className="card" style={{ marginBottom: '1rem' }}>
            <div style={{ fontWeight: 600, marginBottom: '.75rem', fontSize: '.8rem', color: 'var(--muted)',
                          textTransform: 'uppercase', letterSpacing: '.06em' }}>
              Suggested Questions
            </div>
            {SUGGESTED_QUESTIONS.map((q, i) => (
              <button
                key={i}
                onClick={() => sendMessage(q)}
                disabled={loading}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  background: 'var(--surface2)', border: '1px solid var(--border)',
                  borderRadius: 6, padding: '.5rem .7rem', marginBottom: '.4rem',
                  fontSize: '.78rem', color: 'var(--text)', cursor: 'pointer',
                  transition: 'all .15s',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                {q}
              </button>
            ))}
          </div>

          <div className="card">
            <div style={{ fontWeight: 600, marginBottom: '.5rem', fontSize: '.8rem', color: 'var(--muted)',
                          textTransform: 'uppercase', letterSpacing: '.06em' }}>IBM Granite</div>
            <p style={{ fontSize: '.75rem', color: 'var(--muted)', lineHeight: 1.5 }}>
              Connect IBM watsonx.ai credentials in <code style={{ color: 'var(--accent)' }}>.env</code> to enable full IBM Granite model responses.
            </p>
            <p style={{ fontSize: '.75rem', color: 'var(--muted)', lineHeight: 1.5, marginTop: '.4rem' }}>
              In demo mode, rule-based and RAG responses are used.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
