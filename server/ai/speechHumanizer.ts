/** Warm up scripted lines so ElevenLabs sounds young, natural, and emotionally alive on phone calls. */

const WARM_REPLACEMENTS: [RegExp, string][] = [
  [/^Hello\.?$/i, 'Hiya!'],
  [/^Hi, I'm Mia\b/i, "Hiya! I'm Mia"],
  [/^Hi, I am Mia\b/i, "Hiya! I'm Mia"],
  [/\bI'm sorry\b/gi, "Oh, I'm sorry"],
  [/\bI apologise\b/gi, "I'm so sorry"],
  [/\bMay I please speak with\b/gi, 'Could I speak with'],
  [/\bCould you please\b/gi, 'Could you just'],
  [/\bThank you\./g, 'Lovely, thank you!'],
  [/\bThank you for your time\b/gi, 'Thanks so much for your time'],
  [/\bThank you\b/gi, 'Thanks'],
  [/\bI understand\./g, 'I totally understand.'],
  [/\bI understand\b/gi, 'I totally get that'],
  [/\bUnfortunately\b/gi, 'Ah, unfortunately'],
  [/\bGoodbye\./g, 'Take care, bye!'],
  [/\bHave a great day\./gi, 'Have a lovely day!'],
  [/\bWould you be happy to hear more\b/gi, 'Would you like to hear a bit more'],
  [/\bAre you happy for us to proceed\?/gi, 'Shall we go ahead with that?'],
  [/\bJust to confirm\b/gi, 'Just quickly'],
  [/\bOf course\./g, 'Of course!'],
];

export function humanizeForSpeech(text: string): string {
  let out = text.trim();
  if (!out) return out;

  for (const [pattern, replacement] of WARM_REPLACEMENTS) {
    out = out.replace(pattern, replacement);
  }

  // Breathable pacing — short pauses between thoughts (ElevenLabs reads "..." naturally).
  if (out.length > 90) {
    out = out.replace(/([.!?])\s+(?=[A-Z])/g, '$1... ');
  }

  // Keep very short replies snappy (no dramatic pauses on "Thanks!" etc.)
  if (out.length < 55) {
    out = out.replace(/\.\.\.\s*/g, ', ');
  }

  return out;
}

/** Split into small streaming phrases so TTS picks up intonation per chunk. */
export function splitIntoSpeakPhrases(text: string): string[] {
  const humanized = humanizeForSpeech(text);
  const rawParts = humanized
    .split(/\s*\.\.\.\s*|\s*(?<=[.!?])\s+/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (rawParts.length <= 1) return [humanized];

  return rawParts.map((part, index) => {
    const needsSpace = index < rawParts.length - 1 && !/[.!?]$/.test(part);
    return needsSpace ? `${part} ` : part;
  });
}