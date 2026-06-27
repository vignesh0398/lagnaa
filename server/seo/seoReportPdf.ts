import puppeteer, { type Browser } from 'puppeteer';
import type { SeoAuditResult } from './seoAuditor.js';
import { exportAuditHtml } from './seoReportExport.js';

let browserPromise: Promise<Browser> | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--font-render-hinting=none'],
    });
  }
  return browserPromise;
}

export async function exportHtmlToPdf(html: string): Promise<Buffer> {
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 45000 });
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
  if (browserPromise) {
    const browser = await browserPromise;
    browserPromise = null;
    await browser.close();
  }
}