import { Router } from 'express';
import { runMarketingAudit } from '../seo/marketingAuditor.js';
import type { AudienceType } from '../seo/auditShared.js';
import { exportAuditPdf } from '../seo/seoReportPdf.js';
import { exportAuditCsv, exportAuditHtml, exportAuditJson } from '../seo/seoReportExport.js';
import { deleteAudit, getAuditById, listAudits, saveAudit } from '../seo/seoStore.js';

const router = Router();

router.get('/history', (_req, res) => {
  const audits = listAudits().map((a) => ({
    id: a.id,
    url: a.url,
    finalUrl: a.finalUrl,
    domain: a.domain,
    audienceType: a.audienceType ?? 'b2c',
    score: a.score,
    grade: a.grade,
    auditedAt: a.auditedAt,
    counts: a.counts ?? { pass: 0, warn: 0, fail: 0, total: 0 },
    failCount: a.counts?.fail ?? 0,
    warnCount: a.counts?.warn ?? 0,
    reportScores: a.reports?.map((r) => ({ kind: r.kind, label: r.label, score: r.score, grade: r.grade })) ?? [],
  }));
  res.json({ audits, total: audits.length });
});

router.get('/:id/export', async (req, res) => {
  const audit = getAuditById(req.params.id);
  if (!audit) return res.status(404).json({ error: 'Audit not found' });

  const format = (req.query.format as string) || 'html';
  const audience = audit.audienceType ?? 'b2c';
  const safeName = audit.domain.replace(/https?:\/\//, '').replace(/[^\w.-]/g, '_');
  const date = audit.auditedAt.slice(0, 10);
  const baseName = `lagnaa-${audience}-report-${safeName}-${date}`;

  if (format === 'json') {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${baseName}.json"`);
    return res.send(exportAuditJson(audit));
  }

  if (format === 'csv') {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${baseName}.csv"`);
    return res.send(exportAuditCsv(audit));
  }

  if (format === 'pdf') {
    try {
      const pdf = await exportAuditPdf(audit);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${baseName}.pdf"`);
      return res.send(pdf);
    } catch (error) {
      console.error('PDF export failed:', error);
      return res.status(500).json({
        error: error instanceof Error ? error.message : 'PDF generation failed',
      });
    }
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${baseName}.html"`);
  res.send(exportAuditHtml(audit));
});

router.get('/:id', (req, res) => {
  const audit = getAuditById(req.params.id);
  if (!audit) return res.status(404).json({ error: 'Audit not found' });
  res.json(audit);
});

router.delete('/:id', (req, res) => {
  if (!deleteAudit(req.params.id)) {
    return res.status(404).json({ error: 'Audit not found' });
  }
  res.json({ success: true });
});

router.post('/audit', async (req, res) => {
  const { url, audienceType } = req.body as { url?: string; audienceType?: AudienceType };
  if (!url?.trim()) {
    return res.status(400).json({ error: 'Website URL is required.' });
  }

  const audience: AudienceType = audienceType === 'b2b' ? 'b2b' : 'b2c';

  try {
    const result = await runMarketingAudit(url.trim(), audience);
    saveAudit(result);
    res.json({ success: true, audit: result });
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : 'SEO audit failed',
    });
  }
});

export default router;