"use client"

import { useState, useEffect, useRef } from "react"
import LoadingBubble from "./components/LoadingBubble"
import PromptSuggestionsRow from "./components/PromptSuggestionsRow"
import Bubble from "./components/Bubble"

const Home = () => {
  const [messages, setMessages] = useState<any[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Load chat history from localStorage on component mount
  useEffect(() => {
    const savedMessages = localStorage.getItem('f1-chat-history')
    if (savedMessages) {
      setMessages(JSON.parse(savedMessages))
    }
  }, [])

  // Save messages to localStorage whenever messages change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('f1-chat-history', JSON.stringify(messages))
    }
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isLoading])

  const handleInputChange = (e: any) => setInput(e.target.value)
  
  const handleSubmit = async (e: any) => {
    e.preventDefault()
    if (!input.trim()) return
    
    const userMessage = { role: 'user', content: input }
    setMessages(prev => [...prev, userMessage])
    setInput("")
    setIsLoading(true)
    
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, userMessage] })
      })
      
      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.error)
      }
      
      setMessages(prev => [...prev, { role: 'assistant', content: data.message }])
    } catch (error) {
      console.error('Chat error:', error)
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error. Please try again.' 
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const handlePrompt = (promptText: string) => {
    setInput(promptText)
  }

  const noMessages = messages.length === 0
  
  return (
    <main>
      {/* F1 Header */}
      <div className="chat-header">
        <div className="f1-logo">🏎️ F1 GPT</div>
        {!noMessages && (
          <button className="clear-chat" onClick={() => {
            setMessages([])
            localStorage.removeItem('f1-chat-history')
          }}>
            🗑️ Clear
          </button>
        )}
      </div>

      <section className={noMessages ? "" : "populated"}>
        {noMessages ? (
          <>
            <div className="welcome-section">
              <h1 className="welcome-title">Welcome to F1 GPT</h1>
              <p className="starter-text">
                The Ultimate place for Formula One super fans!
                Ask F1GPT anything about the fantastic topic of F1 racing
                and it will come back with the most up-to-date answers.
                We hope you enjoy!
              </p>
            </div>
            <PromptSuggestionsRow onPromptClick={handlePrompt} />
          </>
        ) : (
          <>
            {messages.map((message, index) => (
              <div key={index} className="message-wrapper">
                <Bubble message={message} />
                <div className="message-time">
                  {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="message-wrapper">
                <LoadingBubble />
                <div className="typing-indicator">F1 GPT is thinking...</div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </section>

      <form onSubmit={handleSubmit} className="chat-form">
        <input 
          className="question-box" 
          onChange={handleInputChange} 
          value={input} 
          placeholder="Ask me about Formula 1..."
          disabled={isLoading}
        />
        <button type="submit" className="send-button" disabled={isLoading}>
          {isLoading ? '⏳' : '🚀'}
        </button>
      </form>
    </main>
  )
}

export default Home