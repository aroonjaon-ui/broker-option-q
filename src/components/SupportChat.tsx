import { useCallback, useEffect, useRef, useState } from 'react';
import { Headset, Loader2, Send, X } from 'lucide-react';
import { ChatMessage, fetchChatMessages, sendChatMessage } from '../cloud';

interface SupportChatProps {
  /** Supabase user id. When null the chat works in local demo mode. */
  userId: string | null;
  userName: string;
  email: string;
}

interface UiMessage {
  id: string;
  sender: 'user' | 'agent';
  message: string;
  createdAt: string;
}

const GREETING =
  'Hi 👋 Welcome to Xena Support. You are connected to our live desk — an agent will reply here shortly. Ask us about deposits, withdrawals, KYC verification or the demo account.';

const QUICK_REPLIES = [
  'How do I deposit?',
  'Withdrawal status',
  'KYC verification',
  'Demo account',
];

function botReply(text: string): string {
  const q = text.toLowerCase();
  if (q.includes('deposit')) {
    return 'Deposits are reviewed by our team: open Funding → Deposit, copy the custody account details, send the transfer, then confirm. Your balance is credited as soon as an admin approves it (usually within minutes).';
  }
  if (q.includes('withdraw')) {
    return 'To withdraw, go to Funding → Withdraw, add your bank details and submit. Your request shows “Pending · awaiting approval”, and the status changes to Approved once an admin completes it. Withdrawals are locked on the demo account.';
  }
  if (q.includes('kyc') || q.includes('verify') || q.includes('document')) {
    return 'Open Portfolio → Identity Verification, upload a photo of your passport / ID and submit. Our compliance team reviews it and you will see “KYC Verified” once approved. You can keep trading in the meantime unless your account is frozen.';
  }
  if (q.includes('demo')) {
    return 'Use the Real / Demo switch in the header. The demo account starts with $10,000 of virtual money so you can practise trading — deposits and withdrawals are locked there.';
  }
  return 'Thanks — a member of our support team will reply here shortly. You can leave the chat open; replies arrive live.';
}

export default function SupportChat({ userId, userName, email }: SupportChatProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [unread, setUnread] = useState(0);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const botTimerRef = useRef<number | null>(null);

  const localKey = `xena_support_chat_v1_${email || userName}`;

  const loadLocal = useCallback((): UiMessage[] => {
    try {
      const raw = localStorage.getItem(localKey);
      if (raw) {
        const parsed = JSON.parse(raw) as UiMessage[];
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return [
      {
        id: 'greeting',
        sender: 'agent',
        message: GREETING,
        createdAt: new Date().toISOString(),
      },
    ];
  }, [localKey]);

  const persistLocal = useCallback(
    (next: UiMessage[]) => {
      try {
        localStorage.setItem(localKey, JSON.stringify(next.slice(-100)));
      } catch {
        // ignore
      }
    },
    [localKey]
  );

  const load = useCallback(async () => {
    if (!userId) {
      setMessages(loadLocal());
      return;
    }
    setLoading(true);
    const res = await fetchChatMessages(userId);
    setLoading(false);
    if (res.messages.length === 0) {
      setMessages([
        {
          id: 'greeting',
          sender: 'agent',
          message: GREETING,
          createdAt: new Date().toISOString(),
        },
      ]);
    } else {
      setMessages(
        res.messages.map((m: ChatMessage) => ({
          id: m.id,
          sender: m.sender,
          message: m.message,
          createdAt: m.createdAt,
        }))
      );
    }
  }, [userId, loadLocal]);

  useEffect(() => {
    if (!open) return;
    void load();
  }, [open, load]);

  // Live replies from the admin desk.
  useEffect(() => {
    if (!open || !userId) return;
    const timer = window.setInterval(() => {
      void (async () => {
        const res = await fetchChatMessages(userId);
        if (!res.ok) return;
        setMessages((prev) => {
          const incoming = res.messages;
          if (incoming.length === 0) return prev;
          if (incoming.length <= prev.length) return prev;
          const previousIds = new Set(prev.map((m) => m.id));
          const added = incoming.filter((m) => !previousIds.has(m.id));
          if (added.length === 0) return prev;
          if (!open) setUnread((u) => u + added.filter((m) => m.sender === 'agent').length);
          return [
            ...prev,
            ...added.map((m) => ({
              id: m.id,
              sender: m.sender,
              message: m.message,
              createdAt: m.createdAt,
            })),
          ];
        });
      })();
    }, 5000);
    return () => window.clearInterval(timer);
  }, [open, userId]);

  useEffect(() => {
    if (open) setUnread(0);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, open]);

  useEffect(() => {
    return () => {
      if (botTimerRef.current) window.clearTimeout(botTimerRef.current);
    };
  }, []);

  const handleSend = async (text?: string) => {
    const body = (text ?? draft).trim();
    if (!body || sending) return;
    setDraft('');

    const optimistic: UiMessage = {
      id: `local-${Date.now()}`,
      sender: 'user',
      message: body,
      createdAt: new Date().toISOString(),
    };

    if (!userId) {
      const next = [...messages, optimistic];
      setMessages(next);
      persistLocal(next);
      botTimerRef.current = window.setTimeout(() => {
        setMessages((prev) => {
          const reply: UiMessage = {
            id: `bot-${Date.now()}`,
            sender: 'agent',
            message: botReply(body),
            createdAt: new Date().toISOString(),
          };
          const withReply = [...prev, reply];
          persistLocal(withReply);
          return withReply;
        });
      }, 900);
      return;
    }

    setMessages((prev) => [...prev, optimistic]);
    setSending(true);
    const res = await sendChatMessage(userId, body);
    setSending(false);
    if (!res.ok) {
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          sender: 'agent',
          message:
            'We could not deliver that message. Please check your connection and try again, or email support@xenabroker.com.',
          createdAt: new Date().toISOString(),
        },
      ]);
      return;
    }
    await load();
  };

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-4 z-[60] inline-flex items-center gap-2 rounded-full bg-[#06182B] px-4 py-3 text-sm font-semibold text-white shadow-xl ring-1 ring-white/10 hover:bg-[#0B3A5C] transition-colors cursor-pointer"
          aria-label="Open live support chat"
        >
          <span className="relative inline-flex">
            <Headset className="w-5 h-5" />
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-[#06182B]" />
          </span>
          <span className="hidden sm:inline">Support</span>
          {unread > 0 && (
            <span className="ml-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold">
              {unread}
            </span>
          )}
        </button>
      )}

      {open && (
        <div className="fixed inset-x-3 bottom-3 z-[70] sm:inset-x-auto sm:right-5 sm:bottom-5 sm:w-[370px]">
          <div className="flex max-h-[78vh] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center gap-3 bg-gradient-to-r from-[#06182B] to-[#0B3A5C] px-4 py-3 text-white">
              <span className="relative inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10">
                <Headset className="w-4.5 h-4.5" />
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-[#06182B]" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold leading-tight">Xena Support</p>
                <p className="text-[11px] text-emerald-300">Live · agents online</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close support chat"
                className="rounded-lg p-1.5 text-slate-300 hover:bg-white/10 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div ref={scrollRef} className="flex-1 space-y-2.5 overflow-y-auto bg-slate-50 px-3.5 py-3.5">
              {loading && (
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading conversation…
                </div>
              )}
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-[13px] leading-relaxed shadow-sm ${
                      m.sender === 'user'
                        ? 'rounded-br-md bg-emerald-600 text-white'
                        : 'rounded-bl-md border border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    {m.message}
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-200 bg-white px-3 py-2.5">
              <div className="mb-2 flex gap-1.5 overflow-x-auto pb-1">
                {QUICK_REPLIES.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => void handleSend(q)}
                    className="whitespace-nowrap rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:border-emerald-300 hover:text-emerald-700 cursor-pointer"
                  >
                    {q}
                  </button>
                ))}
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleSend();
                }}
                className="flex items-center gap-2"
              >
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Type your message…"
                  className="flex-1 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/15"
                />
                <button
                  type="submit"
                  disabled={!draft.trim() || sending}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
                  aria-label="Send message"
                >
                  {sending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
