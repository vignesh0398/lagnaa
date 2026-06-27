import { getWhiteLabelConfig } from './whiteLabelStore.js';
import type { CompetitorCompareResult, MarketingToolResult, RoadmapResult, SocialPreviewResult } from './marketingTypes.js';
import type { SeoActionPlan } from '../seo/seoActionPlan.js';

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function statusLabel(status: string): string {
  if (status === 'pass') return 'Pass';
  if (status === 'warn') return 'Warning';
  return 'Fail';
}

function scoreAccent(score: number): string {
  if (score >= 85) return '#059669';
  if (score >= 70) return '#0891b2';
  if (score >= 50) return '#d97706';
  return '#dc2626';
}

function actionSections(plan: SeoActionPlan): string {
  const section = (title: string, items: typeof plan.criticalFailures, color: string) => {
    if (!items.length) return '';
    return `<div class="section"><h3 style="color:${color}">${esc(title)} (${items.length})</h3>${items
      .map(
        (i) => `<div class="item"><strong>${esc(i.label)}</strong><p>${esc(i.actionText)}</p></div>`
      )
      .join('')}</div>`;
  };
  return [
    section('Critical', plan.criticalFailures, '#dc2626'),
    section('Add', plan.shouldAdd.filter((i) => i.status !== 'pass'), '#0284c7'),
    section('Remove', plan.shouldRemove, '#7c3aed'),
    section('Improve', plan.needsImprovement, '#d97706'),
  ].join('');
}

function baseStyles(primary: string): string {
  return `
    body { font-family: 'Segoe UI', system-ui, sans-serif; color: #0f172a; line-height: 1.55; margin: 0; background: #f1f5f9; }
    .page { max-width: 900px; margin: 0 auto; background: #fff; }
    .cover { background: linear-gradient(135deg, #0a0f1c, #1a2236); color: #fff; padding: 48px; }
    .brand { color: ${primary}; font-weight: 700; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.1em; }
    h1 { font-size: 1.75rem; margin: 12px 0 8px; }
    .body { padding: 40px 48px; }
    .score { font-size: 2.5rem; font-weight: 800; color: ${primary}; }
    .section { margin: 24px 0; }
    .item { border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin: 8px 0; }
    table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
    th, td { border: 1px solid #e2e8f0; padding: 8px; text-align: left; vertical-align: top; }
    th { background: #f8fafc; }
    .preview { border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; margin: 12px 0; max-width: 480px; }
    .preview-img { height: 200px; background: #e2e8f0 center/cover no-repeat; }
    .preview-body { padding: 12px; }
    .footer { padding: 24px 48px; background: #0a0f1c; color: #94a3b8; font-size: 0.8rem; }
    @media print { .page { box-shadow: none; } }
  `;
}

function wrapReport(title: string, subtitle: string, body: string): string {
  const wl = getWhiteLabelConfig();
  const brandName = wl.agencyName || 'Lagnaa';
  const tagline = wl.agencyTagline || 'Your brand connects';
  const powered = wl.showPoweredBy ? ' · Powered by DataCrew' : '';

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><title>${esc(title)}</title>
  <style>${baseStyles(wl.primaryColor || '#22d3ee')}</style></head><body><div class="page">
  <div class="cover"><div class="brand">${esc(brandName)}</div><p style="opacity:0.7;font-size:0.9rem">${esc(tagline)}</p>
  <h1>${esc(title)}</h1><p style="opacity:0.8">${esc(subtitle)}</p></div>
  <div class="body">${body}</div>
  <div class="footer">${esc(brandName)}${powered}${wl.contactEmail ? ` · ${esc(wl.contactEmail)}` : ''}</div>
  </div></body></html>`;
}

export function exportMarketingHtml(result: MarketingToolResult): string {
  const accent = scoreAccent(result.score);
  const checkRows = result.categories
    .flatMap((cat) =>
      cat.checks.map(
        (c) =>
          `<tr><td>${esc(cat.name)}</td><td>${esc(c.label)}</td><td>${statusLabel(c.status)}</td><td>${esc(c.detail)}</td><td>${esc(c.actionText)}</td></tr>`
      )
    )
    .join('');

  let extra = '';

  if (result.type === 'competitor') {
    const m = (result as CompetitorCompareResult).meta;
    extra = `<h2>Score comparison</h2><table><tr><th>Site</th><th>Score</th><th>Words</th><th>Schema</th></tr>
      <tr><td><strong>Yours</strong> ${esc(m.yourSite.domain)}</td><td>${m.yourSite.score}%</td><td>${m.yourSite.wordCount}</td><td>${m.yourSite.schemaCount}</td></tr>
      ${m.competitors.map((c) => `<tr><td>${esc(c.domain)}</td><td>${c.score}%</td><td>${c.wordCount}</td><td>${c.schemaCount}</td></tr>`).join('')}
      </table><p><strong>Leader:</strong> ${esc(m.winner)}</p>`;
  }

  if (result.type === 'social') {
    const m = (result as SocialPreviewResult).meta;
    extra = m.previews
      .map(
        (p) =>
          `<div class="preview"><div class="preview-img" style="background-image:url('${esc(p.imageUrl)}')"></div>
          <div class="preview-body"><strong>${esc(p.platform)}</strong> — ${statusLabel(p.status)}
          <p style="font-weight:600;margin:6px 0">${esc(p.title)}</p><p style="color:#64748b;font-size:0.9rem">${esc(p.description)}</p></div></div>`
      )
      .join('');
  }

  if (result.type === 'roadmap') {
    const m = (result as RoadmapResult).meta;
    extra = m.phases
      .map(
        (p) =>
          `<div class="section"><h3>${esc(p.phase)} <span style="font-weight:500;color:#64748b">(${esc(p.timeframe)})</span></h3>
          <ol>${p.items.map((i) => `<li><strong>${esc(i.label)}</strong> — ${esc(i.actionText)}</li>`).join('')}</ol></div>`
      )
      .join('');
  }

  const body = `
    <p class="score" style="color:${accent}">${result.score}% · Grade ${esc(result.grade)}</p>
    <p>${esc(result.summary)}</p>
    ${extra}
    ${actionSections(result.actionPlan)}
    <h2>Checklist</h2>
    <table><thead><tr><th>Category</th><th>Check</th><th>Status</th><th>Finding</th><th>Action</th></tr></thead>
    <tbody>${checkRows}</tbody></table>`;

  const titles: Record<string, string> = {
    competitor: 'Competitor Compare Report',
    social: 'Social Preview Audit',
    local: 'Local SEO Report',
    roadmap: '90-Day Marketing Roadmap',
  };

  return wrapReport(titles[result.type] ?? 'Marketing Report', result.finalUrl, body);
}

export function exportMarketingCsv(result: MarketingToolResult): string {
  const header = 'Report,Category,Check,Status,Detail,Action';
  const rows = result.categories.flatMap((cat) =>
    cat.checks.map((c) =>
      [result.type, cat.name, c.label, c.status, c.detail, c.actionText]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(',')
    )
  );
  return [header, ...rows].join('\n');
}