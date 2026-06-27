const VOICEMAIL_SPEECH_PATTERNS: RegExp[] = [
  /\bleave (a |your )?(message|msg)\b/i,
  /\bafter the (tone|beep)\b/i,
  /\bat the tone\b/i,
  /\bnot available\b/i,
  /\bunable to take (your |this )?call\b/i,
  /\bcan(?:not|'t) (?:come to|take) the phone\b/i,
  /\bplease record\b/i,
  /\brecord your message\b/i,
  /\bmailbox\b/i,
  /\bvoice\s?mail\b/i,
  /\banswering machine\b/i,
  /\bpress \d/i,
  /\bautomated (?:message|system|voice)\b/i,
  /\bthis is an automated\b/i,
  /\byour call has been forwarded\b/i,
  /\bthe person you (?:are calling|have called)\b/i,
  /\bis not reachable\b/i,
  /\bsubscriber (?:you have called |cannot be reached)\b/i,
  /\bwelcome to (?:the )?[\w\s]*voicemail\b/i,
  /\byou(?:'ve| have) reached\b/i,
  /\bsorry.*missed your call\b/i,
  /\bget back to you (?:as soon|shortly)\b/i,
  /\bwhen you (?:have finished|are done) recording\b/i,
  /\bto re-?record\b/i,
  /\bto send an? sms\b/i,
  /\boffice hours\b/i,
  /\bcurrently (?:unavailable|busy|closed)\b/i,
];

const MACHINE_ANSWERED_BY = new Set([
  'machine_start',
  'machine_end_beep',
  'machine_end_silence',
  'machine_end_other',
  'fax',
]);

export function isTwilioMachineAnswer(answeredBy?: string): boolean {
  if (!answeredBy?.trim()) return false;
  const key = answeredBy.trim().toLowerCase();
  if (key === 'human') return false;
  return MACHINE_ANSWERED_BY.has(key) || key.startsWith('machine');
}

export function isVoicemailSpeech(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length < 4) return false;
  return VOICEMAIL_SPEECH_PATTERNS.some((pattern) => pattern.test(trimmed));
}