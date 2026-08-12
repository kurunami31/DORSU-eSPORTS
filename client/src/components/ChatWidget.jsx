import { useEffect, useRef, useState } from 'react';
import Icon from './Icon.jsx';
import { sendChat } from '../api.js';

const WELCOME = {
  role: 'assistant',
  content:
    'Hey, I’m DOrSU eSPORTS Assist! Ask me about open tournaments, registering a team, or anything about the org — or tap a quick question below.',
};

const QUICK_QUESTIONS = [
  'Which tournaments are open right now?',
  'How do I register my team?',
  'What games do you run?',
  'How can I contact DOrSU eSPORTS?',
];

// Keep the conversation small — the server uses the last 12 turns.
const MAX_SENT = 12;

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([WELCOME]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, busy, open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && open) setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const send = async (text) => {
    const content = (text ?? input).trim();
    if (!content || busy) return;
    setInput('');
    setError('');
    const history = [...messages, { role: 'user', content }];
    setMessages(history);
    setBusy(true);
    try {
      const res = await sendChat(history.slice(-MAX_SENT));
      setMessages((m) => [...m, { role: 'assistant', content: res.reply }]);
    } catch (err) {
      setError(err.message || 'The assistant could not be reached. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setMessages([WELCOME]);
    setError('');
    setInput('');
  };

  return (
    <>
      <button
        className="chat-fab"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close chat' : 'Open the DOrSU eSPORTS assistant'}
        aria-expanded={open}
      >
        {open ? <Icon name="x" size={22} /> : <Icon name="messageCircle" size={24} />}
      </button>

      {open && (
        <div className="chat-panel" role="dialog" aria-label="DOrSU eSPORTS assistant">
          <div className="chat-head">
            <span className="chat-head-logo" aria-hidden="true">
              <img src="/logos/dorsu-logo.jpg" alt="" />
            </span>
            <div className="chat-head-main">
              <b>DOrSU eSPORTS Assist</b>
              <span className="chat-status">
                <span className="dot" aria-hidden="true" /> Online · AI assistant
              </span>
            </div>
            <button className="chat-clear" onClick={reset} title="Clear conversation" aria-label="Clear conversation">
              <Icon name="refresh" size={15} />
            </button>
            <button className="chat-close" onClick={() => setOpen(false)} aria-label="Close chat">
              <Icon name="x" size={17} />
            </button>
          </div>

          <div className="chat-body" ref={scrollRef}>
            {messages.map((m, i) => (
              <div key={i} className={`chat-msg ${m.role}`}>
                {m.role === 'assistant' && (
                  <span className="chat-msg-avatar" aria-hidden="true"><Icon name="bot" size={14} /></span>
                )}
                <div className="chat-bubble">{m.content}</div>
              </div>
            ))}
            {busy && (
              <div className="chat-msg assistant">
                <span className="chat-msg-avatar" aria-hidden="true"><Icon name="bot" size={14} /></span>
                <div className="chat-bubble chat-typing" aria-label="Assistant is typing">
                  <span /><span /><span />
                </div>
              </div>
            )}
            {error && <div className="chat-error" role="alert">{error}</div>}

            {messages.length === 1 && !busy && (
              <div className="chat-chips">
                {QUICK_QUESTIONS.map((q) => (
                  <button key={q} className="chat-chip" onClick={() => send(q)} disabled={busy}>
                    {q}
                  </button>
                ))}
              </div>
            )}
          </div>

          <form
            className="chat-input"
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about tournaments, registration…"
              maxLength={2000}
              disabled={busy}
              aria-label="Message the assistant"
            />
            <button type="submit" className="chat-send" disabled={busy || !input.trim()} aria-label="Send message">
              <Icon name="send" size={16} />
            </button>
          </form>
          <p className="chat-foot">AI can make mistakes — verify the details on our Facebook community.</p>
        </div>
      )}
    </>
  );
}
