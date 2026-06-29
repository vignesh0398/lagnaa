import type { Browser } from 'puppeteer-core';

let browserPromise: Promise<Browser> | null = null;

const LAUNCH_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-gpu',
  '--font-render-hinting=none',
];

export async function getPuppeteerBrowser(): Promise<Browser> {
  if (!browserPromise) {
    const isProduction = process.env.NODE_ENV === 'production' || Boolean(process.env.RENDER);

    if (isProduction) {
      const puppeteer = await import('puppeteer-core');
      const chromium = await import('@sparticuz/chromium');
      chromium.default.setGraphicsMode = false;

      browserPromise = puppeteer.default.launch({
        args: [...chromium.default.args, ...LAUNCH_ARGS],
        defaultViewport: chromium.default.defaultViewport,
        executablePath: await chromium.default.executablePath(),
        headless: true,
      });
    } else {
      const puppeteer = await import('puppeteer');
      browserPromise = puppeteer.default.launch({
        headless: true,
        args: LAUNCH_ARGS,
      });
    }
  }

  return browserPromise;
}

export async function closePuppeteerBrowser(): Promise<void> {
  if (!browserPromise) return;
  const browser = await browserPromise;
  browserPromise = null;
  await browser.close();
}