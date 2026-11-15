import React, { useEffect, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import {
  ExternalLink,
  Globe,
  MessageCircle,
  Send,
  Trash2,
  UserRound,
  X,
} from 'lucide-react';
import {
  OperationType,
  clearUserChatMessages,
  db,
  handleFirestoreError,
  saveChatMessage,
} from '../lib/firebase';

interface WebSource {
  title: string;
  url: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: WebSource[];
  usedWebSearch?: boolean;
  searchNotice?: string;
  createdAtMs?: number;
}

interface StylistChatProps {
  user: User | null;
  onOpenAuth: () => void;
}

const WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content:
    'Hi — I only give fashion and outfit-planning advice. Ask me about dress codes, trip packing, color pairings, fabrics, or live weather & trends via Tavily.',
};

const STARTER_QUESTIONS = [
  'What should I pack for a 3-day trip to London this week?',
  'What is the dress code for a cocktail attire wedding?',
  'What coat trends are popular right now?',
];

export function StylistChat({ user, onOpenAuth }: StylistChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [guestMessages, setGuestMessages] = useState<ChatMessage[]>([
    WELCOME_MESSAGE,
  ]);
  const [savedMessages, setSavedMessages] = useState<ChatMessage[]>([]);
  const [clearing, setClearing] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!user) {
      setSavedMessages([]);
      return;
    }

    const path = `users/${user.uid}/chatMessages`;
    const q = query(collection(db, path), where('uid', '==', user.uid));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs: ChatMessage[] = snapshot.docs.map((d) => {
          const data = d.data({ serverTimestamps: 'estimate' });
          const createdAtMs =
            data.createdAt && typeof data.createdAt.toMillis === 'function'
              ? data.createdAt.toMillis()
              : Date.now();
          return {
            id: d.id,
            role: data.role === 'user' ? 'user' : 'assistant',
            content: String(data.content || ''),
            usedWebSearch: Boolean(data.usedWebSearch),
            sources: Array.isArray(data.sources) ? data.sources : [],
            createdAtMs,
          };
        });

        docs.sort((a, b) => (a.createdAtMs ?? 0) - (b.createdAtMs ?? 0));
        setSavedMessages(docs);
      },
      (err) => {
        setError('Unable to load saved chat history.');
        handleFirestoreError(err, OperationType.LIST, path);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const displayedMessages = user
    ? savedMessages.length > 0
      ? savedMessages
      : [WELCOME_MESSAGE]
    : guestMessages;

  useEffect(() => {
    if (isOpen) {
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [displayedMessages.length, isOpen, loading]);

  const sendMessage = async (textToSend: string) => {
    const trimmed = textToSend.trim();
    if (!trimmed || loading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
    };

    const historyForApi = [...displayedMessages, userMsg].map((m) => ({
      role: m.role,
      content: m.content,
    }));

    if (!user) {
      setGuestMessages((prev) => [...prev, userMsg]);
    }

    setInput('');
    setError('');
    setLoading(true);

    try {
      if (user) {
        await saveChatMessage(user, {
          role: 'user',
          content: trimmed,
        });
      }

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: historyForApi,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Could not get a reply.');
      }

      const sources: WebSource[] = Array.isArray(data.sources)
        ? data.sources
        : [];
      const usedWebSearch = Boolean(data.usedWebSearch);

      if (user) {
        await saveChatMessage(user, {
          role: 'assistant',
          content: data.reply,
          usedWebSearch,
          sources,
        });
      } else {
        setGuestMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: data.reply,
            sources,
            usedWebSearch,
            searchNotice:
              typeof data.searchNotice === 'string'
                ? data.searchNotice
                : undefined,
          },
        ]);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to reach stylist chat.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = async () => {
    if (!user || clearing || savedMessages.length === 0) return;
    setClearing(true);
    setError('');
    try {
      await clearUserChatMessages(user.uid);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to clear chat history.'
      );
    } finally {
      setClearing(false);
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    sendMessage(input);
  };

  return (
    <div className="fixed bottom-5 right-5 z-40">
      {isOpen ? (
        <div
          role="dialog"
          aria-label="Wardroby Outfit Planner Chatbot"
          className="w-[calc(100vw-2.5rem)] sm:w-[410px] h-[540px] max-h-[82vh] rounded-3xl bg-[#0A0A0A] border border-white/20 flex flex-col overflow-hidden text-white"
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
            <div>
              <h3 className="text-sm font-semibold text-white">
                Wardroby Stylist Chat
              </h3>
              <p className="text-xs text-white/55">
                Outfit planning & Q&A · Live web search
              </p>
            </div>
            <div className="flex items-center gap-2">
              {user && savedMessages.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearChat}
                  disabled={clearing || loading}
                  aria-label="Clear saved chat history"
                  title="Clear chat history"
                  className="w-8 h-8 rounded-full border border-white/15 flex items-center justify-center text-white/65 hover:text-white hover:border-white/40 transition-colors cursor-pointer disabled:opacity-40"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close outfit planner chat"
                className="w-8 h-8 rounded-full border border-white/15 flex items-center justify-center text-white/75 hover:text-white hover:border-white/40 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {!user && (
            <div className="px-4 py-2 border-b border-white/10 bg-white/[0.03] flex items-center justify-between gap-2 text-xs">
              <span className="text-white/60">
                Sign in to save chat history
              </span>
              <button
                type="button"
                onClick={onOpenAuth}
                className="inline-flex items-center gap-1.5 text-white hover:text-white/80 font-medium underline underline-offset-4 cursor-pointer shrink-0"
              >
                <UserRound className="w-3 h-3" />
                <span>Google / Guest</span>
              </button>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {displayedMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[88%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed space-y-2.5 ${
                    msg.role === 'user'
                      ? 'bg-white text-black'
                      : 'bg-white/[0.06] text-white/90 border border-white/10'
                  }`}
                >
                  {msg.usedWebSearch && (
                    <div className="inline-flex items-center gap-1.5 text-[11px] text-white/55">
                      <Globe className="w-3 h-3" />
                      <span>Checked live web results via Tavily</span>
                    </div>
                  )}

                  <div className="whitespace-pre-wrap">{msg.content}</div>

                  {msg.sources && msg.sources.length > 0 && (
                    <div className="pt-2 border-t border-white/10 space-y-1">
                      <span className="text-[11px] text-white/45 block">
                        Sources:
                      </span>
                      {msg.sources.map((src, idx) => (
                        <a
                          key={`${src.url}-${idx}`}
                          href={src.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs text-white/75 hover:text-white truncate"
                        >
                          <ExternalLink className="w-3 h-3 shrink-0" />
                          <span className="truncate">{src.title}</span>
                        </a>
                      ))}
                    </div>
                  )}

                  {msg.searchNotice && (
                    <p className="text-[11px] text-white/45 pt-1 border-t border-white/10">
                      Live web search note: {msg.searchNotice}
                    </p>
                  )}
                </div>
              </div>
            ))}

            {displayedMessages.length === 1 && !loading && (
              <div className="pt-2 space-y-1.5">
                <span className="text-[11px] text-white/45 block">
                  Try asking:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {STARTER_QUESTIONS.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => sendMessage(q)}
                      className="text-left text-xs px-3 py-1.5 rounded-full border border-white/15 text-white/75 hover:text-white hover:border-white/40 transition-colors cursor-pointer"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl px-4 py-2.5 text-xs text-white/60 bg-white/[0.04] border border-white/10">
                  Thinking...
                </div>
              </div>
            )}

            {error && (
              <p role="alert" className="text-xs text-white/85 px-1">
                {error}
              </p>
            )}

            <div ref={endRef} />
          </div>

          {/* Input */}
          <form
            onSubmit={handleSubmit}
            className="p-3 border-t border-white/10 flex items-center gap-2 bg-black"
          >
            <label htmlFor="stylist-chat-input" className="sr-only">
              Ask a styling question or plan an outfit
            </label>
            <input
              id="stylist-chat-input"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask any fashion or outfit question..."
              className="flex-1 min-w-0 bg-white/[0.05] border border-white/15 focus:border-white/40 rounded-full px-4 py-2.5 text-sm text-white placeholder:text-white/40 outline-none"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              aria-label="Send message"
              className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center shrink-0 disabled:opacity-40 hover:bg-white/90 transition-colors cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="Open Wardroby Stylist Chat"
          className="liquid-glass rounded-full px-5 py-3 text-white text-sm font-medium flex items-center gap-2.5 hover:bg-white/10 transition-colors cursor-pointer"
        >
          <MessageCircle className="w-4 h-4" />
          <span>Ask Stylist</span>
        </button>
      )}
    </div>
  );
}
