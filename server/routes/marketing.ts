import { Router } from 'express';
import { createAuditJob, runAuditJob } from '../auditJobs.js';
import { runCompetitorCompare } from '../marketing/competitorAuditor.js';
import { runLocalSeoAudit } from '../marketing/localSeoAuditor.js';
import { deleteMarketingResult, getMarketingById, listMarketingResults, saveMarketingResult } from '../marketing/marketingStore.js';
import { exportMarketingCsv, exportMarketingHtml } from '../marketing/marketingReportExport.js';
import { runRoadmapGenerate } from '../marketing/roadmapAuditor.js';
import { runSocialPreviewAudit } from '../marketing/socialAuditor.js';
import { getWhiteLabelConfig, saveWhiteLabelConfig } from '../marketing/whiteLabelStore.js';
import type { AudienceType } from '../seo/auditShared.js';
import { exportHtmlToPdf } from '../seo/seoReportPdf.js';
import { listAudits } from '../seo/seoStore.js';

const router = Router();

router.get('/white-label', (_req, res) => {
  res.json(getWhiteLabelConfig());
});

router.put('/white-label', (req, res) => {
  const config = saveWhiteLabelConfig(req.body);
  res.json({ success: true, config });
});

router.get('/seo-audits', (_req, res) => {
  const audits = listAudits().slice(0, 20).map((a) => ({
    id: a.id,
    url: a.finalUrl,
    score: a.score,
    grade: a.grade,
    audienceType: a.audienceType ?? 'b2c',
    auditedAt: a.auditedAt,
  }));
  res.json({ audits });
});

router.get('/history', (req, res) => {
  const type = req.query.type as string | undefined;
  const items = listMarketingResults(type as 'competitor' | 'social' | 'local' | 'roadmap' | undefined);
  res.json({
    items: items.map((i) => ({
      id: i.id,
      type: i.type,
      url: i.url,
      finalUrl: i.finalUrl,
      score: i.score,
      grade: i.grade,
      auditedAt: i.auditedAt,
      summary: i.summary,
    })),
    total: items.length,
  });
});

router.post('/competitors/audit', (req, res) => {
  const { url, competitors } = req.body as { url?: string; competitors?: string[] };
  if (!url?.trim()) return res.status(400).json({ error: 'Your website URL is required.' });
  const jobId = createAuditJob();
  res.status(202).json({ success: true, jobId, status: 'pending' });
  runAuditJob(jobId, () => runCompetitorCompare(url.trim(), competitors ?? []), saveMarketingResult);
});

router.post('/social/audit', (req, res) => {
  const { url } = req.body as { url?: string };
  if (!url?.trim()) return res.status(400).json({ error: 'URL is required.' });
  const jobId = createAuditJob();
  res.status(202).json({ success: true, jobId, status: 'pending' });
  runAuditJob(jobId, () => runSocialPreviewAudit(url.trim()), saveMarketingResult);
});

router.post('/local/audit', (req, res) => {
  const { url, businessName, city } = req.body as { url?: string; businessName?: string; city?: string };
  if (!url?.trim()) return res.status(400).json({ error: 'URL is required.' });
  const jobId = createAuditJob();
  res.status(202).json({ success: true, jobId, status: 'pending' });
  runAuditJob(jobId, () => runLocalSeoAudit(url.trim(), businessName, city), saveMarketingResult);
});

router.post('/roadmap/generate', (req, res) => {
  const { auditId, url, audienceType } = req.body as {
    auditId?: string;
    url?: string;
    audienceType?: AudienceType;
  };
  const jobId = createAuditJob();
  res.status(202).json({ success: true, jobId, status: 'pending' });
  runAuditJob(jobId, () => runRoadmapGenerate({ auditId, url, audienceType }), saveMarketingResult);
});

router.get('/:id/export', async (req, res) => {
  const item = getMarketingById(req.params.id);
  if (!item) return res.status(404).json({ error: 'Not found' });

  const format = (req.query.format as string) || 'html';
  const safeName = item.domain.replace(/https?:\/\//, '').replace(/[^\w.-]/g, '_');
  const date = item.auditedAt.slice(0, 10);
  const baseName = `lagnaa-${item.type}-${safeName}-${date}`;

  if (format === 'csv') {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${baseName}.csv"`);
    return res.send(exportMarketingCsv(item));
  }

  if (format === 'pdf') {
    try {
      const pdf = await exportHtmlToPdf(exportMarketingHtml(item));
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${baseName}.pdf"`);
      return res.send(pdf);
    } catch (error) {
      return res.status(500).json({ error: error instanceof Error ? error.message : 'PDF failed' });
    }
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${baseName}.html"`);
  res.send(exportMarketingHtml(item));
});

router.get('/:id', (req, res) => {
  const item = getMarketingById(req.params.id);
  if (!item) return res.status(404).json({ error: 'Not found' });
  res.json(item);
});

router.delete('/:id', (req, res) => {
  if (!deleteMarketingResult(req.params.id)) return res.status(404).json({ error: 'Not found' });
  res.json({ success: true });
});

export default router;