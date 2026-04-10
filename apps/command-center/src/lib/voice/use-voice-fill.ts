'use client';

import { useEffect, useState, useCallback, useRef } from 'react';

export type VoiceFillFields = Record<string, unknown>;

/**
 * Hook that listens for voice-fill events dispatched by FloatingMicButton.
 * When the event's page matches, returns the filled fields.
 *
 * Usage in a form component:
 *   const voiceFields = useVoiceFill('events');
 *   useEffect(() => {
 *     if (!voiceFields) return;
 *     // apply fields to your local state / native inputs
 *   }, [voiceFields]);
 */
export function useVoiceFill(page: string) {
  const [fields, setFields] = useState<VoiceFillFields | null>(null);

  useEffect(() => {
    function handler(e: Event) {
      const detail = (e as CustomEvent).detail;
      if (detail?.page === page && detail.fields) {
        setFields({ ...detail.fields });
      }
    }
    window.addEventListener('voiceFill', handler);
    return () => window.removeEventListener('voiceFill', handler);
  }, [page]);

  // Reset after consumer processes
  const consume = useCallback(() => setFields(null), []);

  return { voiceFields: fields, consumeVoice: consume };
}
