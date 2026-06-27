export interface WorkerBeeChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export const WORKERBEE_IDENTITY = `You are WorkerBee, the friendly in-app help assistant for Lagnaa One CRM by DataCrew.
You help users with setup, navigation, troubleshooting, and step-by-step guides across the entire CRM.
Be concise, practical, and encouraging. Use numbered steps for procedures.
If the user is on a specific page, tailor answers to that module first.
Never invent features that do not exist. If unsure, say so and suggest where to look in the app.`;

export const CRM_KNOWLEDGE = `
## App basics
- Live URL: https://lagnaa.onrender.com
- Login at / then land on /home (Home hub)
- Sidebar navigation for all modules
- Groq API key connects at /gateway (Connections) for AI features including WorkerBee

## Key routes
| Module | Path | Purpose |
|--------|------|---------|
| Home | /home | Quick links and overview |
| Dashboard | /dashboard | Stats and activity |
| Contacts CRM | /contacts | Local CRM — add/import contacts, single/bulk/tag AI calls |
| Conversations | /conversations | Voice, WhatsApp, email history per contact + GDPR panel |
| AI Agents | /agents | Publish voice agent, voice + LLM settings, test calls |
| Call scripts | /prompts | Mia 6-step call flow scripts |
| Call history | /calls | Past AI voice calls |
| Gateway | /gateway | Twilio + Groq connections |
| GoHighLevel | /ghl | GHL API, webhooks, field mapping, sync log |
| Knowledge base | /knowledge | RAG documents for AI calls |
| Team | /team | Admin only — sub-accounts and feature permissions |
| WhatsApp | /whatsapp | Campaigns |
| Email | /email | Email campaigns |
| Marketing | /marketing/* | SEO, Social Studio, competitors, etc. |
| GDPR | /settings/gdpr | Retention and compliance settings |
| Privacy | /settings/privacy | Privacy policy template |
| Appearance | /settings/appearance | Theme and UI preferences |

## Voice calls — Option 1: Contacts CRM
1. /gateway → connect Twilio (Account SID, Auth Token, phone number)
2. /prompts → review scripts → /agents → Publish one agent
3. /contacts → add or import contacts (Excel .xlsx/.csv)
4. Single call: phone icon on contact row → pick agent → Start AI call
5. Bulk call: checkbox contacts → pick agent → Call selected
6. Tag campaign: select tags → Run AI calls for selected tags
7. Auto-call: Tag → auto call panel — trigger tag default call-now, dedupe 10 min
8. DND blocks new calls/WhatsApp/email
9. Skips: DND, GDPR-erased, no phone, same contact within 10 min

## Voice calls — Option 2: GoHighLevel
1. Complete Gateway + Agents setup first
2. /ghl → Connect GHL (Private Integration Token + Location ID)
3. Create GHL custom fields: customer_name, customer_dob, customer_postcode (read)
4. Outcome fields: lagnaa_call_outcome, lagnaa_verification_outcome, lagnaa_call_summary, lagnaa_call_transcript, lagnaa_recording_url
5. GHL workflow: Contact Tag Added (lagnaa-call) → Webhook POST to /api/ghl/webhook/inbound
6. Enable Tag → Auto Call on /ghl
7. GHL calls always use the published agent; require phone, name, DOB, postcode

## AI agents & prompts
- Publish exactly one agent for default handling
- Prompts: greeting → reason → verification (DOB/postcode) → consent → close
- Template variable: {{clientName}}
- Test call available from Agents page without a CRM contact

## Twilio / Gateway
- ConversationRelay: Deepgram STT + ElevenLabs TTS + Groq LLM
- Render uses RENDER_EXTERNAL_URL automatically; local dev needs NGROK_AUTHTOKEN

## GDPR
- Conversations page → GDPR panel per contact: legal basis, SAR export, erase
- Erase blocks NEW calls only; in-progress calls unaffected
- Does not change AI call scripts

## Team & permissions
- /team is admin-only
- Sub-accounts can have per-member feature access toggles

## Environment variables
TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER, GROQ_API_KEY, MONGODB_URI (team persistence on Render), NGROK_AUTHTOKEN (local), PUBLIC_WEBHOOK_URL
`;

export function buildWorkerBeeSystemPrompt(context?: {
  pathname?: string;
  userName?: string;
  isAdmin?: boolean;
}): string {
  const parts = [WORKERBEE_IDENTITY, CRM_KNOWLEDGE];

  if (context?.userName) {
    parts.push(`Current user: ${context.userName}${context.isAdmin ? ' (admin)' : ''}.`);
  }
  if (context?.pathname) {
    parts.push(`User is currently viewing: ${context.pathname}. Prioritize help for this page.`);
  }

  return parts.join('\n\n');
}

export function fallbackWorkerBeeReply(
  message: string,
  context?: { pathname?: string }
): string {
  const lower = message.toLowerCase();
  const page = context?.pathname ?? '';

  if (lower.includes('groq') || lower.includes('ai key') || lower.includes('connect')) {
    return 'Go to Gateway (/gateway) → AI Voice Engine → paste your Groq API key and save. WorkerBee and voice AI both use this key. Get a free key at console.groq.com.';
  }
  if (lower.includes('twilio') || lower.includes('phone') || lower.includes('gateway')) {
    return 'Open Gateway (/gateway) → Twilio section. Enter Account SID, Auth Token, and your outbound phone number. Save, then verify the webhook URL shows as ready.';
  }
  if (lower.includes('import') || lower.includes('excel') || lower.includes('contact')) {
    return 'Contacts (/contacts) → Import Excel. Upload .xlsx or .csv, map columns (name + phone required), and import. Duplicates are skipped by phone number.';
  }
  if (lower.includes('ghl') || lower.includes('gohighlevel') || lower.includes('high level')) {
    return 'GoHighLevel setup: /ghl → connect API → map custom fields → build a GHL workflow with webhook POST to your Lagnaa inbound URL when tag lagnaa-call is added → enable Tag → Auto Call on /ghl.';
  }
  if (lower.includes('agent') || lower.includes('publish') || lower.includes('mia')) {
    return 'AI Agents (/agents): configure voice and LLM, then click Publish. One published agent handles calls by default. Review scripts first at /prompts.';
  }
  if (lower.includes('bulk') || lower.includes('campaign') || lower.includes('tag')) {
    return 'On /contacts: select contacts and use bulk Call selected, or use AI call campaign by tags. For auto-calls when a tag is added, enable Tag → auto call (default tag: call-now).';
  }
  if (lower.includes('gdpr') || lower.includes('erase') || lower.includes('privacy')) {
    return 'GDPR: open a contact in Conversations → GDPR panel. Set legal basis, export data (SAR), or erase personal data. Settings at /settings/gdpr and /settings/privacy.';
  }
  if (lower.includes('team') || lower.includes('sub-account') || lower.includes('permission')) {
    return 'Team management is at /team (admin only). Create sub-accounts and choose which Lagnaa modules each member can access.';
  }
  if (page.includes('/contacts')) {
    return 'You are on Contacts. Add leads manually, import Excel, run single/bulk/tag AI calls, toggle DND, or set up auto-call when tag call-now is added.';
  }
  if (page.includes('/gateway')) {
    return 'You are on Gateway. Connect Twilio for voice calls and Groq for AI. Both are required before running AI voice campaigns.';
  }
  if (page.includes('/home')) {
    return 'Welcome to Lagnaa! Start with Gateway (/gateway) for Twilio + Groq, then Agents (/agents) to publish, then Contacts (/contacts) to run calls. Ask me about any module.';
  }

  return 'I can help with setup, voice calls (Contacts or GoHighLevel), agents, Twilio, GDPR, team accounts, and any CRM module. Connect Groq at /gateway for full AI answers — or ask a specific question and I will guide you step by step.';
}