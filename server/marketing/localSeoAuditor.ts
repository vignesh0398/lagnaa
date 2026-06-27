import { buildMarketingReport, checkItem, finalizeCategory } from '../seo/auditShared.js';
import { fetchPageContext } from '../seo/pageContext.js';
import type { MarketingToolResult } from './marketingTypes.js';

export async function runLocalSeoAudit(
  inputUrl: string,
  businessName?: string,
  city?: string
): Promise<MarketingToolResult> {
  const ctx = await fetchPageContext(inputUrl);
  const name = businessName?.trim() || ctx.brandNameGuess;
  const location = city?.trim() || '';
  const bodyLower = ctx.bodyText.toLowerCase();
  const hasPhone = /\+?\d[\d\s().-]{8,}\d/.test(ctx.bodyText) || ctx.html.includes('tel:');
  const hasAddress = /\d+\s+[\w\s]+(?:street|st|road|rd|avenue|ave|lane|ln|drive|dr|blvd|way)/i.test(ctx.bodyText);
  const hasMapsEmbed = ctx.html.includes('google.com/maps') || ctx.html.includes('maps.google');
  const cityInContent = location ? bodyLower.includes(location.toLowerCase()) : false;
  const cityInTitle = location ? ctx.title.toLowerCase().includes(location.toLowerCase()) : false;
  const nameInTitle = name ? ctx.title.toLowerCase().includes(name.toLowerCase().slice(0, 8)) : false;

  const entity = [
    checkItem({
      id: 'local-schema',
      label: 'LocalBusiness schema',
      status: ctx.hasLocalBusinessSchema ? 'pass' : ctx.hasOrganizationSchema ? 'warn' : 'fail',
      maxScore: 15,
      detail: ctx.hasLocalBusinessSchema
        ? 'LocalBusiness JSON-LD found'
        : ctx.hasOrganizationSchema
          ? 'Organization schema only — add LocalBusiness'
          : 'No local schema',
      explanation: 'LocalBusiness schema helps Google Maps and local pack rankings.',
      action: ctx.hasLocalBusinessSchema ? 'keep' : 'add',
      actionText: ctx.hasLocalBusinessSchema
        ? 'Local schema present — keep NAP data accurate.'
        : 'Add LocalBusiness JSON-LD with name, address, phone, openingHours, and geo.',
      priority: 'critical',
    }),
    checkItem({
      id: 'nap-phone',
      label: 'Phone number visible (NAP)',
      status: hasPhone ? 'pass' : 'fail',
      maxScore: 12,
      detail: hasPhone ? 'Phone number detected on page' : 'No phone number found',
      explanation: 'Name, Address, Phone consistency is the foundation of local SEO.',
      action: hasPhone ? 'keep' : 'add',
      actionText: hasPhone ? 'Phone visible.' : 'Add click-to-call phone in header, footer, and contact section.',
      priority: 'critical',
    }),
    checkItem({
      id: 'nap-address',
      label: 'Physical address signal',
      status: hasAddress ? 'pass' : 'warn',
      maxScore: 12,
      detail: hasAddress ? 'Street address pattern found' : 'No clear address on page',
      explanation: 'Google cross-checks your site address with Google Business Profile.',
      action: hasAddress ? 'keep' : 'add',
      actionText: hasAddress ? 'Address on page.' : 'Add full address in footer and contact page — match GBP exactly.',
      priority: 'high',
    }),
    checkItem({
      id: 'google-maps',
      label: 'Google Maps embed',
      status: hasMapsEmbed ? 'pass' : 'warn',
      maxScore: 8,
      detail: hasMapsEmbed ? 'Maps embed detected' : 'No map embed',
      explanation: 'Embedded maps reinforce location signals and help visitors find you.',
      action: hasMapsEmbed ? 'keep' : 'add',
      actionText: hasMapsEmbed ? 'Map embedded.' : 'Embed Google Maps on contact page with your verified location.',
      priority: 'medium',
    }),
  ];

  const localContent = [
    checkItem({
      id: 'city-targeting',
      label: 'City / area targeting',
      status: !location ? 'warn' : cityInTitle && cityInContent ? 'pass' : cityInTitle || cityInContent ? 'warn' : 'fail',
      maxScore: 12,
      detail: location
        ? cityInTitle
          ? `"${location}" in title`
          : cityInContent
            ? `"${location}" in body`
            : `"${location}" not found in page content`
        : 'No city provided — add city for deeper local analysis',
      explanation: 'Local rankings require city and service-area keywords in title and content.',
      action: cityInTitle ? 'keep' : 'improve',
      actionText: location
        ? `Include "${location}" in title, H1, and meta description.`
        : 'Re-run with your city name for localized recommendations.',
      priority: 'high',
    }),
    checkItem({
      id: 'business-name',
      label: 'Business name in title',
      status: nameInTitle ? 'pass' : 'warn',
      maxScore: 10,
      detail: nameInTitle ? `"${name}" reflected in title` : `Title: "${ctx.title.slice(0, 50)}"`,
      explanation: 'Brand + location in title helps local search matching.',
      action: nameInTitle ? 'keep' : 'improve',
      actionText: `Use format: "${name}${location ? ` in ${location}` : ''} | Service" in your title tag.`,
      priority: 'high',
    }),
    checkItem({
      id: 'contact-page',
      label: 'Contact page linked',
      status: ctx.hasContactLink ? 'pass' : 'fail',
      maxScore: 8,
      detail: ctx.hasContactLink ? 'Contact link in navigation' : 'No contact link found',
      explanation: 'Local visitors need a clear path to call, visit, or get directions.',
      action: ctx.hasContactLink ? 'keep' : 'add',
      actionText: 'Add Contact link with phone, address, hours, and map.',
      priority: 'high',
    }),
    checkItem({
      id: 'local-mobile',
      label: 'Mobile-friendly (local searches)',
      status: ctx.viewport ? 'pass' : 'fail',
      maxScore: 10,
      detail: ctx.viewport ? 'Viewport configured' : 'No mobile viewport',
      explanation: '76% of local searches happen on mobile.',
      action: ctx.viewport ? 'keep' : 'add',
      actionText: 'Add viewport meta — essential for local mobile traffic.',
      priority: 'critical',
    }),
  ];

  const categories = [
    finalizeCategory('local-entity', 'Local Entity Signals', entity),
    finalizeCategory('local-content', 'Local Content & UX', localContent),
  ];
  const report = buildMarketingReport('seo', 'Local SEO', categories);

  return {
    id: `mkt-local-${Date.now()}`,
    type: 'local',
    url: inputUrl,
    finalUrl: ctx.finalUrl,
    domain: ctx.domain,
    auditedAt: new Date().toISOString(),
    score: report.score,
    grade: report.grade,
    summary: `Local SEO score ${report.score}% for ${name}${location ? ` in ${location}` : ''}. ${report.counts.fail} critical local signal(s) to fix.`,
    categories: report.categories,
    actionPlan: report.actionPlan,
    counts: report.counts,
    recommendations: report.recommendations,
    meta: { businessName: name, city: location, hasMapsEmbed, hasPhone, hasAddress },
  };
}