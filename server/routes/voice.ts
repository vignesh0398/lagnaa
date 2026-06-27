import { Router } from 'express';
import {
  addMessage,
  getSession,
  initSession,
  markEnded,
  setStep,
} from '../ai/conversation.js';
import { applyTemplate } from '../ai/promptStore.js';
import { getHelloScript, processFlowInput } from '../ai/justiziaFlow.js';
import { buildConversationRelayTwiml } from '../ai/conversationRelayTwiml.js';
import {
  buildContinueTwiml,
  buildGoodbyeTwiml,
  buildHangupTwiml,
  buildOpeningTwiml,
  buildRepromptTwiml,
} from '../ai/twiml.js';
import { isTwilioMachineAnswer, isVoicemailSpeech } from '../ai/voicemailDetect.js';
import { dispatchWebhook } from '../integrationsStore.js';
import { syncOutcomeToGhl } from '../ghlSync.js';
import type { CallSession } from '../ai/conversation.js';

const router = Router();
const MAX_NO_SPEECH_RETRIES = 3;

function finalizeVoicemail(callSid: string, session: CallSession, source: 'amd' | 'speech'): void {
  if (session.outcomes.voicemail) return;

  session.outcomes.voicemail = true;
  session.outcomes.finalOutcome = 'Voicemail';
  markEnded(callSid, 'agent');
  console.log(`[Voice] Voicemail detected (${source}) — hanging up ${callSid}`);

  const syncPayload = {
    channel: 'voice',
    customerName: session.clientName,
    phone: session.toNumber,
    outcome: 'Voicemail',
    callSid,
    ghlContactId: session.ghlContactId,
  };
  void dispatchWebhook('call_completed', syncPayload);
  if (!session.ghlContactId) {
    void syncOutcomeToGhl(syncPayload);
  }
}

router.post('/ai-start', (req, res) => {
  const callSid = req.body.CallSid as string;
  const toNumber = (req.body.To as string) || (req.query.to as string);
  const agentName = (req.query.agentName as string) || 'Mia';
  const clientName = (req.query.clientName as string) || 'the client';
  const clientDob = (req.query.clientDob as string) || undefined;
  const clientPostcode = (req.query.clientPostcode as string) || undefined;
  const ghlContactId = (req.query.ghlContactId as string) || undefined;
  const contactId = (req.query.contactId as string) || undefined;
  const answeredBy = req.body.AnsweredBy as string | undefined;

  console.log(
    `[Voice] ai-start ${callSid} → ${toNumber} client=${clientName}${ghlContactId ? ` ghl=${ghlContactId}` : ''}${contactId ? ` contact=${contactId}` : ''}${answeredBy ? ` answeredBy=${answeredBy}` : ''}`
  );
  const fromNumber = (req.body.From as string) || undefined;
  const session = initSession(callSid, agentName, clientName, clientDob, clientPostcode, toNumber, ghlContactId, contactId);
  session.fromNumber = fromNumber;

  if (isTwilioMachineAnswer(answeredBy)) {
    finalizeVoicemail(callSid, session, 'amd');
    res.type('text/xml');
    return res.send(buildHangupTwiml());
  }

  const hello = getHelloScript(session);
  const intro = applyTemplate(session.scripts.intro, { clientName: session.clientName });
  addMessage(callSid, 'assistant', hello);
  addMessage(callSid, 'assistant', intro);
  setStep(callSid, 'intro_confirm');

  res.type('text/xml');
  try {
    res.send(buildConversationRelayTwiml(hello, toNumber));
  } catch (relayError) {
    console.error('[Voice] ConversationRelay unavailable — hanging up (no Polly fallback):', relayError);
    res.send(buildHangupTwiml());
  }
});

router.post('/relay-end', (_req, res) => {
  res.type('text/xml');
  res.send(buildHangupTwiml());
});

router.post('/ai-no-speech', (req, res) => {
  const callSid = req.body.CallSid as string;
  const session = getSession(callSid);

  console.log(`[Voice] ai-no-speech ${callSid} retries=${session?.noSpeechRetries ?? 0}`);

  if (!session) {
    res.type('text/xml');
    return res.send(buildGoodbyeTwiml('Thank you for your time. Goodbye.'));
  }

  session.noSpeechRetries += 1;

  if (session.noSpeechRetries >= MAX_NO_SPEECH_RETRIES) {
    const msg = 'I am having trouble hearing you. Thank you for your time. Goodbye.';
    addMessage(callSid, 'assistant', msg);
    session.outcomes.finalOutcome = 'No Response';
    markEnded(callSid, 'agent');
    res.type('text/xml');
    return res.send(buildGoodbyeTwiml(msg));
  }

  const reprompt = session.scripts.noSpeechRetry;
  addMessage(callSid, 'assistant', reprompt);
  res.type('text/xml');
  res.send(buildRepromptTwiml(reprompt, session.toNumber));
});

router.post('/ai-respond', async (req, res) => {
  const callSid = req.body.CallSid as string;
  const speechResult = (req.body.SpeechResult as string)?.trim();
  const confidence = req.body.Confidence as string | undefined;
  const answeredBy = req.body.AnsweredBy as string | undefined;

  let session = getSession(callSid);
  if (!session) {
    session = initSession(callSid, 'Mia', 'the client', undefined, undefined, req.body.To as string);
  }

  res.type('text/xml');
  session.noSpeechRetries = 0;

  console.log(`[Voice] ai-respond ${callSid} step=${session.step} speech="${speechResult ?? ''}" conf=${confidence ?? 'n/a'}`);

  if (isTwilioMachineAnswer(answeredBy)) {
    finalizeVoicemail(callSid, session, 'amd');
    return res.send(buildHangupTwiml());
  }

  if (speechResult && isVoicemailSpeech(speechResult)) {
    addMessage(callSid, 'user', speechResult);
    finalizeVoicemail(callSid, session, 'speech');
    return res.send(buildHangupTwiml());
  }

  if (!speechResult) {
    session.noSpeechRetries += 1;
    if (session.noSpeechRetries < MAX_NO_SPEECH_RETRIES) {
      const reprompt = session.scripts.noSpeechRetry;
      addMessage(callSid, 'assistant', reprompt);
      return res.send(buildRepromptTwiml(reprompt, session.toNumber));
    }
    const msg = 'I did not catch that. Thank you for your time. Goodbye.';
    addMessage(callSid, 'assistant', msg);
    session.outcomes.finalOutcome = 'No Response';
    markEnded(callSid, 'agent');
    return res.send(buildGoodbyeTwiml(msg));
  }

  addMessage(callSid, 'user', speechResult);

  try {
    const action = await processFlowInput(session, speechResult);
    setStep(callSid, action.type === 'continue' ? action.nextStep : 'ended');

    if (action.type === 'end') {
      session.outcomes.finalOutcome = action.outcome;
      console.log(`[Voice] Call ${callSid} ended — ${action.outcome}`);
      if (action.outcome === 'Voicemail') {
        finalizeVoicemail(callSid, session, 'speech');
        return res.send(buildHangupTwiml());
      }
      if (action.say) addMessage(callSid, 'assistant', action.say);
      markEnded(callSid, 'agent');
      const event =
        action.outcome === 'Consent Given'
          ? 'consent_given'
          : action.outcome === 'DND Requested'
            ? 'dnd_requested'
            : 'call_completed';
      const syncPayload = {
        channel: 'voice',
        customerName: session.clientName,
        phone: session.toNumber,
        outcome: action.outcome,
        callSid,
        ghlContactId: session.ghlContactId,
      };
      void dispatchWebhook(event, syncPayload);
      if (!session.ghlContactId) {
        void syncOutcomeToGhl(syncPayload);
      }
      return res.send(buildGoodbyeTwiml(action.say));
    }

    addMessage(callSid, 'assistant', action.say);
    console.log(`[Voice] ${callSid} → step ${action.nextStep}`);
    const verificationStep = ['collect_dob', 'collect_postcode', 'recording_notice'].includes(action.nextStep);
    return res.send(buildContinueTwiml(action.say, session.toNumber, verificationStep ? 2 : 1));
  } catch (error) {
    console.error(`[Voice] Error processing ${callSid}:`, error);
    const fallback = "I'm sorry, could you please repeat that?";
    addMessage(callSid, 'assistant', fallback);
    return res.send(buildRepromptTwiml(fallback, session.toNumber));
  }
});

export default router;