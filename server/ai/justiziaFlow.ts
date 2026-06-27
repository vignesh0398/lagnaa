import type { CallSession } from './conversation.js';
import { applyTemplate } from './promptStore.js';
import { generateBriefAnswer } from './groq.js';
import { isVoicemailSpeech } from './voicemailDetect.js';

export type FlowAction =
  | { type: 'continue'; say: string; nextStep: CallSession['step'] }
  | { type: 'end'; say: string; outcome: string };

function vars(session: CallSession): Record<string, string> {
  return { clientName: session.clientName };
}

function script(session: CallSession, key: keyof CallSession['scripts']): string {
  return applyTemplate(session.scripts[key], vars(session));
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function isYes(text: string): boolean {
  const l = text.toLowerCase();
  return /\b(yes|yeah|yep|sure|ok|okay|correct|right|absolutely|go ahead|please|happy to|i am|speaking|that's me|this is|it is|hello|hi)\b/.test(l);
}

function isConfirmingIdentity(text: string, clientName: string): boolean {
  if (isYes(text)) return true;
  const parts = clientName.toLowerCase().split(/\s+/).filter((p) => p.length > 2);
  const l = text.toLowerCase();
  return parts.some((part) => l.includes(part));
}

function isNo(text: string): boolean {
  const l = text.toLowerCase();
  return /\b(no|nope|nah|not really|don't want|do not want|not happy)\b/.test(l) && !isYes(text);
}

function isNotInterested(text: string): boolean {
  const l = text.toLowerCase();
  return /\b(not interested|no thanks|no thank you|leave me alone|stop calling)\b/.test(l);
}

function isDND(text: string): boolean {
  const l = text.toLowerCase();
  return /\b(do not call|don't call|dnd|do not disturb|remove me|take me off|stop contacting)\b/.test(l);
}

function isWrongPerson(text: string): boolean {
  const l = text.toLowerCase();
  return (
    /\b(wrong (person|number)|not me|not him|not her|they('re| are) not|nobody here|no one here)\b/.test(l) ||
    (/\bno\b/.test(l) && /\b(speaking|here|me)\b/.test(l))
  );
}

function isNoTime(text: string): boolean {
  const l = text.toLowerCase();
  return /\b(busy|no time|don't have time|bad time|can't talk|not a good time|in a meeting)\b/.test(l);
}

function isCallbackRequest(text: string): boolean {
  const l = text.toLowerCase();
  return /\b(callback|call back|call me later|later|tomorrow|another time|schedule)\b/.test(l);
}

function isRefusingVerification(text: string): boolean {
  const l = text.toLowerCase();
  return (
    /\b(won't|will not|refuse|don't want to give|not giving|rather not)\b/.test(l) &&
    /\b(dob|birth|postcode|post code|verify|verification|details)\b/.test(l)
  );
}

function isQuestion(text: string): boolean {
  const l = text.toLowerCase();
  return l.includes('?') || /\b(what|who|why|how|when|where|which|can you explain|tell me)\b/.test(l);
}

const MONTH_PATTERN =
  /\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)\b/i;

const YEAR_PATTERN =
  /\b(19\d{2}|20\d{2}|nineteen|twenty)\b|\b\d{2}\b(?!\s*(am|pm))/i;

const DAY_PATTERN =
  /\b(\d{1,2}(?:st|nd|rd|th)?|first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth|thirteenth|fourteenth|fifteenth|sixteenth|seventeenth|eighteenth|nineteenth|twentieth|twenty[- ]?(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|thirtieth|thirty[- ]?first))\b/i;

const MAX_VERIFY_RETRIES = 3;

type DateParts = { year: number; month: number; day: number };

const MONTH_LOOKUP: Record<string, number> = {
  january: 1,
  jan: 1,
  february: 2,
  feb: 2,
  march: 3,
  mar: 3,
  april: 4,
  apr: 4,
  may: 5,
  june: 6,
  jun: 6,
  july: 7,
  jul: 7,
  august: 8,
  aug: 8,
  september: 9,
  sep: 9,
  sept: 9,
  october: 10,
  oct: 10,
  november: 11,
  nov: 11,
  december: 12,
  dec: 12,
};

function isValidDateParts(parts: DateParts): boolean {
  return (
    parts.year >= 1900 &&
    parts.year <= 2100 &&
    parts.month >= 1 &&
    parts.month <= 12 &&
    parts.day >= 1 &&
    parts.day <= 31
  );
}

function addDateCandidate(candidates: DateParts[], parts: DateParts | null): void {
  if (parts && isValidDateParts(parts)) candidates.push(parts);
}

function parseDigitsAsDates(digits: string): DateParts[] {
  const candidates: DateParts[] = [];
  if (digits.length === 8) {
    if (/^(19|20)\d{6}$/.test(digits)) {
      addDateCandidate(candidates, {
        year: Number(digits.slice(0, 4)),
        month: Number(digits.slice(4, 6)),
        day: Number(digits.slice(6, 8)),
      });
    }
    addDateCandidate(candidates, {
      year: Number(digits.slice(4, 8)),
      month: Number(digits.slice(2, 4)),
      day: Number(digits.slice(0, 2)),
    });
    addDateCandidate(candidates, {
      year: Number(digits.slice(4, 8)),
      month: Number(digits.slice(0, 2)),
      day: Number(digits.slice(2, 4)),
    });
  }
  if (digits.length === 6) {
    const yy = Number(digits.slice(4, 6));
    const year = yy >= 30 ? 1900 + yy : 2000 + yy;
    addDateCandidate(candidates, {
      year,
      month: Number(digits.slice(2, 4)),
      day: Number(digits.slice(0, 2)),
    });
  }
  return candidates;
}

function parseSpokenMonthDate(text: string): DateParts[] {
  const candidates: DateParts[] = [];
  const monthMatch = text.match(MONTH_PATTERN);
  if (!monthMatch) return candidates;

  const month = MONTH_LOOKUP[monthMatch[1].toLowerCase()];
  if (!month) return candidates;

  const yearMatch = text.match(/\b(19|20)\d{2}\b/);
  let year: number | undefined = yearMatch ? Number(yearMatch[0]) : undefined;

  let day: number | undefined;
  const dayMatch = text.match(/\b(\d{1,2})(?:st|nd|rd|th)?\b/);
  if (dayMatch) day = Number(dayMatch[1]);

  if (!year) {
    const gluedYear = text.match(/\b(\d{1,2})(\d{4})\b/);
    if (gluedYear) {
      const maybeDay = Number(gluedYear[1]);
      const maybeYear = Number(gluedYear[2]);
      if (maybeYear >= 1900 && maybeYear <= 2100) {
        day = day ?? maybeDay;
        year = maybeYear;
      }
    }
  }

  if (!year) {
    const compact = text.match(/\b(\d{3,6})\b/);
    if (compact) {
      const n = compact[1];
      if (n.length === 4) {
        const maybeDay = Number(n[0]);
        const maybeYear = 1900 + Number(n.slice(-2));
        if (maybeYear >= 1900 && maybeYear <= 2100) {
          day = day ?? maybeDay;
          year = maybeYear;
        }
      }
    }
  }

  if (!year) {
    const shortYear = text.match(/\b(\d{2})\b(?!:)/);
    if (shortYear) {
      const yy = Number(shortYear[1]);
      year = yy >= 30 ? 1900 + yy : 2000 + yy;
    }
  }

  if (year && day) addDateCandidate(candidates, { year, month, day });
  return candidates;
}

function extractDateCandidates(text: string): DateParts[] {
  const candidates: DateParts[] = [];
  const trimmed = text.trim();

  const iso = trimmed.match(/\b((19|20)\d{2})[-/](\d{1,2})[-/](\d{1,2})\b/);
  if (iso) {
    addDateCandidate(candidates, {
      year: Number(iso[1]),
      month: Number(iso[3]),
      day: Number(iso[4]),
    });
  }

  const dmy = trimmed.match(/\b(\d{1,2})[-/](\d{1,2})[-/]((?:19|20)?\d{2,4})\b/);
  if (dmy) {
    const yearRaw = dmy[3];
    const year =
      yearRaw.length === 2
        ? Number(yearRaw) >= 30
          ? 1900 + Number(yearRaw)
          : 2000 + Number(yearRaw)
        : Number(yearRaw);
    addDateCandidate(candidates, {
      year,
      month: Number(dmy[2]),
      day: Number(dmy[1]),
    });
    addDateCandidate(candidates, {
      year,
      month: Number(dmy[1]),
      day: Number(dmy[2]),
    });
  }

  for (const parts of parseDigitsAsDates(trimmed.replace(/\D/g, ''))) {
    addDateCandidate(candidates, parts);
  }

  for (const parts of parseSpokenMonthDate(trimmed)) {
    addDateCandidate(candidates, parts);
  }

  return candidates;
}

function sameDate(a: DateParts, b: DateParts): boolean {
  return a.year === b.year && a.month === b.month && a.day === b.day;
}

function looksLikeDob(spoken: string): boolean {
  const trimmed = spoken.trim();
  if (trimmed.length < 3) return false;

  const digits = trimmed.replace(/\D/g, '');
  if (digits.length >= 6) return true;
  if (digits.length >= 4 && MONTH_PATTERN.test(trimmed)) return true;

  const hasMonth = MONTH_PATTERN.test(trimmed);
  const hasDay = DAY_PATTERN.test(trimmed);
  const hasYear = YEAR_PATTERN.test(trimmed);
  if (hasMonth && (hasDay || hasYear)) return true;
  if (hasDay && hasYear) return true;

  return digits.length >= 4;
}

function verifyDob(spoken: string, expected?: string): boolean {
  if (!looksLikeDob(spoken)) return false;

  if (!expected) return true;

  const expectedDates = extractDateCandidates(expected);
  const spokenDates = extractDateCandidates(spoken);

  if (expectedDates.length && spokenDates.length) {
    for (const spokenDate of spokenDates) {
      for (const expectedDate of expectedDates) {
        if (sameDate(spokenDate, expectedDate)) return true;
      }
    }
  }

  const spokenDigits = spoken.replace(/\D/g, '');
  const expectedDigits = expected.replace(/\D/g, '');

  if (spokenDigits.length >= 4 && expectedDigits.length >= 4) {
    if (spokenDigits === expectedDigits) return true;
    if (spokenDigits.includes(expectedDigits) || expectedDigits.includes(spokenDigits)) return true;
    if (spokenDigits.slice(-6) === expectedDigits.slice(-6)) return true;
  }

  const spokenNorm = normalize(spoken);
  const expectedNorm = normalize(expected);
  return spokenNorm.includes(expectedNorm) || expectedNorm.includes(spokenNorm);
}

function looksLikePostcode(spoken: string): boolean {
  const trimmed = spoken.trim();
  if (trimmed.length < 3) return false;
  const alnum = trimmed.replace(/[^a-zA-Z0-9]/g, '');
  return alnum.length >= 3;
}

function verifyPostcode(spoken: string, expected?: string): boolean {
  if (!looksLikePostcode(spoken)) return false;
  if (!expected) return true;

  const spokenNorm = normalize(spoken);
  const expectedNorm = normalize(expected);
  return spokenNorm.includes(expectedNorm) || expectedNorm.includes(spokenNorm);
}

function isAcknowledgmentOnly(text: string): boolean {
  const l = text.toLowerCase().trim();
  return /^(yes|yeah|yep|ok|okay|sure|go ahead|fine|alright|uh huh|mm hmm|right|correct)$/.test(l);
}

async function handleInterruption(session: CallSession, userSpeech: string): Promise<string | null> {
  if (!isQuestion(userSpeech)) return null;
  return generateBriefAnswer(session, userSpeech);
}

export function getHelloScript(session?: CallSession): string {
  return session ? script(session, 'hello') : 'Hello.';
}

export async function processFlowInput(session: CallSession, userSpeech: string): Promise<FlowAction> {
  const { clientName, step } = session;

  if (isVoicemailSpeech(userSpeech)) {
    session.outcomes.voicemail = true;
    session.outcomes.finalOutcome = 'Voicemail';
    return { type: 'end', say: '', outcome: 'Voicemail' };
  }

  if (isDND(userSpeech)) {
    session.outcomes.dnd = true;
    session.outcomes.finalOutcome = 'DND Requested';
    return { type: 'end', say: script(session, 'dndEnd'), outcome: 'DND Requested' };
  }

  const interruption = await handleInterruption(session, userSpeech);

  switch (step) {
    case 'hello': {
      const prefix = interruption ? `${interruption} ` : '';
      return { type: 'continue', say: `${prefix}${script(session, 'intro')}`, nextStep: 'intro_confirm' };
    }

    case 'intro_confirm': {
      if (isWrongPerson(userSpeech)) {
        session.outcomes.correctPerson = false;
        session.outcomes.finalOutcome = 'Wrong Person';
        return { type: 'end', say: script(session, 'wrongPersonEnd'), outcome: 'Wrong Person' };
      }
      if (isNoTime(userSpeech) || isCallbackRequest(userSpeech)) {
        session.outcomes.callbackRequested = true;
        session.outcomes.callbackTime = userSpeech;
        session.outcomes.finalOutcome = 'Callback Scheduled';
        return { type: 'end', say: script(session, 'callbackEnd'), outcome: 'Callback Scheduled' };
      }
      if (!isConfirmingIdentity(userSpeech, clientName) && !interruption) {
        const prefix = interruption ? `${interruption} ` : '';
        return {
          type: 'continue',
          say: `${prefix}${script(session, 'confirmIdentityRetry')}`,
          nextStep: 'intro_confirm',
        };
      }
      session.outcomes.correctPerson = true;
      const prefix = interruption ? `${interruption} ` : '';
      return {
        type: 'continue',
        say: `${prefix}${script(session, 'explainReason')}`,
        nextStep: 'ask_proceed',
      };
    }

    case 'explain_reason':
    case 'ask_proceed': {
      if (isNotInterested(userSpeech) || isNo(userSpeech)) {
        session.outcomes.interested = false;
        session.outcomes.finalOutcome = 'Not Interested';
        return { type: 'end', say: script(session, 'notInterestedEnd'), outcome: 'Not Interested' };
      }
      if (isNoTime(userSpeech) || isCallbackRequest(userSpeech)) {
        session.outcomes.callbackRequested = true;
        session.outcomes.finalOutcome = 'Callback Scheduled';
        return { type: 'end', say: script(session, 'callbackEnd'), outcome: 'Callback Scheduled' };
      }
      if (!isYes(userSpeech) && !interruption) {
        const prefix = interruption ? `${interruption} ` : '';
        return {
          type: 'continue',
          say: `${prefix}${script(session, 'askProceed')}`,
          nextStep: 'ask_proceed',
        };
      }
      session.outcomes.interested = true;
      const prefix = interruption ? `${interruption} ` : '';
      return {
        type: 'continue',
        say: `${prefix}${script(session, 'recordingNotice')}`,
        nextStep: 'collect_dob',
      };
    }

    case 'recording_notice':
    case 'collect_dob': {
      if (isRefusingVerification(userSpeech)) {
        session.outcomes.finalOutcome = 'Verification Refused';
        return { type: 'end', say: script(session, 'verificationRefusedEnd'), outcome: 'Verification Refused' };
      }

      if (isAcknowledgmentOnly(userSpeech) || (isYes(userSpeech) && !looksLikeDob(userSpeech))) {
        return {
          type: 'continue',
          say: 'Thank you. Please tell me your date of birth — for example, 15 August 1990.',
          nextStep: 'collect_dob',
        };
      }

      if (verifyDob(userSpeech, session.expectedDob)) {
        session.collectedDob = userSpeech;
        session.outcomes.dobVerified = true;
        session.dobRetries = 0;
        const prefix = interruption ? `${interruption} ` : '';
        return { type: 'continue', say: `${prefix}${script(session, 'askPostcode')}`, nextStep: 'collect_postcode' };
      }

      session.dobRetries += 1;
      if (session.dobRetries < MAX_VERIFY_RETRIES) {
        const prefix = interruption ? `${interruption} ` : '';
        return {
          type: 'continue',
          say: `${prefix}${script(session, 'dobRetry')}`,
          nextStep: 'collect_dob',
        };
      }

      session.outcomes.dobVerified = false;
      session.outcomes.finalOutcome = 'Verification Failed';
      return { type: 'end', say: script(session, 'verificationFailedEnd'), outcome: 'Verification Failed' };
    }

    case 'collect_postcode': {
      if (isRefusingVerification(userSpeech)) {
        session.outcomes.finalOutcome = 'Verification Refused';
        return { type: 'end', say: script(session, 'verificationRefusedEnd'), outcome: 'Verification Refused' };
      }

      if (verifyPostcode(userSpeech, session.expectedPostcode)) {
        session.collectedPostcode = userSpeech;
        session.outcomes.postcodeVerified = true;
        session.postcodeRetries = 0;
        const prefix = interruption ? `${interruption} ` : '';
        return {
          type: 'continue',
          say: `${prefix}${script(session, 'consent')}`,
          nextStep: 'consent_disclaimer',
        };
      }

      session.postcodeRetries += 1;
      if (session.postcodeRetries < MAX_VERIFY_RETRIES) {
        const prefix = interruption ? `${interruption} ` : '';
        return {
          type: 'continue',
          say: `${prefix}${script(session, 'postcodeRetry')}`,
          nextStep: 'collect_postcode',
        };
      }

      session.outcomes.postcodeVerified = false;
      session.outcomes.finalOutcome = 'Verification Failed';
      return { type: 'end', say: script(session, 'verificationFailedEnd'), outcome: 'Verification Failed' };
    }

    case 'consent_disclaimer': {
      if (isNotInterested(userSpeech) || isNo(userSpeech)) {
        const prefix = interruption ? `${interruption} ` : '';
        return {
          type: 'continue',
          say: `${prefix}${script(session, 'consentRetry')}`,
          nextStep: 'consent_retry',
        };
      }
      if (!isYes(userSpeech) && !interruption) {
        const prefix = interruption ? `${interruption} ` : '';
        return {
          type: 'continue',
          say: `${prefix}${script(session, 'consent')}`,
          nextStep: 'consent_disclaimer',
        };
      }
      session.outcomes.consentGiven = true;
      session.outcomes.finalOutcome = 'Consent Given';
      return { type: 'end', say: script(session, 'finalClose'), outcome: 'Consent Given' };
    }

    case 'consent_retry': {
      if (isNotInterested(userSpeech) || isNo(userSpeech)) {
        session.outcomes.finalOutcome = 'Not Interested';
        return { type: 'end', say: script(session, 'notInterestedEnd'), outcome: 'Not Interested' };
      }
      if (isYes(userSpeech)) {
        session.outcomes.consentGiven = true;
        session.outcomes.finalOutcome = 'Consent Given';
        return { type: 'end', say: script(session, 'finalClose'), outcome: 'Consent Given' };
      }
      return {
        type: 'continue',
        say: script(session, 'askProceed'),
        nextStep: 'consent_disclaimer',
      };
    }

    default:
      return { type: 'end', say: script(session, 'notInterestedEnd'), outcome: 'Call Ended' };
  }
}