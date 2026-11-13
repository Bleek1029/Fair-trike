import React, { useState, useRef, useEffect, useCallback } from 'react';
import { apiAiAssistant } from '../api.js';
import { Icon } from './Icon.jsx';

const WELCOME_MESSAGES = [
  'Hi! I\'m your Fairtrike assistant. Ask me about fares, booking, or driver requirements.',
  'Hello! Need help with a ride? I know all about Olongapo trike fares and how to book.',
  'Welcome! I can help with fares, driver registration, booking, and more. What do you need?',
];

function AiAssistant({ isOpen, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Initialize with welcome message when opened
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const welcome = WELCOME_MESSAGES[Math.floor(Math.random() * WELCOME_MESSAGES.length)];
      setMessages([{ role: 'assistant', content: welcome }]);
    }
  }, [isOpen, messages.length]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      const res = await apiAiAssistant(text);
      setMessages(prev => [...prev, { role: 'assistant', content: res.reply || 'Sorry, I cannot answer that.' }]);
    } catch (err) {
      setError(err.message);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed bottom-24 right-4 left-4 sm:right-6 sm:left-auto sm:w-96 z-50 animate-slide-up"
      role="dialog"
      aria-label="Fairtrike Assistant"
      aria-modal="true"
    >
      <div className="bg-surface-container-lowest rounded-2xl shadow-2xl border border-surface-container-high overflow-hidden flex flex-col h-[500px] max-h-[70vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-surface-container-high bg-primary-container/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary text-on-primary flex items-center justify-center">
              <Icon name="smart_toy" size={22} />
            </div>
            <div>
              <h3 className="text-title-sm font-bold">Fairtrike Assistant</h3>
              <p className="text-body-xs text-secondary">AI-powered help</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-surface-container-high transition-colors"
            aria-label="Close assistant"
          >
            <Icon name="close" size={22} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ minHeight: 0 }}>
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                  msg.role === 'user'
                    ? 'bg-primary text-on-primary rounded-br-md'
                    : 'bg-surface-container-high text-on-surface rounded-bl-md'
                }`}
              >
                <p className="text-body-md whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-surface-container-high text-on-surface rounded-2xl px-4 py-2.5 rounded-bl-md animate-pulse">
                <div className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-primary/50" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 rounded-full bg-primary/50" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 rounded-full bg-primary/50" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Error banner */}
        {error && (
          <div className="mx-4 mb-2 p-2 rounded-lg bg-error-container text-error text-body-sm flex items-center gap-2">
            <Icon name="error" size={16} />
            {error}
            <button type="button" onClick={() => setError(null)} className="ml-auto text-error font-bold">✕</button>
          </div>
        )}

        {/* Input */}
        <div className="p-4 border-t border-surface-container-high bg-surface-container-lowest">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about fares, booking, driver docs…"
              className="flex-1 h-11 px-4 rounded-full bg-surface-container-high text-on-surface text-body-md focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
              disabled={loading}
              autoComplete="off"
            />
            <button
              type="button"
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              className="p-3 rounded-full bg-primary text-on-primary hover:shadow-lg hover:shadow-primary/40 active:scale-[0.95] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Send message"
            >
              <Icon name="send" size={22} />
            </button>
          </div>
          <p className="text-body-xs text-secondary text-center mt-2">
            I know about Fairtrike fares, booking, driver registration, and app features.
          </p>
        </div>
      </div>
    </div>
  );
}

export { AiAssistant };