import type { CallOutcomes, CallSession } from './conversation.js';

export type EndReason = 'Agent (Mia)' | 'Customer' | 'Not Connected' | 'Error' | 'Unknown';
export type SessionStatus = 'Ended' | 'Not Connected' | 'In Progress' | 'Error' | 'Queued';
export type UserSentiment = 'Positive' | 'Neutral' | 'Negative' | 'Voicemail' | 'Unknown';
export type SessionOutcome = 'Successful' | 'Unsuccessful';
export type VerificationOutcome = 'Verified' | 'Failed' | 'Refused' | 'Not Attempted';
export type InterestLevel = 'Interested' | 'Not Interested' | 'Unknown';
export type ConsentOutcome = 'Consent Given' | 'Consent Refused' | 'No Answer' | 'Other';

export interface EnrichedCallMeta {
  endReason: EndReason;
  sessionStatus: SessionStatus;
  userSentiment: UserSentiment;
  sessionOutcome: SessionOutcome;
  endToEndLatencyMs: number | null;
  summary: string;
  callOutcome: string;
  verificationOutcome: VerificationOutcome;
  interestLevel: InterestLevel;
  consentGiven: 'Yes' | 'No' | '—';
  consentOutcome: ConsentOutcome;
  clientNotes: string;
  dndRequested: 'Yes' | 'No';
  callbackRequested: 'Yes' | 'No';
  callbackTime: string;
}

function mapTwilioStatus(status: string): SessionStatus {
  switch (status) {
    case 'completed':
      return 'Ended';
    case 'busy':
    case 'no-answer':
    case 'canceled':
      return 'Not Connected';
    case 'failed':
      return 'Error';
    case 'ringing':
    case 'in-progress':
      return 'In Progress';
    case 'queued':
      return 'Queued';
    default:
      return 'Ended';
  }
}

function deriveConsentOutcome(outcome?: string): ConsentOutcome {
  if (!outcome) return 'No Answer';
  if (outcome === 'Consent Given') return 'Consent Given';
  if (outcome === 'Not Interested' || outcome === 'Verification Refused') return 'Consent Refused';
  if (outcome === 'No Response' || outcome === 'Wrong Person') return 'No Answer';
  return 'Other';
}

function deriveVerification(outcomes: CallOutcomes): VerificationOutcome {
  if (outcomes.dobVerified && outcomes.postcodeVerified) return 'Verified';
  if (outcomes.finalOutcome === 'Verification Failed') return 'Failed';
  if (outcomes.finalOutcome === 'Verification Refused') return 'Refused';
  return 'Not Attempted';
}

function deriveInterest(outcomes: CallOutcomes): InterestLevel {
  if (outcomes.interested === true) return 'Interested';
  if (outcomes.interested === false) return 'Not Interested';
  return 'Unknown';
}

function deriveSentiment(outcomes: CallOutcomes, twilioStatus: string): UserSentiment {
  if (outcomes.voicemail || outcomes.finalOutcome === 'Voicemail') return 'Voicemail';
  if (outcomes.consentGiven || outcomes.interested === true) return 'Positive';
  if (outcomes.dnd || outcomes.interested === false || outcomes.finalOutcome === 'Not Interested') {
    return 'Negative';
  }
  if (['no-answer', 'busy', 'failed', 'canceled'].includes(twilioStatus)) return 'Unknown';
  if (outcomes.finalOutcome) return 'Neutral';
  return 'Unknown';
}

function deriveEndReason(
  twilioStatus: string,
  session?: Pick<CallSession, 'endedBy' | 'outcomes'>
): EndReason {
  if (['no-answer', 'busy', 'canceled'].includes(twilioStatus)) return 'Not Connected';
  if (twilioStatus === 'failed') return 'Error';
  if (session?.endedBy === 'agent') return 'Agent (Mia)';
  if (session?.endedBy === 'customer') return 'Customer';
  if (session?.outcomes.finalOutcome) return 'Agent (Mia)';
  return 'Unknown';
}

function buildSummary(
  session: CallSession | undefined,
  durationSec: number,
  twilioStatus: string
): string {
  if (!session || session.messages.length === 0) {
    if (['no-answer', 'busy'].includes(twilioStatus)) return 'Call not answered.';
    if (twilioStatus === 'failed') return 'Call failed to connect.';
    return 'No AI session data for this call.';
  }
  if (session.outcomes.voicemail || session.outcomes.finalOutcome === 'Voicemail') {
    return `Voicemail detected — call ended without leaving a message (${durationSec}s).`;
  }
  const name = session.clientName;
  const outcome = session.outcomes.finalOutcome ?? 'In progress';
  const turns = session.turnCount;
  return `${session.agentName} spoke with ${name} for ${durationSec}s (${turns} customer turns). Outcome: ${outcome}.`;
}

function extractClientNotes(session?: CallSession): string {
  if (!session) return '—';
  const userLines = session.messages
    .filter((m) => m.role === 'user')
    .map((m) => m.content.trim())
    .filter(Boolean);
  if (userLines.length === 0) return '—';
  const combined = userLines.join(' | ');
  return combined.length > 280 ? `${combined.slice(0, 277)}...` : combined;
}

export function enrichCallMeta(
  twilioStatus: string,
  durationSec: number,
  session?: CallSession,
  startedAt?: Date,
  endedAt?: Date
): EnrichedCallMeta {
  const outcomes = session?.outcomes ?? {};
  const callOutcome = outcomes.finalOutcome ?? '—';
  const consentOutcome = deriveConsentOutcome(outcomes.finalOutcome);
  const successful =
    outcomes.consentGiven === true ||
    outcomes.finalOutcome === 'Consent Given' ||
    outcomes.finalOutcome === 'Callback Scheduled';

  let latency: number | null = null;
  if (startedAt && endedAt) {
    latency = Math.max(0, endedAt.getTime() - startedAt.getTime());
  } else if (session?.startedAt && session.endedAt) {
    latency = Math.max(0, session.endedAt.getTime() - session.startedAt.getTime());
  }

  return {
    endReason: deriveEndReason(twilioStatus, session),
    sessionStatus: mapTwilioStatus(twilioStatus),
    userSentiment: deriveSentiment(outcomes, twilioStatus),
    sessionOutcome: successful ? 'Successful' : 'Unsuccessful',
    endToEndLatencyMs: latency,
    summary: buildSummary(session, durationSec, twilioStatus),
    callOutcome,
    verificationOutcome: deriveVerification(outcomes),
    interestLevel: deriveInterest(outcomes),
    consentGiven: outcomes.consentGiven === true ? 'Yes' : outcomes.consentGiven === false ? 'No' : '—',
    consentOutcome,
    clientNotes: extractClientNotes(session),
    dndRequested: outcomes.dnd ? 'Yes' : 'No',
    callbackRequested: outcomes.callbackRequested ? 'Yes' : 'No',
    callbackTime: outcomes.callbackTime ?? '—',
  };
}