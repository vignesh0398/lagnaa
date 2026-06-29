import type { SeoAuditResult } from './seoAuditor.js';
import { exportAuditHtml } from './seoReportExport.js';
import { closePuppeteerBrowser, getPuppeteerBrowser } from '../utils/puppeteerBrowser.js';

export async function exportHtmlToPdf(html: string): Promise<Buffer> {
  const browser = await getPuppeteerBrowser();
  const page = await browser.newPage();

  try {
    await page.setContent(html, { waitUntil: 'load', timeout: 45000 });
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: false,
      margin: { top: '12mm', right: '10mm', bottom: '14mm', left: '10mm' },
    });
    return Buffer.from(pdf);
  } finally {
    await page.close();
  }
}

export async function exportAuditPdf(audit: SeoAuditResult): Promise<Buffer> {
  return exportHtmlToPdf(exportAuditHtml(audit));
}

export async function closePdfBrowser(): Promise<void> {
  await closePuppeteerBrowser();
}