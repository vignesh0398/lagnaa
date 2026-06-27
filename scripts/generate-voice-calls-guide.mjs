import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  AlignmentType,
  BorderStyle,
  Document,
  ExternalHyperlink,
  Footer,
  Header,
  HeadingLevel,
  HeightRule,
  ImageRun,
  LevelFormat,
  Packer,
  PageBreak,
  PageNumber,
  Paragraph,
  Table,
  TableCell,
  TableOfContents,
  TableRow,
  TextRun,
  WidthType,
  ShadingType,
} from 'docx';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const BRAND = {
  cyan: '0891B2',
  violet: '6D28D9',
  pink: 'BE185D',
  dark: '0F172A',
  text: '1E293B',
  textMuted: '475569',
  white: 'FFFFFF',
  pageBg: 'F1F5F9',
  cyanTint: 'E0F7FA',
  violetTint: 'EDE9FE',
  pinkTint: 'FCE7F3',
  border: 'CBD5E1',
  barCyan: '22D3EE',
  barViolet: '8B5CF6',
  barPink: 'EC4899',
};

const PAGE = {
  width: 12240,
  height: 15840,
  margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
};
const CONTENT_WIDTH = PAGE.width - PAGE.margin.left - PAGE.margin.right;

const borderThin = { style: BorderStyle.SINGLE, size: 1, color: BRAND.border };
const borders = { top: borderThin, bottom: borderThin, left: borderThin, right: borderThin };
const cellPad = { top: 80, bottom: 80, left: 120, right: 120 };

function gradientBar() {
  const w = Math.floor(CONTENT_WIDTH / 3);
  const colors = [BRAND.barCyan, BRAND.barViolet, BRAND.barPink];
  const widths = [w, w, CONTENT_WIDTH - w * 2];
  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: widths,
    rows: [
      new TableRow({
        cantSplit: true,
        height: { value: 280, rule: HeightRule.EXACT },
        children: colors.map(
          (fill, i) =>
            new TableCell({
              borders: { top: borderThin, bottom: borderThin, left: borderThin, right: borderThin },
              width: { size: widths[i], type: WidthType.DXA },
              shading: { fill, type: ShadingType.CLEAR },
              margins: { top: 40, bottom: 40, left: 0, right: 0 },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: ' ', size: 6 })],
                }),
              ],
            })
        ),
      }),
    ],
  });
}

function sectionRule(color = BRAND.violet) {
  return new Paragraph({
    spacing: { before: 60, after: 180 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 10, color, space: 4 } },
    children: [new TextRun({ text: '', size: 2 })],
  });
}

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    keepNext: true,
    spacing: { before: 320, after: 100 },
    children: [new TextRun({ text, bold: true, color: BRAND.violet, size: 34 })],
  });
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    keepNext: true,
    spacing: { before: 240, after: 80 },
    children: [new TextRun({ text, bold: true, color: BRAND.cyan, size: 28 })],
  });
}

function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    keepNext: true,
    spacing: { before: 200, after: 80 },
    children: [new TextRun({ text, bold: true, color: BRAND.pink, size: 24 })],
  });
}

function p(text, opts = {}) {
  return new Paragraph({
    spacing: { after: 140, line: 276 },
    children: [new TextRun({ text, size: 22, color: BRAND.text, ...opts })],
  });
}

function bullet(ref, text) {
  return new Paragraph({
    numbering: { reference: ref, level: 0 },
    spacing: { after: 100, line: 276 },
    children: [new TextRun({ text, size: 22, color: BRAND.text })],
  });
}

function code(text) {
  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: [CONTENT_WIDTH],
    rows: [
      new TableRow({
        cantSplit: true,
        children: [
          new TableCell({
            borders: {
              top: borderThin,
              bottom: borderThin,
              right: borderThin,
              left: { style: BorderStyle.SINGLE, size: 14, color: BRAND.cyan },
            },
            width: { size: CONTENT_WIDTH, type: WidthType.DXA },
            shading: { fill: BRAND.cyanTint, type: ShadingType.CLEAR },
            margins: { top: 60, bottom: 60, left: 160, right: 120 },
            children: [
              new Paragraph({
                children: [new TextRun({ text, font: 'Consolas', size: 20, color: BRAND.dark })],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

function callout(title, lines, variant = 'cyan') {
  const palette = {
    cyan: { fill: BRAND.cyanTint, accent: BRAND.cyan },
    violet: { fill: BRAND.violetTint, accent: BRAND.violet },
    pink: { fill: BRAND.pinkTint, accent: BRAND.pink },
  };
  const { fill, accent } = palette[variant] || palette.cyan;

  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: [CONTENT_WIDTH],
    rows: [
      new TableRow({
        cantSplit: true,
        children: [
          new TableCell({
            borders: {
              top: borderThin,
              bottom: borderThin,
              right: borderThin,
              left: { style: BorderStyle.SINGLE, size: 16, color: accent },
            },
            width: { size: CONTENT_WIDTH, type: WidthType.DXA },
            shading: { fill, type: ShadingType.CLEAR },
            margins: cellPad,
            children: [
              new Paragraph({
                spacing: { after: 100 },
                children: [new TextRun({ text: title, bold: true, size: 24, color: accent })],
              }),
              ...lines.map((line) =>
                new Paragraph({
                  spacing: { after: 80 },
                  children: [new TextRun({ text: line, size: 22, color: BRAND.text })],
                })
              ),
            ],
          }),
        ],
      }),
    ],
  });
}

function table(headers, rows, colWidths, headerColor = BRAND.violet) {
  const headerRow = new TableRow({
    cantSplit: true,
    children: headers.map(
      (h, i) =>
        new TableCell({
          borders,
          width: { size: colWidths[i], type: WidthType.DXA },
          shading: { fill: headerColor, type: ShadingType.CLEAR },
          margins: cellPad,
          children: [
            new Paragraph({
              children: [new TextRun({ text: h, bold: true, color: BRAND.white, size: 22 })],
            }),
          ],
        })
    ),
  });

  const dataRows = rows.map(
    (row, rowIndex) =>
      new TableRow({
        cantSplit: true,
        children: row.map(
          (cell, i) =>
            new TableCell({
              borders,
              width: { size: colWidths[i], type: WidthType.DXA },
              shading: {
                fill: rowIndex % 2 === 0 ? BRAND.white : BRAND.pageBg,
                type: ShadingType.CLEAR,
              },
              margins: cellPad,
              children: [
                new Paragraph({
                  children: [new TextRun({ text: String(cell), size: 21, color: BRAND.text })],
                }),
              ],
            })
        ),
      })
  );

  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: colWidths,
    rows: [headerRow, ...dataRows],
  });
}

function gap(after = 180) {
  return new Paragraph({ spacing: { after }, children: [new TextRun('')] });
}

function blockAfter(element, after = 200) {
  return [element, gap(after)];
}

function coverSection(logoPath) {
  const half = Math.floor(CONTENT_WIDTH / 2);
  const logoExists = fs.existsSync(logoPath);

  const optionCard = (title, subtitle, fill, accent) =>
    new TableCell({
      borders: {
        top: { style: BorderStyle.SINGLE, size: 10, color: accent },
        bottom: borderThin,
        left: borderThin,
        right: borderThin,
      },
      width: { size: half, type: WidthType.DXA },
      shading: { fill, type: ShadingType.CLEAR },
      margins: { top: 140, bottom: 140, left: 160, right: 160 },
      verticalAlign: 'center',
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: title, bold: true, size: 26, color: accent })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 80 },
          children: [new TextRun({ text: subtitle, size: 20, color: BRAND.text })],
        }),
      ],
    });

  return {
    properties: {
      page: {
        size: { width: PAGE.width, height: PAGE.height },
        margin: PAGE.margin,
      },
    },
    children: [
      gradientBar(),
      gap(320),
      ...(logoExists
        ? [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 240 },
              children: [
                new ImageRun({
                  type: 'png',
                  data: fs.readFileSync(logoPath),
                  transformation: { width: 130, height: 130 },
                  altText: {
                    title: 'Lagnaa Logo',
                    description: 'Lagnaa One L1 logo',
                    name: 'LagnaaLogo',
                  },
                }),
              ],
            }),
          ]
        : []),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
        children: [new TextRun({ text: 'Lagnaa One', bold: true, size: 52, color: BRAND.violet })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
        children: [
          new TextRun({ text: 'AI Voice Calls — Complete Setup Guide', bold: true, size: 30, color: BRAND.dark }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 280 },
        children: [
          new TextRun({
            text: 'Contacts CRM and GoHighLevel integration guide',
            size: 22,
            color: BRAND.textMuted,
          }),
        ],
      }),
      new Table({
        width: { size: CONTENT_WIDTH, type: WidthType.DXA },
        columnWidths: [half, CONTENT_WIDTH - half],
        rows: [
          new TableRow({
            cantSplit: true,
            children: [
              optionCard('Option 1', 'Contacts CRM (built-in)', BRAND.cyanTint, BRAND.cyan),
              optionCard('Option 2', 'GoHighLevel webhooks', BRAND.violetTint, BRAND.violet),
            ],
          }),
        ],
      }),
      gap(280),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: 'Live app: ', size: 22, color: BRAND.text }),
          new ExternalHyperlink({
            children: [
              new TextRun({
                text: 'https://lagnaa.onrender.com',
                style: 'Hyperlink',
                size: 22,
                color: BRAND.cyan,
              }),
            ],
            link: 'https://lagnaa.onrender.com',
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 120 },
        children: [
          new TextRun({
            text: 'Prepared for DataCrew  |  June 2026  |  Version 2.1',
            size: 20,
            color: BRAND.textMuted,
          }),
        ],
      }),
      gap(240),
      gradientBar(),
    ],
  };
}

const logoPath = path.join(rootDir, 'src', 'assets', 'lagnaa-logo.png');

const doc = new Document({
  styles: {
    default: {
      document: {
        run: { font: 'Arial', size: 22, color: BRAND.text },
      },
    },
    paragraphStyles: [
      {
        id: 'Heading1',
        name: 'Heading 1',
        basedOn: 'Normal',
        next: 'Normal',
        quickFormat: true,
        run: { size: 34, bold: true, font: 'Arial', color: BRAND.violet },
        paragraph: { spacing: { before: 320, after: 100 }, outlineLevel: 0 },
      },
      {
        id: 'Heading2',
        name: 'Heading 2',
        basedOn: 'Normal',
        next: 'Normal',
        quickFormat: true,
        run: { size: 28, bold: true, font: 'Arial', color: BRAND.cyan },
        paragraph: { spacing: { before: 240, after: 80 }, outlineLevel: 1 },
      },
      {
        id: 'Heading3',
        name: 'Heading 3',
        basedOn: 'Normal',
        next: 'Normal',
        quickFormat: true,
        run: { size: 24, bold: true, font: 'Arial', color: BRAND.pink },
        paragraph: { spacing: { before: 200, after: 80 }, outlineLevel: 2 },
      },
    ],
  },
  numbering: {
    config: [
      {
        reference: 'bullets',
        levels: [
          {
            level: 0,
            format: LevelFormat.BULLET,
            text: '\u2022',
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } },
          },
        ],
      },
      {
        reference: 'numbers',
        levels: [
          {
            level: 0,
            format: LevelFormat.DECIMAL,
            text: '%1.',
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } },
          },
        ],
      },
    ],
  },
  sections: [
    coverSection(logoPath),
    {
      properties: {
        page: {
          size: { width: PAGE.width, height: PAGE.height },
          margin: PAGE.margin,
        },
      },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 100 },
              border: {
                bottom: { style: BorderStyle.SINGLE, size: 8, color: BRAND.barCyan, space: 4 },
              },
              children: [
                new TextRun({ text: 'Lagnaa One', bold: true, size: 20, color: BRAND.violet }),
                new TextRun({ text: '   |   ', size: 20, color: BRAND.textMuted }),
                new TextRun({ text: 'AI Voice Calls Guide', size: 20, color: BRAND.text }),
              ],
            }),
          ],
        }),
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              border: {
                top: { style: BorderStyle.SINGLE, size: 6, color: BRAND.barViolet, space: 4 },
              },
              spacing: { before: 80 },
              children: [
                new TextRun({ text: 'Lagnaa One  |  DataCrew  |  Page ', size: 18, color: BRAND.textMuted }),
                new TextRun({ children: [PageNumber.CURRENT], size: 18, color: BRAND.dark, bold: true }),
              ],
            }),
          ],
        }),
      },
      children: [
        new TableOfContents('Table of Contents', { hyperlink: true, headingStyleRange: '1-3' }),
        gap(120),
        new Paragraph({ children: [new PageBreak()] }),

        h1('1. Overview'),
        sectionRule(BRAND.violet),
        p(
          'Lagnaa One supports two ways to run AI voice calls. Both use the same AI agent (Mia), the same call-flow scripts, and the same Twilio voice engine. The difference is where your contacts live and how calls are triggered.'
        ),
        ...blockAfter(
          callout('At a glance', [
            'Option 1 — store contacts in Lagnaa and trigger calls from the CRM UI.',
            'Option 2 — keep contacts in GoHighLevel and trigger calls via workflow webhooks.',
          ])
        ),
        ...blockAfter(
          table(
            ['Module', 'Path / URL'],
            [
              ['App URL', 'https://lagnaa.onrender.com'],
              ['Gateway / Twilio setup', '/gateway'],
              ['Contacts CRM (Option 1)', '/contacts'],
              ['GoHighLevel (Option 2)', '/ghl'],
              ['AI Agents', '/agents'],
              ['Call scripts', '/prompts'],
              ['Call history', '/calls'],
              ['Conversations', '/conversations'],
            ],
            [2600, CONTENT_WIDTH - 2600],
            BRAND.dark
          ),
          260
        ),

        h1('2. Prerequisites (Both Options)'),
        sectionRule(BRAND.violet),
        p('Complete these steps before running any AI voice campaign.'),
        bullet('numbers', 'Connect Twilio at /gateway (Account SID, Auth Token, phone number).'),
        bullet(
          'numbers',
          'Ensure a public webhook URL is ready (Render auto-sets this on lagnaa.onrender.com; use NGROK_AUTHTOKEN for localhost).'
        ),
        bullet('numbers', 'Optional: add GROQ_API_KEY for smarter AI replies.'),
        bullet('numbers', 'Review call scripts at /prompts.'),
        bullet('numbers', 'Publish one AI agent at /agents — required before any call will work.'),
        gap(120),
        h3('Environment variables'),
        ...blockAfter(code('TWILIO_ACCOUNT_SID=ACxxxxxxxx'), 60),
        ...blockAfter(code('TWILIO_AUTH_TOKEN=your_token'), 60),
        ...blockAfter(code('TWILIO_PHONE_NUMBER=+1234567890'), 60),
        ...blockAfter(code('GROQ_API_KEY=optional'), 60),
        ...blockAfter(code('NGROK_AUTHTOKEN=required for local dev'), 60),
        ...blockAfter(code('PUBLIC_WEBHOOK_URL=https://lagnaa.onrender.com'), 260),

        h1('3. Option 1 — Contacts as CRM'),
        sectionRule(BRAND.cyan),
        ...blockAfter(
          callout(
            'Option 1 — Contacts CRM',
            [
              'Use Lagnaa built-in Contacts module as your CRM.',
              'Import Excel lists, run single/bulk/tag campaigns, and manage GDPR from one place.',
            ],
            'cyan'
          )
        ),
        p(
          'Store leads locally, import from Excel, run single calls, bulk calls, or tag-based campaigns — all from /contacts.'
        ),

        h2('3.1 Add contacts'),
        bullet('bullets', 'Manual: /contacts → Add contact (name + phone required; DOB and postcode help AI verification).'),
        bullet('bullets', 'Import: /contacts → Import Excel (.xlsx, .csv). Map columns; duplicates skipped by phone.'),
        bullet('bullets', 'Tags: add tags like call-now, hot-lead, plevin for campaigns.'),

        h2('3.2 Run a single AI call'),
        bullet('numbers', 'Go to /contacts.'),
        bullet('numbers', 'Click the phone icon on a contact row (disabled if DND is on).'),
        bullet('numbers', 'Choose an AI agent from the dropdown (defaults to the published agent).'),
        bullet('numbers', 'Click Start AI call.'),
        bullet('numbers', 'Mia runs the consent workflow: greeting → identity → DOB → postcode → legal consent → close.'),

        h2('3.3 Bulk call (selected contacts)'),
        bullet('numbers', 'Checkbox-select contacts on the page.'),
        bullet('numbers', 'Pick an AI agent in the bulk action bar.'),
        bullet('numbers', 'Click Call selected and confirm.'),
        bullet('numbers', 'Skips: DND contacts, GDPR-erased contacts, no phone, or same contact called within 10 minutes.'),

        h2('3.4 Tag campaign (call by tags)'),
        bullet('numbers', 'On /contacts, find AI call campaign by tags.'),
        bullet('numbers', 'Select one or more tags (OR logic — contact needs any selected tag).'),
        bullet('numbers', 'Pick agent → Run AI calls for selected tags.'),

        h2('3.5 Auto-call when tag is added'),
        p('Contacts → Tag → auto call panel:'),
        ...blockAfter(
          table(
            ['Setting', 'Default', 'What it does'],
            [
              ['Enable', 'Off', 'Turns automation on'],
              ['Trigger tag', 'call-now', 'When this tag is newly added, a call is placed'],
              ['Dedupe', '10 minutes', 'Same contact not called twice within 10 min'],
            ],
            [2200, 1600, CONTENT_WIDTH - 3800],
            BRAND.cyan
          )
        ),
        p('Triggers when tag added via: edit contact, bulk tag add, or Excel import.'),

        h2('3.6 DND and conversations'),
        bullet('bullets', 'DND: toggle in Contacts table or Conversations page — blocks all new calls, WhatsApp, and email.'),
        bullet('bullets', 'Conversations: click a contact first name or go to /conversations/:contactId to see voice, WhatsApp, and email history.'),
        bullet('bullets', 'GDPR panel on Conversations: set legal basis, export data (SAR), or erase personal data. Does not stop in-progress calls.'),
        gap(260),

        h1('4. Option 2 — GoHighLevel (GHL)'),
        sectionRule(BRAND.violet),
        ...blockAfter(
          callout(
            'Option 2 — GoHighLevel',
            [
              'Keep contacts in GoHighLevel. Lagnaa listens for workflow webhooks and places AI calls automatically.',
              'Call outcomes sync back to GHL custom fields and tags.',
            ],
            'violet'
          )
        ),
        p(
          'Lagnaa listens for GHL workflow webhooks and places AI calls automatically. Outcomes sync back to GHL custom fields.'
        ),

        h2('4.1 Connect GHL'),
        bullet('numbers', 'Go to /ghl.'),
        bullet('numbers', 'In GHL: create a Private Integration with scopes contacts.readonly, contacts.write, locations.readonly.'),
        bullet('numbers', 'Copy Private Integration Token (pit-...) and Location ID into Lagnaa.'),
        bullet('numbers', 'Click Connect GoHighLevel.'),

        h2('4.2 GHL custom fields (required)'),
        p('Read before call (identity verification):'),
        ...blockAfter(
          table(
            ['Lagnaa field', 'Default GHL key', 'Purpose'],
            [
              ['Name', 'customer_name', 'May I speak with [name]?'],
              ['DOB', 'customer_dob', 'Date of birth verification'],
              ['Postcode', 'customer_postcode', 'Postcode verification'],
            ],
            [2400, 2600, CONTENT_WIDTH - 5000],
            BRAND.violet
          )
        ),
        p('Write after call (5 outcome fields):'),
        ...blockAfter(
          table(
            ['Field', 'Default GHL key'],
            [
              ['Call outcome', 'lagnaa_call_outcome'],
              ['Verification outcome', 'lagnaa_verification_outcome'],
              ['Call summary', 'lagnaa_call_summary'],
              ['Transcript', 'lagnaa_call_transcript'],
              ['Recording URL', 'lagnaa_recording_url'],
            ],
            [Math.floor(CONTENT_WIDTH / 2), CONTENT_WIDTH - Math.floor(CONTENT_WIDTH / 2)],
            BRAND.violet
          )
        ),
        ...blockAfter(
          callout(
            'Important',
            ['GHL auto-calls require phone, name, DOB, and postcode. Missing fields = call skipped.'],
            'pink'
          )
        ),

        h2('4.3 GHL workflow webhook setup'),
        bullet('numbers', 'Copy webhook URL from /ghl (shown as inbound webhook URL).'),
        bullet('numbers', 'Format: POST https://lagnaa.onrender.com/api/ghl/webhook/inbound'),
        bullet('numbers', 'In GHL: Workflow → Trigger: Contact Tag Added → filter tag lagnaa-call (or your trigger tag).'),
        bullet('numbers', 'Action: Webhook POST with body: {"contact_id": "{{contact.id}}", "tags": ["lagnaa-call"]}'),
        bullet('numbers', 'On /ghl: enable Tag → Auto Call, set trigger tag (default: lagnaa-call), Save automation.'),

        h2('4.4 Test and monitor'),
        bullet('bullets', 'Manual test: enter GHL contact ID on /ghl → Test call.'),
        bullet('bullets', 'Import from GHL: pull contacts for reference/export (does not replace /contacts local CRM).'),
        bullet('bullets', 'Sync log on /ghl shows call outcomes written back to GHL.'),
        bullet('bullets', 'Call queue: default 5 concurrent calls; extra calls wait in queue.'),
        gap(260),

        h1('5. Option 1 vs Option 2 — Comparison'),
        sectionRule(BRAND.pink),
        ...blockAfter(
          table(
            ['Aspect', 'Option 1: Contacts CRM', 'Option 2: GoHighLevel'],
            [
              ['Contact storage', 'Local Lagnaa CRM (/contacts)', 'Lives in GHL'],
              ['How calls start', 'UI buttons, bulk, tag campaign', 'GHL workflow webhook'],
              ['Agent selection', 'Pick agent per campaign', 'Always uses published agent'],
              ['Verification data', 'From local contact record', 'From GHL custom fields'],
              ['Auto-call tag', 'call-now (in Lagnaa)', 'lagnaa-call (in GHL workflow)'],
              ['Outcome sync', 'Stored in Lagnaa + /calls', 'Auto-push to GHL fields + tags'],
              ['Best for', 'Excel lists, standalone CRM', 'GHL agencies, workflow automation'],
            ],
            [2100, 3630, CONTENT_WIDTH - 5730],
            BRAND.dark
          ),
          260
        ),

        h1('6. AI Agents and Call Scripts'),
        sectionRule(BRAND.violet),
        h2('6.1 Prompts (/prompts)'),
        p(
          'Edit Mia 6-step call flow: greeting, reason, verification (DOB/postcode), consent disclaimer, close. Template variable: {{clientName}}. AI will not skip verification or consent steps.'
        ),
        h2('6.2 Agents (/agents)'),
        bullet('bullets', 'Publish one agent — this handles all calls unless you pick another in Contacts.'),
        bullet('bullets', 'Configure voice (ElevenLabs) and LLM model per agent.'),
        bullet('bullets', 'Test call: direct test from Agents page without a CRM contact.'),
        p('GHL-triggered calls always use the published agent (no agent picker in GHL flow).'),
        gap(260),

        h1('7. Twilio and Gateway Details'),
        sectionRule(BRAND.cyan),
        p('Page: /gateway (Connections)'),
        bullet('bullets', 'Twilio: connect Account SID, Auth Token, outbound phone number.'),
        bullet('bullets', 'AI Voice Engine: uses ConversationRelay (Deepgram STT + ElevenLabs TTS + Groq LLM).'),
        bullet('bullets', 'Webhooks auto-set per call: ai-start TwiML, status callback, recording enabled.'),
        bullet('bullets', 'On Render: RENDER_EXTERNAL_URL is used automatically — no ngrok needed.'),
        gap(260),

        h1('8. GDPR and Consent (Calls)'),
        sectionRule(BRAND.pink),
        ...blockAfter(
          callout(
            'GDPR tools',
            [
              'GDPR features do not change AI call scripts or in-progress call behaviour.',
              'They add legal basis tracking, SAR export, and data erasure for CRM compliance.',
            ],
            'pink'
          )
        ),
        bullet('bullets', 'In-call: Mia records consent outcome (Consent Given / Refused / DND).'),
        bullet('bullets', 'CRM: set legal basis and consent date per contact in Conversations → GDPR panel.'),
        bullet('bullets', 'Export: download all contact data (Subject Access Request).'),
        bullet('bullets', 'Erase: remove personal data; blocks new calls but does not interrupt active calls.'),
        bullet('bullets', 'Privacy policy: /settings/privacy  |  GDPR settings: /settings/gdpr'),
        gap(260),

        h1('9. Quick Start Checklists'),
        sectionRule(BRAND.violet),
        h2('Option 1 — Contacts CRM'),
        ...blockAfter(
          table(
            ['Step', 'Action'],
            [
              ['1', '/gateway → connect Twilio, verify webhook ready'],
              ['2', '/prompts → review scripts → /agents → Publish'],
              ['3', '/contacts → import or add contacts'],
              ['4', 'Optional: enable Tag → auto call'],
              ['5', 'Run single, bulk, or tag campaign'],
              ['6', 'Review results in /calls and /conversations'],
            ],
            [1100, CONTENT_WIDTH - 1100],
            BRAND.cyan
          ),
          200
        ),
        h2('Option 2 — GoHighLevel'),
        ...blockAfter(
          table(
            ['Step', 'Action'],
            [
              ['1', 'Complete Gateway + Agents setup (above)'],
              ['2', '/ghl → Connect GHL API'],
              ['3', 'Create 3 inbound + 5 outbound custom fields in GHL'],
              ['4', 'Map fields on /ghl → Save'],
              ['5', 'Build GHL workflow: Tag Added → Webhook POST to Lagnaa URL'],
              ['6', 'Enable Tag → Auto Call on /ghl'],
              ['7', 'Test with GHL contact ID → check Sync Log'],
            ],
            [1100, CONTENT_WIDTH - 1100],
            BRAND.violet
          ),
          260
        ),

        h1('10. Support and URLs'),
        sectionRule(BRAND.cyan),
        ...blockAfter(
          table(
            ['Resource', 'URL / Path'],
            [
              ['Live app', 'https://lagnaa.onrender.com'],
              ['GitHub repo', 'https://github.com/vignesh0398/lagnaa'],
              ['Gateway', '/gateway'],
              ['Contacts CRM', '/contacts'],
              ['GoHighLevel', '/ghl'],
              ['Team / sub-accounts', '/team (admin only)'],
              ['API health check', '/api/health'],
            ],
            [3000, CONTENT_WIDTH - 3000],
            BRAND.dark
          ),
          200
        ),
        gradientBar(),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 200, after: 100 },
          children: [
            new TextRun({
              text: 'Document version 2.1 — Lagnaa One by DataCrew',
              size: 20,
              color: BRAND.textMuted,
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({
              text: 'For production GDPR compliance, replace the privacy policy template with lawyer-approved text.',
              size: 18,
              color: BRAND.textMuted,
            }),
          ],
        }),
      ],
    },
  ],
});

const outPath = path.join(rootDir, 'docs', 'Lagnaa-Voice-Calls-Guide.docx');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
const buffer = await Packer.toBuffer(doc);
fs.writeFileSync(outPath, buffer);
console.log('Created:', outPath);
console.log('Logo:', logoPath, fs.existsSync(logoPath) ? '(found)' : '(missing)');