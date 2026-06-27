/** Production voice stack — young natural British female on phone calls. */

export const GROQ_MODEL = 'llama-3.3-70b-versatile';
export const GROQ_TEMPERATURE = 0.05;
export const GROQ_MAX_TOKENS = 400;

export const STT_PROVIDER = 'Deepgram';
export const STT_MODEL = 'nova-3-general';
export const STT_LANGUAGE = 'en-GB';
export const STT_ENDPOINT_MS = 600;

/** Hang up if the client says nothing for this long after the AI finishes speaking. */
export const CLIENT_SILENCE_TIMEOUT_SEC = 10;

export const TTS_PROVIDER = 'ElevenLabs';
export const TTS_MODEL = 'turbo_v2_5';

export interface VoiceProfile {
  elevenId: string;
  label: string;
  speed: number;
  stability: number;
  similarity: number;
}

/** Emilia — young, British, engaging (default). */
export const ELEVENLABS_EMILIA_VOICE_ID = 'E4IXevHtHpKGh0bvrPPr';
export const ELEVENLABS_AMELIA_VOICE_ID = 'ZF6FPAbjXT4488VcRRnw';
export const ELEVENLABS_GRACE_VOICE_ID = 'oWAxZDx7w5VEj9dCyTzz';

export const VOICE_PROFILES: Record<string, VoiceProfile> = {
  'elevenlabs:emilia': {
    elevenId: ELEVENLABS_EMILIA_VOICE_ID,
    label: 'Emilia',
    speed: 1.06,
    stability: 0.26,
    similarity: 0.7,
  },
  'elevenlabs:amelia': {
    elevenId: ELEVENLABS_AMELIA_VOICE_ID,
    label: 'Amelia',
    speed: 1.08,
    stability: 0.28,
    similarity: 0.72,
  },
  'elevenlabs:grace': {
    elevenId: ELEVENLABS_GRACE_VOICE_ID,
    label: 'Grace',
    speed: 1.04,
    stability: 0.3,
    similarity: 0.74,
  },
};

export const DEFAULT_VOICE_ID = 'elevenlabs:emilia';

export const VOICE_STACK_LABEL = {
  llm: `Groq ${GROQ_MODEL} (temp ${GROQ_TEMPERATURE}, max ${GROQ_MAX_TOKENS})`,
  stt: `${STT_PROVIDER} ${STT_MODEL} · ${STT_LANGUAGE} · ${STT_ENDPOINT_MS}ms endpoint · ${CLIENT_SILENCE_TIMEOUT_SEC}s silence hangup`,
  tts: `${TTS_PROVIDER} Emilia · ${TTS_MODEL} · young UK · emotional delivery`,
} as const;

export function getVoiceProfile(voiceId?: string): VoiceProfile {
  return VOICE_PROFILES[voiceId ?? ''] ?? VOICE_PROFILES[DEFAULT_VOICE_ID];
}

/** Twilio format: voiceId-model-speed_stability_similarity */
export function buildRelayVoiceString(profile: VoiceProfile): string {
  return `${profile.elevenId}-${TTS_MODEL}-${profile.speed}_${profile.stability}_${profile.similarity}`;
}

export function getConversationRelayVoice(voiceId?: string): string {
  return buildRelayVoiceString(getVoiceProfile(voiceId));
}

export function getSpeechLanguage(toNumber?: string): string {
  if (toNumber?.replace(/\s/g, '').startsWith('+91')) return 'en-IN';
  if (toNumber?.startsWith('+1')) return 'en-US';
  return STT_LANGUAGE;
}