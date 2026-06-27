import { useCallback, useEffect, useRef, useState } from 'react';

const PREVIEW_TEXT = 'Hello, this is Mia from Lagnaa One. How can I help you today?';

const VOICE_LOCALE: Record<string, { lang: string; preferFemale?: boolean }> = {
  'elevenlabs:emilia': { lang: 'en-GB', preferFemale: true },
  'elevenlabs:grace': { lang: 'en-GB', preferFemale: true },
  'elevenlabs:amelia': { lang: 'en-GB', preferFemale: true },
  grace: { lang: 'en-GB', preferFemale: true },
  amelia: { lang: 'en-GB', preferFemale: true },
  'Polly.Amy': { lang: 'en-GB', preferFemale: true },
  'Polly.Brian': { lang: 'en-GB', preferFemale: false },
  'Polly.Emma': { lang: 'en-GB', preferFemale: true },
  'Polly.Joanna': { lang: 'en-US', preferFemale: true },
  'Polly.Matthew': { lang: 'en-US', preferFemale: false },
  'Polly.Raveena': { lang: 'en-IN', preferFemale: true },
  'Polly.Aditi': { lang: 'en-IN', preferFemale: true },
};

function pickVoice(voiceId: string): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;

  const pref = VOICE_LOCALE[voiceId] ?? { lang: 'en-GB', preferFemale: true };
  const langPrefix = pref.lang.toLowerCase();

  const inLocale = voices.filter((v) => v.lang.toLowerCase().startsWith(langPrefix));
  const pool = inLocale.length ? inLocale : voices.filter((v) => v.lang.toLowerCase().startsWith('en'));

  if (!pool.length) return voices[0] ?? null;

  if (pref.preferFemale) {
    const female = pool.find((v) => /female|zira|samantha|karen|veena|raveena|aditi|susan|hazel/i.test(v.name));
    if (female) return female;
  } else {
    const male = pool.find((v) => /male|david|mark|daniel|george|richard/i.test(v.name));
    if (male) return male;
  }

  return pool[0];
}

export function useVoicePreview() {
  const [playing, setPlaying] = useState(false);
  const [voicesReady, setVoicesReady] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    const load = () => setVoicesReady(window.speechSynthesis.getVoices().length > 0);
    load();
    window.speechSynthesis.onvoiceschanged = load;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    setPlaying(false);
    utteranceRef.current = null;
  }, []);

  const preview = useCallback(
    (voiceId: string, text = PREVIEW_TEXT) => {
      if (!('speechSynthesis' in window)) {
        throw new Error('Voice preview is not supported in this browser.');
      }

      stop();

      const utterance = new SpeechSynthesisUtterance(text);
      const matched = pickVoice(voiceId);
      if (matched) utterance.voice = matched;
      utterance.lang = VOICE_LOCALE[voiceId]?.lang ?? 'en-GB';
      utterance.rate = 0.92;
      utterance.pitch = 1;

      utterance.onstart = () => setPlaying(true);
      utterance.onend = () => setPlaying(false);
      utterance.onerror = () => setPlaying(false);

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    },
    [stop]
  );

  useEffect(() => () => stop(), [stop]);

  return { preview, stop, playing, voicesReady, previewText: PREVIEW_TEXT };
}