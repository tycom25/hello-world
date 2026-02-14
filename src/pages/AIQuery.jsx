import { useState, useRef, useEffect } from 'react'

const suggestedQueries = [
  'What are the top customer concerns this quarter?',
  'Summarize recent interactions with Enterprise accounts',
  'Which accounts are at risk of churn?',
  'Show me upsell opportunities in the Manufacturing segment',
  'What follow-up actions are overdue?',
  'Compare customer satisfaction across regions',
]

const sampleResponses = {
  default: {
    text: `Based on the customer interaction data, here's what I found:

**Key Findings:**
- Customer engagement has increased 12% quarter-over-quarter
- The top 3 concerns raised by customers are: pricing transparency (34%), delivery timelines (28%), and account management responsiveness (19%)
- Enterprise segment shows the strongest positive sentiment trend

**Recommended Actions:**
1. Schedule follow-up calls with accounts flagged for pricing concerns
2. Review delivery SLA commitments for Q1 renewals
3. Assign dedicated account managers to the top 15 Enterprise accounts

**Data Sources:** 847 customer interactions analyzed from the last 90 days across email, call transcripts, and meeting notes.`,
    sources: ['CRM Interaction Logs', 'Call Transcripts DB', 'Email Analytics', 'Meeting Notes']
  }
}

export default function AIQuery() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function handleSubmit(e) {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    sendQuery(input.trim())
  }

  function handleSuggestionClick(query) {
    sendQuery(query)
  }

  function sendQuery(query) {
    const userMessage = { role: 'user', content: query }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    // Simulate AI response delay
    setTimeout(() => {
      const response = {
        role: 'assistant',
        content: sampleResponses.default.text,
        sources: sampleResponses.default.sources,
        timestamp: new Date().toLocaleTimeString()
      }
      setMessages(prev => [...prev, response])
      setIsLoading(false)
    }, 1500)
  }

  function clearChat() {
    setMessages([])
    inputRef.current?.focus()
  }

  return (
    <div className="ai-query-page">
      <div className="page-header">
        <div>
          <h1>AI Query</h1>
          <p>Ask questions about customer interactions, sales data, and account intelligence</p>
        </div>
        {messages.length > 0 && (
          <button className="btn btn-secondary" onClick={clearChat}>
            Clear Chat
          </button>
        )}
      </div>

      <div className="chat-container">
        {messages.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                <line x1="8" y1="11" x2="14" y2="11"/><line x1="11" y1="8" x2="11" y2="14"/>
              </svg>
            </div>
            <h2>Ask anything about your customers</h2>
            <p>Use natural language to query customer interactions, identify trends, and get actionable insights.</p>

            <div className="suggestions">
              <h3>Suggested queries</h3>
              <div className="suggestion-grid">
                {suggestedQueries.map((q, i) => (
                  <button key={i} className="suggestion-card" onClick={() => handleSuggestionClick(q)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                    <span>{q}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="messages">
            {messages.map((msg, i) => (
              <div key={i} className={`message ${msg.role}`}>
                <div className="message-avatar">
                  {msg.role === 'user' ? (
                    <div className="avatar-small">ST</div>
                  ) : (
                    <div className="avatar-small ai">AI</div>
                  )}
                </div>
                <div className="message-body">
                  <div className="message-header">
                    <span className="message-sender">
                      {msg.role === 'user' ? 'You' : 'Amazon Business AI'}
                    </span>
                    {msg.timestamp && <span className="message-time">{msg.timestamp}</span>}
                  </div>
                  <div className="message-content">
                    {msg.content.split('\n').map((line, j) => {
                      if (line.startsWith('**') && line.endsWith('**')) {
                        return <p key={j}><strong>{line.replace(/\*\*/g, '')}</strong></p>
                      }
                      if (line.startsWith('- ')) {
                        return <li key={j}>{line.slice(2)}</li>
                      }
                      if (/^\d+\.\s/.test(line)) {
                        return <li key={j} className="numbered">{line.replace(/^\d+\.\s/, '')}</li>
                      }
                      if (line.trim() === '') return <br key={j} />
                      return <p key={j}>{line}</p>
                    })}
                  </div>
                  {msg.sources && (
                    <div className="message-sources">
                      <span className="sources-label">Sources:</span>
                      {msg.sources.map((s, j) => (
                        <span key={j} className="source-tag">{s}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="message assistant">
                <div className="message-avatar">
                  <div className="avatar-small ai">AI</div>
                </div>
                <div className="message-body">
                  <div className="typing-indicator">
                    <span></span><span></span><span></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <form className="query-input-form" onSubmit={handleSubmit}>
        <div className="input-wrapper">
          <svg className="input-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask a question about customer interactions..."
            disabled={isLoading}
          />
          <button type="submit" className="btn btn-primary send-btn" disabled={!input.trim() || isLoading}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
        <div className="input-hint">
          Press Enter to send. AI responses are generated from customer interaction data.
        </div>
      </form>
    </div>
  )
}
