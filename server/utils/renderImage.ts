import { getPuppeteerBrowser } from './puppeteerBrowser.js';

export async function renderHtmlToPng(html: string, width: number, height: number): Promise<Buffer> {
  const browser = await getPuppeteerBrowser();
  const page = await browser.newPage();
  try {
    await page.setViewport({ width, height, deviceScaleFactor: 1 });
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 45000 });
    await page.evaluateHandle(() => document.fonts.ready);
    const png = await page.screenshot({ type: 'png', fullPage: false });
    return Buffer.from(png);
  } finally {
    await page.close();
  }
}