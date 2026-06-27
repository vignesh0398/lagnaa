import { buildMarketingReport, checkItem, finalizeCategory } from './auditShared.js';
import type { PageAuditContext } from './pageContext.js';

export function buildAeoReport(ctx: PageAuditContext) {
  const schema: ReturnType<typeof checkItem>[] = [
    checkItem({
      id: 'aeo-faq-schema',
      label: 'FAQ structured data',
      status: ctx.hasFaqSchema ? 'pass' : ctx.hasFaqSection ? 'warn' : 'fail',
      maxScore: 14,
      detail: ctx.hasFaqSchema
        ? 'FAQPage schema detected'
        : ctx.hasFaqSection
          ? 'FAQ content found but no FAQ schema'
          : 'No FAQ section or schema',
      explanation: 'FAQ schema powers rich results and helps answer engines (Google, Siri, Alexa) surface direct Q&A answers.',
      action: ctx.hasFaqSchema ? 'keep' : 'add',
      actionText: ctx.hasFaqSchema
        ? 'FAQ schema is valid — expand with more customer questions.'
        : 'Add FAQPage JSON-LD with Question/Answer pairs for your top 5–10 customer questions.',
      priority: 'critical',
    }),
    checkItem({
      id: 'aeo-howto-schema',
      label: 'HowTo structured data',
      status: ctx.hasHowToSchema ? 'pass' : 'warn',
      maxScore: 8,
      detail: ctx.hasHowToSchema ? 'HowTo schema found' : 'No HowTo schema',
      explanation: 'HowTo schema helps answer engines display step-by-step instructions in featured results.',
      action: ctx.hasHowToSchema ? 'keep' : 'add',
      actionText: ctx.hasHowToSchema
        ? 'HowTo schema present.'
        : 'If this page explains a process, add HowTo JSON-LD with numbered steps.',
      priority: 'medium',
    }),
    checkItem({
      id: 'aeo-speakable',
      label: 'Speakable schema (voice search)',
      status: ctx.hasSpeakableSchema ? 'pass' : 'warn',
      maxScore: 6,
      detail: ctx.hasSpeakableSchema ? 'Speakable specification found' : 'No speakable schema',
      explanation: 'Speakable markup tells voice assistants which passage to read aloud as the answer.',
      action: ctx.hasSpeakableSchema ? 'keep' : 'add',
      actionText: ctx.hasSpeakableSchema
        ? 'Voice-ready speakable content marked.'
        : 'Mark concise answer paragraphs with SpeakableSpecification schema for voice assistants.',
      priority: 'low',
    }),
  ];

  const content: ReturnType<typeof checkItem>[] = [
    checkItem({
      id: 'aeo-question-headings',
      label: 'Question-style headings',
      status: ctx.questionHeadings >= 2 ? 'pass' : ctx.questionHeadings >= 1 ? 'warn' : 'fail',
      maxScore: 12,
      detail: `${ctx.questionHeadings} H2 heading(s) phrased as questions`,
      explanation: 'Headings that match how people ask questions (What is…, How do I…) align with answer engine queries.',
      action: ctx.questionHeadings >= 2 ? 'keep' : 'add',
      actionText:
        ctx.questionHeadings >= 2
          ? 'Question headings help answer matching — keep this pattern.'
          : 'Rewrite section H2s as real customer questions, e.g. "How much does X cost?"',
      priority: 'high',
    }),
    checkItem({
      id: 'aeo-direct-answers',
      label: 'Concise direct-answer paragraphs',
      status: ctx.firstParagraphWords >= 40 && ctx.firstParagraphWords <= 80 ? 'pass' : ctx.firstParagraphWords >= 20 ? 'warn' : 'fail',
      maxScore: 10,
      detail: `Opening paragraph: ~${ctx.firstParagraphWords} words`,
      explanation: 'Answer engines extract 40–60 word definition-style openings for featured snippets and AI Overviews.',
      action: ctx.firstParagraphWords >= 40 && ctx.firstParagraphWords <= 80 ? 'keep' : 'improve',
      actionText:
        ctx.firstParagraphWords >= 40 && ctx.firstParagraphWords <= 80
          ? 'Opening paragraph length is snippet-friendly.'
          : 'Write a 40–60 word opening that directly answers "what is this page about?" in plain language.',
      priority: 'high',
    }),
    checkItem({
      id: 'aeo-lists-steps',
      label: 'Scannable lists and steps',
      status: ctx.listCount >= 3 ? 'pass' : ctx.listCount >= 1 ? 'warn' : 'fail',
      maxScore: 10,
      detail: `${ctx.listCount} list(s) on page`,
      explanation: 'Numbered and bulleted lists are frequently pulled into featured snippets and People Also Ask boxes.',
      action: ctx.listCount >= 3 ? 'keep' : 'add',
      actionText:
        ctx.listCount >= 3
          ? 'Good use of lists for scannable answers.'
          : 'Break key information into numbered steps or bullet lists under each question heading.',
      priority: 'high',
    }),
    checkItem({
      id: 'aeo-tables',
      label: 'Comparison / data tables',
      status: ctx.tableCount >= 1 ? 'pass' : 'warn',
      maxScore: 6,
      detail: ctx.tableCount >= 1 ? `${ctx.tableCount} table(s) found` : 'No tables — missed snippet opportunity',
      explanation: 'Tables often win featured snippets for pricing, specs, and comparison queries.',
      action: ctx.tableCount >= 1 ? 'keep' : 'add',
      actionText: ctx.tableCount >= 1
        ? 'Tables present — good for comparison queries.'
        : 'Add a simple HTML table for pricing, features, or specs if relevant to this page.',
      priority: 'medium',
    }),
    checkItem({
      id: 'aeo-content-depth',
      label: 'Answer depth (word count)',
      status: ctx.wordCount >= 400 ? 'pass' : ctx.wordCount >= 200 ? 'warn' : 'fail',
      maxScore: 8,
      detail: `${ctx.wordCount} words on page`,
      explanation: 'Thin pages rarely win answer boxes. Comprehensive answers to multiple related questions perform best.',
      action: ctx.wordCount >= 400 ? 'keep' : 'add',
      actionText:
        ctx.wordCount >= 400
          ? 'Content depth supports multiple answer targets.'
          : 'Expand content to cover 4–6 related questions your customers actually search.',
      priority: 'medium',
    }),
  ];

  const technical: ReturnType<typeof checkItem>[] = [
    checkItem({
      id: 'aeo-meta-desc',
      label: 'Snippet-ready meta description',
      status: !ctx.metaDesc ? 'fail' : ctx.metaDesc.length >= 120 && ctx.metaDesc.length <= 160 ? 'pass' : 'warn',
      maxScore: 8,
      detail: ctx.metaDesc ? `${ctx.metaDesc.length} chars` : 'Missing meta description',
      explanation: 'Meta descriptions often appear as the answer preview below the title in search results.',
      action: !ctx.metaDesc ? 'add' : 'improve',
      actionText: !ctx.metaDesc
        ? 'Add a 120–160 character meta description written as a direct answer to the page topic.'
        : 'Rewrite meta description as a complete, compelling answer in 120–160 characters.',
      priority: 'high',
    }),
    checkItem({
      id: 'aeo-h1-clarity',
      label: 'Clear H1 topic statement',
      status: ctx.h1s.length === 1 && ctx.h1s[0].length >= 10 ? 'pass' : ctx.h1s.length === 1 ? 'warn' : 'fail',
      maxScore: 8,
      detail: ctx.h1s.length === 1 ? `"${ctx.h1s[0].slice(0, 60)}"` : ctx.h1s.length === 0 ? 'No H1' : `${ctx.h1s.length} H1 tags`,
      explanation: 'A single, descriptive H1 tells answer engines the primary question this page answers.',
      action: ctx.h1s.length === 1 ? 'keep' : 'improve',
      actionText:
        ctx.h1s.length === 1
          ? 'H1 clearly states the page topic.'
          : 'Use exactly one H1 that states the main topic as a clear, searchable phrase.',
      priority: 'critical',
    }),
    checkItem({
      id: 'aeo-mobile',
      label: 'Mobile-friendly (voice search)',
      status: ctx.viewport ? 'pass' : 'fail',
      maxScore: 8,
      detail: ctx.viewport ? 'Viewport configured' : 'No viewport — mobile/voice users affected',
      explanation: 'Most voice and answer searches happen on mobile — viewport is essential for answer engine visibility.',
      action: ctx.viewport ? 'keep' : 'add',
      actionText: ctx.viewport
        ? 'Mobile viewport set.'
        : 'Add viewport meta tag — required for mobile answer engine rankings.',
      priority: 'critical',
    }),
  ];

  return buildMarketingReport('aeo', 'AEO (Answer Engine Optimization)', [
    finalizeCategory('aeo-schema', 'Answer Schema', schema),
    finalizeCategory('aeo-content', 'Answer Content', content),
    finalizeCategory('aeo-technical', 'Snippet Technical', technical),
  ]);
}