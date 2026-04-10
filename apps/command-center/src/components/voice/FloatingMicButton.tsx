'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { toast } from 'sonner';

// Web Speech API type shim
type SR = {
  new (): {
    lang: string;
    continuous: boolean;
    interimResults: boolean;
    onresult: ((e: any) => void) | null;
    onerror: ((e: any) => void) | null;
    onend: (() => void) | null;
    start: () => void;
    stop: () => void;
    abort: () => void;
  };
};
declare global {
  interface Window {
    SpeechRecognition?: SR;
    webkitSpeechRecognition?: SR;
  }
}

type Status = 'idle' | 'listening' | 'processing' | 'done' | 'error';

const MIN_REQUEST_INTERVAL_MS = 2000;

const PAGE_MAP: Record<string, string> = {
  events: 'events',
  finance: 'finance',
  production: 'production',
  inventory: 'production',
  orders: 'sales',
  sales: 'sales',
};

function pathnameToPage(pathname: string): string {
  // e.g. /dashboard/events → events, /dashboard/finance → finance
  const segments = pathname.split('/').filter(Boolean);
  const raw = segments[1] ?? segments[0] ?? 'dashboard';
  return PAGE_MAP[raw] ?? raw;
}

const NAV_ROUTES: Record<string, string> = {
  expenses: '/dashboard/finance',
  finance: '/dashboard/finance',
  batches: '/dashboard/production',
  production: '/dashboard/production',
  sales: '/dashboard/orders',
  orders: '/dashboard/orders',
  events: '/dashboard/events',
  inventory: '/dashboard/inventory',
  dashboard: '/dashboard',
  home: '/dashboard',
};

export function FloatingMicButton() {
  const pathname = usePathname();
  const router = useRouter();
  const [status, setStatus] = useState<Status>('idle');
  const [transcript, setTranscript] = useState('');
  const [supported, setSupported] = useState(true);
  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef('');
  const lastRequestRef = useRef(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!window.SpeechRecognition && !window.webkitSpeechRecognition)
      setSupported(false);
  }, []);

  const flashDone = useCallback((msg?: string) => {
    setStatus('done');
    if (msg) toast.success(msg);
    setTimeout(() => {
      setStatus('idle');
      setTranscript('');
    }, 1500);
  }, []);

  const handleSubmit = useCallback(async () => {
    const text = transcriptRef.current.trim();
    if (!text) {
      setStatus('idle');
      return;
    }

    const now = Date.now();
    if (now - lastRequestRef.current < MIN_REQUEST_INTERVAL_MS) {
      toast.warning('Slow down a moment');
      setStatus('idle');
      return;
    }
    lastRequestRef.current = now;
    setStatus('processing');

    // Client-side navigation commands
    const lower = text.toLowerCase();
    for (const [phrase, route] of Object.entries(NAV_ROUTES)) {
      if (lower.includes(`go to ${phrase}`) || lower.includes(`open ${phrase}`)) {
        router.push(route);
        flashDone(`Navigating to ${phrase}`);
        return;
      }
    }
    if (lower === 'cancel' || lower === 'dismiss' || lower === 'never mind') {
      setStatus('idle');
      setTranscript('');
      return;
    }

    const page = pathnameToPage(pathname || '/');

    try {
      const res = await fetch('/api/voice-input', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: text, page, existingFields: {} }),
      });
      if (!res.ok && res.status === 401) {
        toast.error('Please log in to use voice');
        setStatus('idle');
        return;
      }
      if (!res.ok && res.status === 429) {
        toast.warning('Slow down a moment');
        setStatus('idle');
        return;
      }
      const data = await res.json();

      // Dispatch action commands
      if (data.action === 'submit' || data.action === 'clear') {
        window.dispatchEvent(
          new CustomEvent('voiceAction', {
            detail: { page, action: data.action },
          })
        );
      }

      // Dispatch fill event — forms listen via useVoiceFill()
      const filledCount = Object.keys(data.filledFields ?? {}).length;
      if (filledCount > 0) {
        window.dispatchEvent(
          new CustomEvent('voiceFill', {
            detail: { page, fields: data.filledFields },
          })
        );
      }

      // Handle follow-up
      if (data.followUpQuestion) {
        toast.info(data.followUpQuestion, { duration: 4000 });
        setStatus('idle');
        // Re-open mic after brief delay for follow-up
        setTimeout(() => startListening(), 1200);
        return;
      }

      if (data.confidence === 'low') {
        toast.warning('Please review — voice wasn\'t sure', { duration: 3000 });
      } else if (filledCount > 0) {
        toast.success(`Filled ${filledCount} field${filledCount === 1 ? '' : 's'}`);
      }

      flashDone();
    } catch {
      setStatus('error');
      toast.error('Couldn\'t process voice — try again');
      setTimeout(() => setStatus('idle'), 2000);
    }
  }, [pathname, router, flashDone]);

  const startListening = useCallback(() => {
    const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Ctor) {
      setSupported(false);
      toast.error('Voice not supported — use Chrome or Safari');
      return;
    }

    const rec = new Ctor();
    rec.lang = 'en-US';
    rec.continuous = false;
    rec.interimResults = true;

    rec.onresult = (e: any) => {
      let text = '';
      for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript;
      transcriptRef.current = text;
      setTranscript(text);
    };
    rec.onerror = () => {
      setStatus('error');
      toast.error('Couldn\'t understand — try again');
      setTimeout(() => setStatus('idle'), 2000);
    };
    rec.onend = () => handleSubmit();

    recognitionRef.current = rec;
    transcriptRef.current = '';
    setTranscript('');
    setStatus('listening');
    try {
      rec.start();
    } catch {
      // browser may throw if already started
    }
  }, [handleSubmit]);

  const onTap = () => {
    if (status === 'listening') {
      recognitionRef.current?.stop();
      return;
    }
    if (status === 'processing') return;
    startListening();
  };

  // Listen for voiceAction events (submit/clear) on any page
  useEffect(() => {
    function handler(e: Event) {
      const { action } = (e as CustomEvent).detail ?? {};
      const form = document.querySelector<HTMLFormElement>('form[data-voice-page]');
      if (!form) return;
      if (action === 'submit') form.requestSubmit();
      if (action === 'clear') form.reset();
    }
    window.addEventListener('voiceAction', handler);
    return () => window.removeEventListener('voiceAction', handler);
  }, []);

  const isListening = status === 'listening';
  const isProcessing = status === 'processing';
  const isDone = status === 'done';
  const isError = status === 'error';

  return (
    <div className="fixed right-4 z-50 flex flex-col items-end gap-2 bottom-6">
      {/* Live transcript bubble */}
      {transcript && status === 'listening' && (
        <div className="mb-1 max-w-[75vw] rounded-full bg-caribbean-black/90 px-4 py-2 text-sm text-white shadow-lg backdrop-blur-sm">
          {transcript}
        </div>
      )}

      <button
        type="button"
        aria-label={supported ? 'Voice input' : 'Voice not supported'}
        disabled={!supported || isProcessing}
        onClick={onTap}
        className={`
          relative flex h-14 w-14 items-center justify-center rounded-full
          text-white shadow-xl transition-transform active:scale-95
          disabled:opacity-50
          ${isDone ? 'bg-caribbean-green-light' : isError ? 'bg-caribbean-red' : 'bg-caribbean-green hover:bg-caribbean-green-light'}
        `}
      >
        {/* Pulsing ring when listening */}
        {isListening && (
          <span className="absolute inset-0 rounded-full bg-caribbean-red/40 animate-[pulse-ring_1.2s_cubic-bezier(0.4,0,0.6,1)_infinite]" />
        )}

        {isProcessing ? (
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
        ) : isDone ? (
          <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="3">
            <path d="M5 12l5 5L20 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="h-7 w-7" fill="currentColor">
            <path d="M12 14a3 3 0 003-3V6a3 3 0 10-6 0v5a3 3 0 003 3z" />
            <path d="M19 11a1 1 0 10-2 0 5 5 0 01-10 0 1 1 0 10-2 0 7 7 0 006 6.93V21a1 1 0 102 0v-3.07A7 7 0 0019 11z" />
          </svg>
        )}
      </button>
    </div>
  );
}
