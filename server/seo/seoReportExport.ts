import { getWhiteLabelConfig } from '../marketing/whiteLabelStore.js';
import { audienceLabel, type MarketingReport } from './auditShared.js';
import { buildActionPlan, countChecks } from './seoActionPlan.js';
import type { SeoAuditResult } from './seoAuditor.js';

function getReports(audit: SeoAuditResult): MarketingReport[] {
  if (audit.reports?.length) return audit.reports;
  const categories = audit.categories ?? [];
  return [
    {
      kind: 'seo',
      label: 'SEO',
      score: audit.score,
      grade: audit.grade,
      summary: audit.summary,
      categories,
      recommendations: audit.recommendations ?? [],
      actionPlan: audit.actionPlan ?? buildActionPlan(categories),
      counts: audit.counts ?? countChecks(categories),
    },
  ];
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function statusLabel(status: string): string {
  if (status === 'pass') return 'Pass';
  if (status === 'warn') return 'Warning';
  return 'Fail';
}

function scoreAccent(score: number): { main: string; light: string; ring: string } {
  if (score >= 85) return { main: '#059669', light: '#ecfdf5', ring: '#34d399' };
  if (score >= 70) return { main: '#0891b2', light: '#ecfeff', ring: '#22d3ee' };
  if (score >= 50) return { main: '#d97706', light: '#fffbeb', ring: '#fbbf24' };
  return { main: '#dc2626', light: '#fef2f2', ring: '#f87171' };
}

function priorityLabel(priority: string): string {
  return priority.charAt(0).toUpperCase() + priority.slice(1);
}

const LAGNAA_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="48" height="48" fill="none" aria-hidden="true">
  <defs>
    <linearGradient id="lagnaa-arc" x1="8" y1="32" x2="56" y2="32" gradientUnits="userSpaceOnUse">
      <stop stop-color="#22d3ee"/><stop offset="0.5" stop-color="#8b5cf6"/><stop offset="1" stop-color="#ec4899"/>
    </linearGradient>
    <linearGradient id="lagnaa-left" x1="10" y1="18" x2="26" y2="46" gradientUnits="userSpaceOnUse">
      <stop stop-color="#22d3ee"/><stop offset="1" stop-color="#6366f1"/>
    </linearGradient>
    <linearGradient id="lagnaa-right" x1="38" y1="18" x2="54" y2="46" gradientUnits="userSpaceOnUse">
      <stop stop-color="#a855f7"/><stop offset="1" stop-color="#ec4899"/>
    </linearGradient>
  </defs>
  <path d="M18 40C18 40 20 18 32 16C44 14 46 36 46 36C46 36 40 48 32 48C24 48 18 40 18 40Z" stroke="url(#lagnaa-arc)" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <path d="M14 28L18 22L24 24L26 34L22 42L16 40L14 28Z" fill="url(#lagnaa-left)"/>
  <circle cx="20" cy="30" r="2.5" fill="#0f1117"/>
  <path d="M50 28L46 22L40 24L38 34L42 42L48 40L50 28Z" fill="url(#lagnaa-right)"/>
  <circle cx="44" cy="30" r="2.5" fill="#0f1117"/>
</svg>`;

export function exportAuditJson(audit: SeoAuditResult): string {
  return JSON.stringify(audit, null, 2);
}

export function exportAuditCsv(audit: SeoAuditResult): string {
  const header = [
    'Report',
    'Category',
    'Check',
    'Status',
    'Priority',
    'Action',
    'Score',
    'Max Score',
    'Detail',
    'Explanation',
    'What To Do',
  ].join(',');

  const rows = getReports(audit).flatMap((report) =>
    report.categories.flatMap((cat) =>
      cat.checks.map((c) =>
        [
          report.label,
          cat.name,
          c.label,
          c.status,
          c.priority,
          c.action,
          c.score,
          c.maxScore,
          c.detail,
          c.explanation,
          c.actionText,
        ]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(',')
      )
    )
  );

  return [header, ...rows].join('\n');
}

export function exportAuditHtml(audit: SeoAuditResult): string {
  const date = new Date(audit.auditedAt).toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
  const reportId = audit.id.slice(0, 8).toUpperCase();
  const reports = getReports(audit);
  const audience = audit.audienceType ?? 'b2c';
  const wl = getWhiteLabelConfig();
  const brandName = wl.agencyName || 'Lagnaa';
  const brandTagline = wl.agencyTagline || 'Your brand connects';
  const showPoweredBy = wl.showPoweredBy;
  const wlContact = wl.contactEmail ? ` · ${wl.contactEmail}` : '';
  const counts = audit.counts ?? { pass: 0, warn: 0, fail: 0, total: 0 };
  const accent = scoreAccent(audit.score);
  const ringRadius = 72;
  const ringCirc = 2 * Math.PI * ringRadius;
  const ringOffset = ringCirc - (audit.score / 100) * ringCirc;

  const reportScoreCards = reports
    .map((r) => {
      const c = scoreAccent(r.score);
      return `<div class="report-score-card" style="border-color:${c.main}20">
        <span class="report-score-label">${esc(r.label)}</span>
        <span class="report-score-val" style="color:${c.main}">${r.score}%</span>
        <span class="report-score-grade">Grade ${esc(r.grade)}</span>
      </div>`;
    })
    .join('');

  const actionSection = (
    title: string,
    subtitle: string,
    icon: string,
    theme: { border: string; bg: string; accent: string },
    items: typeof plan.criticalFailures
  ) => {
    if (!items.length) return '';
    const cards = items
      .map((item) => {
        const priClass =
          item.priority === 'critical'
            ? 'pri-critical'
            : item.priority === 'high'
              ? 'pri-high'
              : item.priority === 'medium'
                ? 'pri-medium'
                : 'pri-low';
        return `
        <article class="action-card">
          <div class="action-card-top">
            <span class="status-pill status-${item.status}">${statusLabel(item.status)}</span>
            <span class="pri-pill ${priClass}">${priorityLabel(item.priority)}</span>
            <span class="cat-pill">${esc(item.category)}</span>
          </div>
          <h4 class="action-title">${esc(item.label)}</h4>
          <div class="action-block">
            <p class="action-label">What we found</p>
            <p class="action-text">${esc(item.detail)}</p>
          </div>
          <div class="action-block">
            <p class="action-label">Why it matters</p>
            <p class="action-text">${esc(item.explanation)}</p>
          </div>
          <div class="action-block action-do">
            <p class="action-label">What to do</p>
            <p class="action-text">${esc(item.actionText)}</p>
          </div>
        </article>`;
      })
      .join('');

    return `
    <section class="plan-section" style="--section-accent:${theme.accent};--section-bg:${theme.bg};--section-border:${theme.border}">
      <div class="plan-header">
        <div class="plan-icon">${icon}</div>
        <div>
          <h3 class="plan-title">${esc(title)} <span class="plan-count">${items.length}</span></h3>
          <p class="plan-sub">${esc(subtitle)}</p>
        </div>
      </div>
      <div class="action-grid">${cards}</div>
    </section>`;
  };

  const reportSections = reports
    .map((report) => {
      const plan = report.actionPlan;
      const addItems = plan.shouldAdd.filter((i) => i.status !== 'pass');
      const categoryBars = report.categories
        .map((cat) => {
          const pct = cat.maxScore > 0 ? Math.round((cat.score / cat.maxScore) * 100) : 0;
          const barColor = scoreAccent(pct).main;
          return `
          <div class="cat-row">
            <div class="cat-meta">
              <span class="cat-name">${esc(cat.name)}</span>
              <span class="cat-score" style="color:${barColor}">${pct}%</span>
            </div>
            <div class="cat-track"><div class="cat-fill" style="width:${pct}%;background:${barColor}"></div></div>
            <span class="cat-pts">${cat.score} / ${cat.maxScore} pts</span>
          </div>`;
        })
        .join('');

      const checkRows = report.categories
        .flatMap((cat) =>
          cat.checks.map(
            (c) => `<tr>
            <td><span class="cat-tag">${esc(cat.name)}</span></td>
            <td class="check-name">${esc(c.label)}</td>
            <td><span class="status-pill status-${c.status}">${statusLabel(c.status)}</span></td>
            <td class="num">${c.score}<span class="dim">/${c.maxScore}</span></td>
            <td class="detail-cell">${esc(c.detail)}</td>
            <td class="action-cell">${esc(c.actionText)}</td>
          </tr>`
          )
        )
        .join('');

      const recs =
        report.recommendations.length > 0
          ? `<ul class="rec-list">${report.recommendations.map((r) => `<li>${esc(r)}</li>`).join('')}</ul>`
          : '';

      return `
      <section class="report-block content-section">
        <div class="report-block-head">
          <h2 class="section-title">${esc(report.label)}</h2>
          <div class="report-block-score" style="color:${scoreAccent(report.score).main}">${report.score}% · Grade ${esc(report.grade)}</div>
        </div>
        <p class="section-desc">${esc(report.summary)}</p>
        <div class="result-pills" style="margin-bottom:20px">
          <div class="result-pill"><span class="dot dot-pass"></span>${report.counts.pass} Passed</div>
          <div class="result-pill"><span class="dot dot-warn"></span>${report.counts.warn} Warnings</div>
          <div class="result-pill"><span class="dot dot-fail"></span>${report.counts.fail} Failed</div>
        </div>
        <h3 class="subsection-title">Score by category</h3>
        ${categoryBars}
        ${recs ? `<h3 class="subsection-title">Key recommendations</h3>${recs}` : ''}
        <h3 class="subsection-title">Action plan</h3>
        ${actionSection('Critical failures', 'Fix these immediately.', '🔴', { border: '#fecaca', bg: '#fef2f2', accent: '#dc2626' }, plan.criticalFailures)}
        ${actionSection('Should add', 'Missing elements to add.', '➕', { border: '#bae6fd', bg: '#f0f9ff', accent: '#0284c7' }, addItems)}
        ${actionSection('Should remove or change', 'Elements to remove or change.', '➖', { border: '#ddd6fe', bg: '#f5f3ff', accent: '#7c3aed' }, plan.shouldRemove)}
        ${actionSection('Needs improvement', 'Optimize these areas.', '⚡', { border: '#fde68a', bg: '#fffbeb', accent: '#d97706' }, plan.needsImprovement)}
        ${actionSection('Working well', 'Keep maintaining these.', '✓', { border: '#a7f3d0', bg: '#ecfdf5', accent: '#059669' }, plan.workingWell)}
        <h3 class="subsection-title">Full checklist</h3>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Category</th><th>Check</th><th>Status</th><th>Score</th><th>Finding</th><th>Action</th>
              </tr>
            </thead>
            <tbody>${checkRows}</tbody>
          </table>
        </div>
      </section>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>SEO Audit Report — ${esc(audit.domain)} | ${esc(brandName)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
  <style>
    :root {
      --brand-cyan: #22d3ee;
      --brand-violet: #8b5cf6;
      --brand-pink: #ec4899;
      --brand-emerald: #34d399;
      --ink: #0f172a;
      --ink-muted: #64748b;
      --ink-light: #94a3b8;
      --surface: #ffffff;
      --surface-soft: #f8fafc;
      --border: #e2e8f0;
      --shadow: 0 4px 24px rgba(15, 23, 42, 0.08);
      --shadow-lg: 0 12px 48px rgba(15, 23, 42, 0.12);
    }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
      color: var(--ink);
      background: #f1f5f9;
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
    }
    .page { max-width: 920px; margin: 0 auto; background: var(--surface); box-shadow: var(--shadow-lg); }

    /* Cover */
    .cover {
      background: linear-gradient(135deg, #0a0f1c 0%, #111827 40%, #1a2236 100%);
      color: #fff;
      padding: 48px 56px 56px;
      position: relative;
      overflow: hidden;
    }
    .cover::before {
      content: '';
      position: absolute;
      inset: 0;
      background:
        radial-gradient(ellipse 60% 80% at 10% 20%, rgba(34,211,238,0.18) 0%, transparent 55%),
        radial-gradient(ellipse 50% 60% at 90% 10%, rgba(139,92,246,0.2) 0%, transparent 50%),
        radial-gradient(ellipse 40% 50% at 70% 90%, rgba(236,72,153,0.1) 0%, transparent 45%);
      pointer-events: none;
    }
    .cover-inner { position: relative; z-index: 1; }
    .brand-row { display: flex; align-items: center; gap: 14px; margin-bottom: 40px; }
    .brand-name { font-size: 1.5rem; font-weight: 800; letter-spacing: -0.02em; }
    .brand-tagline { font-size: 0.75rem; color: #94a3b8; font-weight: 500; margin-top: 2px; }
    .report-type {
      display: inline-block;
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--brand-cyan);
      background: rgba(34,211,238,0.12);
      border: 1px solid rgba(34,211,238,0.25);
      padding: 6px 14px;
      border-radius: 99px;
      margin-bottom: 20px;
    }
    .cover h1 {
      font-size: 2rem;
      font-weight: 800;
      letter-spacing: -0.03em;
      line-height: 1.2;
      margin-bottom: 8px;
      word-break: break-all;
    }
    .cover-url { font-size: 0.95rem; color: #94a3b8; margin-bottom: 28px; }
    .cover-meta { display: flex; flex-wrap: wrap; gap: 24px; font-size: 0.85rem; color: #cbd5e1; }
    .cover-meta strong { color: #fff; display: block; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; margin-bottom: 2px; }
    .confidential {
      margin-top: 32px;
      padding-top: 20px;
      border-top: 1px solid rgba(255,255,255,0.08);
      font-size: 0.75rem;
      color: #64748b;
    }

    /* Body */
    .body { padding: 48px 56px 56px; }

    /* Score hero */
    .score-hero {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 40px;
      align-items: center;
      padding: 32px;
      background: linear-gradient(135deg, ${accent.light} 0%, #fff 60%);
      border: 1px solid var(--border);
      border-radius: 16px;
      margin-bottom: 32px;
    }
    .score-ring-wrap { position: relative; width: 180px; height: 180px; flex-shrink: 0; }
    .score-ring-wrap svg { width: 100%; height: 100%; transform: rotate(-90deg); }
    .score-center {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    .score-pct { font-size: 2.5rem; font-weight: 800; color: ${accent.main}; line-height: 1; letter-spacing: -0.03em; }
    .score-grade {
      margin-top: 4px;
      font-size: 0.85rem;
      font-weight: 700;
      color: var(--ink-muted);
      background: #fff;
      border: 1px solid var(--border);
      padding: 2px 12px;
      border-radius: 99px;
    }
    .exec-title { font-size: 1.1rem; font-weight: 700; margin-bottom: 8px; color: var(--ink); }
    .exec-summary { font-size: 0.95rem; color: var(--ink-muted); line-height: 1.7; }
    .result-pills { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 20px; }
    .result-pill {
      display: flex; align-items: center; gap: 8px;
      padding: 8px 16px; border-radius: 10px; font-size: 0.85rem; font-weight: 600;
      border: 1px solid var(--border); background: #fff;
    }
    .result-pill .dot { width: 8px; height: 8px; border-radius: 50%; }
    .dot-pass { background: #34d399; }
    .dot-warn { background: #fbbf24; }
    .dot-fail { background: #f87171; }

    /* Metrics */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 14px;
      margin-bottom: 36px;
    }
    .metric-card {
      background: var(--surface-soft);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 16px 18px;
    }
    .metric-label { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--ink-light); margin-bottom: 4px; }
    .metric-value { font-size: 1.15rem; font-weight: 700; color: var(--ink); }
    .metric-value.yes { color: #059669; }
    .metric-value.no { color: #dc2626; }

    /* Sections */
    .content-section { margin-bottom: 40px; page-break-inside: avoid; }
    .section-title {
      font-size: 1.15rem;
      font-weight: 800;
      letter-spacing: -0.02em;
      margin-bottom: 6px;
      padding-bottom: 12px;
      border-bottom: 2px solid transparent;
      border-image: linear-gradient(90deg, var(--brand-cyan), var(--brand-violet)) 1;
    }
    .section-desc { font-size: 0.85rem; color: var(--ink-muted); margin-bottom: 20px; }

    /* Category bars */
    .cat-row { margin-bottom: 16px; }
    .cat-meta { display: flex; justify-content: space-between; margin-bottom: 6px; }
    .cat-name { font-size: 0.9rem; font-weight: 600; }
    .cat-score { font-size: 0.9rem; font-weight: 700; }
    .cat-track { height: 8px; background: #e2e8f0; border-radius: 99px; overflow: hidden; }
    .cat-fill { height: 100%; border-radius: 99px; transition: width 0.3s; }
    .cat-pts { font-size: 0.75rem; color: var(--ink-light); margin-top: 4px; display: block; }

    /* Action plan */
    .plan-section {
      margin-bottom: 32px;
      border: 1px solid var(--section-border);
      border-radius: 16px;
      overflow: hidden;
      page-break-inside: avoid;
    }
    .plan-header {
      display: flex;
      align-items: flex-start;
      gap: 14px;
      padding: 20px 24px;
      background: var(--section-bg);
      border-bottom: 1px solid var(--section-border);
    }
    .plan-icon {
      width: 40px; height: 40px; border-radius: 10px;
      background: #fff;
      border: 1px solid var(--section-border);
      display: flex; align-items: center; justify-content: center;
      font-size: 1.1rem; flex-shrink: 0;
    }
    .plan-title { font-size: 1rem; font-weight: 800; color: var(--section-accent); }
    .plan-count { color: var(--ink-light); font-weight: 600; }
    .plan-sub { font-size: 0.8rem; color: var(--ink-muted); margin-top: 2px; }
    .action-grid { padding: 16px 20px 20px; display: flex; flex-direction: column; gap: 14px; }
    .action-card {
      background: #fff;
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 18px 20px;
      border-left: 4px solid var(--section-accent);
    }
    .action-card-top { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 10px; }
    .action-title { font-size: 0.95rem; font-weight: 700; margin-bottom: 12px; }
    .action-block { margin-bottom: 10px; }
    .action-block:last-child { margin-bottom: 0; }
    .action-label { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--ink-light); margin-bottom: 3px; }
    .action-text { font-size: 0.88rem; color: var(--ink-muted); line-height: 1.55; }
    .action-do { background: var(--surface-soft); margin: 0 -20px -18px; padding: 12px 20px 16px; border-radius: 0 0 12px 12px; border-top: 1px solid var(--border); }
    .action-do .action-label { color: var(--section-accent); }
    .action-do .action-text { color: var(--ink); font-weight: 500; }

    /* Pills */
    .status-pill, .pri-pill, .cat-pill, .cat-tag {
      display: inline-block;
      font-size: 0.65rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      padding: 3px 10px;
      border-radius: 99px;
    }
    .status-pass { background: #d1fae5; color: #047857; }
    .status-warn { background: #fef3c7; color: #b45309; }
    .status-fail { background: #fee2e2; color: #b91c1c; }
    .pri-critical { background: #fee2e2; color: #991b1b; }
    .pri-high { background: #ffedd5; color: #c2410c; }
    .pri-medium { background: #e0f2fe; color: #0369a1; }
    .pri-low { background: #f1f5f9; color: #475569; }
    .cat-pill, .cat-tag { background: #f1f5f9; color: #475569; font-weight: 600; }

    /* Recommendations */
    .rec-list { list-style: none; }
    .rec-list li {
      position: relative;
      padding: 12px 16px 12px 36px;
      margin-bottom: 8px;
      background: var(--surface-soft);
      border-radius: 10px;
      font-size: 0.9rem;
      color: var(--ink-muted);
      border: 1px solid var(--border);
    }
    .rec-list li::before {
      content: '→';
      position: absolute;
      left: 14px;
      color: var(--brand-violet);
      font-weight: 700;
    }

    /* Table */
    .table-wrap { overflow-x: auto; border: 1px solid var(--border); border-radius: 12px; }
    table { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
    thead { background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%); }
    th {
      text-align: left;
      padding: 12px 14px;
      font-size: 0.68rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--ink-light);
      border-bottom: 2px solid var(--border);
    }
    td { padding: 12px 14px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
    tr:last-child td { border-bottom: none; }
    tr:nth-child(even) td { background: #fafbfc; }
    .check-name { font-weight: 600; color: var(--ink); min-width: 140px; }
    .num { font-weight: 700; white-space: nowrap; }
    .dim { color: var(--ink-light); font-weight: 500; }
    .detail-cell { color: var(--ink-muted); max-width: 200px; }
    .action-cell { color: var(--ink); font-weight: 500; max-width: 200px; }

    .report-scores { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-bottom: 32px; }
    .report-score-card { background: var(--surface-soft); border: 2px solid var(--border); border-radius: 12px; padding: 16px; text-align: center; }
    .report-score-label { display: block; font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--ink-light); margin-bottom: 6px; }
    .report-score-val { display: block; font-size: 1.75rem; font-weight: 800; line-height: 1; }
    .report-score-grade { display: block; font-size: 0.75rem; color: var(--ink-muted); margin-top: 4px; }
    .report-block { border-top: 3px solid var(--border); padding-top: 36px; page-break-before: auto; }
    .report-block-head { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px; margin-bottom: 8px; }
    .report-block-score { font-size: 1rem; font-weight: 800; }
    .subsection-title { font-size: 0.95rem; font-weight: 700; margin: 24px 0 12px; color: var(--ink); }
    .audience-badge { display: inline-block; margin-left: 8px; font-size: 0.65rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--brand-cyan); background: rgba(34,211,238,0.15); border: 1px solid rgba(34,211,238,0.3); padding: 4px 10px; border-radius: 99px; vertical-align: middle; }

    /* Footer */
    .footer {
      margin-top: 48px;
      padding: 28px 56px;
      background: linear-gradient(135deg, #0a0f1c 0%, #111827 100%);
      color: #94a3b8;
      font-size: 0.8rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
    }
    .footer-brand { display: flex; align-items: center; gap: 10px; }
    .footer-brand strong { color: #fff; font-size: 0.95rem; }
    .footer-right { text-align: right; font-size: 0.75rem; }

    @media print {
      body { background: #fff; }
      .page { box-shadow: none; max-width: 100%; }
      .cover, .footer { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .plan-section, .content-section, .score-hero { page-break-inside: avoid; }
      .body { padding: 32px 40px; }
    }
    @media (max-width: 640px) {
      .cover, .body { padding: 28px 24px; }
      .score-hero { grid-template-columns: 1fr; text-align: center; }
      .score-ring-wrap { margin: 0 auto; }
      .metrics-grid { grid-template-columns: repeat(2, 1fr); }
      .footer { padding: 24px; flex-direction: column; text-align: center; }
      .footer-right { text-align: center; }
    }
  </style>
</head>
<body>
  <div class="page">
    <header class="cover">
      <div class="cover-inner">
        <div class="brand-row">
          ${LAGNAA_LOGO_SVG}
          <div>
            <div class="brand-name">${esc(brandName)}</div>
            <div class="brand-tagline">${esc(brandTagline)}</div>
          </div>
        </div>
        <div class="report-type">${audienceLabel(audience)} Marketing Audit · ${reports.map((r) => r.kind.toUpperCase()).join(' + ')}</div>
        <h1>${esc(audit.domain)}</h1>
        <p class="cover-url">${esc(audit.finalUrl)}</p>
        <div class="cover-meta">
          <div><strong>Audience</strong>${audienceLabel(audience)} (${audience === 'b2b' ? 'SEO · GEO · LLMO' : 'SEO · AEO · GEO'})</div>
          <div><strong>Report date</strong>${esc(date)}</div>
          <div><strong>Report ID</strong>${reportId}</div>
          <div><strong>Checks run</strong>${counts.total}</div>
          <div><strong>Overall score</strong>${audit.score}% (${esc(audit.grade)})</div>
        </div>
        <p class="confidential">Confidential — prepared for client review. © ${esc(brandName)}${showPoweredBy ? ' · Powered by DataCrew' : ''}${wlContact}</p>
      </div>
    </header>

    <main class="body">
      <div class="score-hero">
        <div class="score-ring-wrap">
          <svg viewBox="0 0 180 180">
            <circle cx="90" cy="90" r="${ringRadius}" fill="none" stroke="#e2e8f0" stroke-width="12"/>
            <circle cx="90" cy="90" r="${ringRadius}" fill="none" stroke="${accent.ring}" stroke-width="12"
              stroke-linecap="round" stroke-dasharray="${ringCirc}" stroke-dashoffset="${ringOffset}"/>
          </svg>
          <div class="score-center">
            <span class="score-pct">${audit.score}%</span>
            <span class="score-grade">Grade ${esc(audit.grade)}</span>
          </div>
        </div>
        <div>
          <p class="exec-title">Executive summary</p>
          <p class="exec-summary">${esc(audit.summary)}</p>
          <div class="result-pills">
            <div class="result-pill"><span class="dot dot-pass"></span>${counts.pass} Passed</div>
            <div class="result-pill"><span class="dot dot-warn"></span>${counts.warn} Warnings</div>
            <div class="result-pill"><span class="dot dot-fail"></span>${counts.fail} Failed</div>
          </div>
        </div>
      </div>

      <div class="report-scores">${reportScoreCards}</div>

      <section class="content-section">
        <h2 class="section-title">Site metrics</h2>
        <p class="section-desc">Technical snapshot captured at audit time.</p>
        <div class="metrics-grid">
          <div class="metric-card"><div class="metric-label">Response time</div><div class="metric-value">${audit.metrics.responseTimeMs} ms</div></div>
          <div class="metric-card"><div class="metric-label">Page size</div><div class="metric-value">${audit.metrics.pageSizeKb} KB</div></div>
          <div class="metric-card"><div class="metric-label">Word count</div><div class="metric-value">${audit.metrics.wordCount.toLocaleString()}</div></div>
          <div class="metric-card"><div class="metric-label">HTTPS</div><div class="metric-value ${audit.metrics.hasHttps ? 'yes' : 'no'}">${audit.metrics.hasHttps ? 'Secure' : 'Not secure'}</div></div>
          <div class="metric-card"><div class="metric-label">XML sitemap</div><div class="metric-value ${audit.metrics.hasSitemap ? 'yes' : 'no'}">${audit.metrics.hasSitemap ? 'Found' : 'Missing'}</div></div>
          <div class="metric-card"><div class="metric-label">robots.txt</div><div class="metric-value ${audit.metrics.hasRobotsTxt ? 'yes' : 'no'}">${audit.metrics.hasRobotsTxt ? 'Found' : 'Missing'}</div></div>
          <div class="metric-card"><div class="metric-label">Images</div><div class="metric-value">${audit.metrics.imageCount} <span class="dim" style="font-size:0.8rem">(${audit.metrics.imagesMissingAlt} missing alt)</span></div></div>
          <div class="metric-card"><div class="metric-label">Internal links</div><div class="metric-value">${audit.metrics.internalLinks}</div></div>
          <div class="metric-card"><div class="metric-label">External links</div><div class="metric-value">${audit.metrics.externalLinks}</div></div>
        </div>
      </section>

      <section class="content-section">
        <h2 class="section-title">Report breakdown</h2>
        <p class="section-desc">Detailed scores, action plans, and checklists for each marketing report in this ${audienceLabel(audience)} audit.</p>
      </section>

      ${reportSections}
    </main>

    <footer class="footer">
      <div class="footer-brand">
        ${LAGNAA_LOGO_SVG.replace('width="48" height="48"', 'width="32" height="32"')}
        <div>
          <strong>${esc(brandName)}</strong><br/>
          ${esc(brandTagline)}
        </div>
      </div>
      <div class="footer-right">
        Report ${reportId} · ${esc(date)}<br/>
        ${showPoweredBy ? 'Powered by DataCrew · lagnaa.app' : wl.website ? esc(wl.website) : ''}
      </div>
    </footer>
  </div>
</body>
</html>`;
}